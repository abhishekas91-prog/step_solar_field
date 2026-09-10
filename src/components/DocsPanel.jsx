import { useState } from 'react';
import { api } from '../lib/api';
import { canInvoice, invoiceOutstanding } from '../lib/pipeline';
import {
  fieldLeadForDocs,
  inr,
  invoiceRecord,
  printRecord,
  receiptRecord,
} from '../lib/documents';
import { sendDocWhatsApp } from '../lib/pdf';
import QuoteEditor from './QuoteEditor';

const TABS = [
  { id: 'invoice', label: 'Invoice' },
  { id: 'quotation', label: 'Quotation' },
  { id: 'receipt', label: 'Receipt' },
  { id: 'commercial', label: 'Commercial' },
];

const PAY_MODES = ['Online', 'UPI', 'NEFT', 'RTGS', 'Bank Transfer', 'Cheque', 'Cash'];

export default function DocsPanel({ lead, user, onSaved }) {
  const q = lead?.quotation;
  const inv = lead?.invoice;
  const defaultTab = inv ? 'invoice' : (q?.kind === 'commercial' ? 'commercial' : 'quotation');
  const [tab, setTab] = useState(defaultTab);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [pay, setPay] = useState({ amount: '', mode: 'Online', reference: '', note: '' });
  const [invPayMode, setInvPayMode] = useState(inv?.payMode || q?.payMode || 'Online');
  const [invSupplyType, setInvSupplyType] = useState(inv?.supplyType || q?.supplyType || 'igst');
  const invoiceOk = canInvoice(user?.role);

  function flash(msg, isErr) {
    setError(isErr ? msg : '');
    setOk(isErr ? '' : msg);
  }

  function invoiceRec() {
    const mapped = fieldLeadForDocs(lead);
    return invoiceRecord({
      ...mapped,
      invoice: { ...(inv || {}), payMode: invPayMode, supplyType: invSupplyType },
      quotation: { ...(q || {}), payMode: invPayMode, supplyType: invSupplyType },
    });
  }

  function openPdf(rec, docType) {
    printRecord(rec, {
      lead,
      docType,
      onStatus: (msg, isErr) => {
        if (msg) flash(msg, isErr);
      },
    });
  }

  function downloadInvoice() {
    openPdf(invoiceRec(), 'invoice');
  }

  function downloadReceipt(payment) {
    openPdf(receiptRecord(fieldLeadForDocs(lead), payment), 'receipt');
  }

  async function sendWa(docType, rec) {
    flash('WhatsApp se bhej rahe hain…');
    try {
      const out = await sendDocWhatsApp(lead, { docType, docNo: rec?.docNo });
      if (out?.ok === false && out?.error === 'whatsapp_disabled') {
        flash('WhatsApp Business API CRM mein configure nahi hai', true);
        return;
      }
      if (out?.ok === false) {
        flash(out?.error || 'WhatsApp send fail', true);
        return;
      }
      flash('WhatsApp Business API se bhej diya');
    } catch (e) {
      flash(e.message || 'WhatsApp send fail', true);
    }
  }

  async function generateInvoice() {
    if (!invoiceOk) {
      flash('Invoice Accounts, Sales ya Admin bana sakte hain', true);
      return;
    }
    setBusy(true);
    flash('');
    try {
      const updated = await api.createInvoice(lead.id);
      flash('Invoice generate ho gayi');
      onSaved?.(updated);
      setTab('invoice');
    } catch (e) {
      flash(e.message, true);
    } finally {
      setBusy(false);
    }
  }

  async function recordPayment() {
    const amount = Number(pay.amount);
    if (!amount || amount <= 0) {
      flash('Valid amount daalein', true);
      return;
    }
    if (!invoiceOk) {
      flash('Payment Accounts, Sales ya Admin record kar sakte hain', true);
      return;
    }
    setBusy(true);
    flash('');
    try {
      const updated = await api.addPayment(lead.id, {
        amount,
        mode: pay.mode,
        reference: pay.reference || null,
        note: pay.note || null,
      });
      flash('Payment record ho gayi');
      setPay({ amount: '', mode: 'Online', reference: '', note: '' });
      onSaved?.(updated);
      setTab('receipt');
    } catch (e) {
      flash(e.message, true);
    } finally {
      setBusy(false);
    }
  }

  const outstanding = invoiceOutstanding(inv);
  const payments = inv?.payments || [];

  return (
    <div className="docs-panel">
      <div className="doc-switcher">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'active' : ''}
            onClick={() => { setTab(t.id); setError(''); setOk(''); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="err">{error}</div>}
      {ok && <div className="ok">{ok}</div>}

      {tab === 'quotation' && (
        <QuoteEditor
          lead={lead}
          user={user}
          fixedKind="quotation"
          onSaved={onSaved}
        />
      )}

      {tab === 'commercial' && (
        <QuoteEditor
          lead={lead}
          user={user}
          fixedKind="commercial"
          onSaved={onSaved}
        />
      )}

      {tab === 'invoice' && (
        <div className="quote-box">
          <div className="quote-editor" style={{ marginBottom: 10 }}>
            <div className="quote-row2">
              <div className="field">
                <label>Payment Mode</label>
                <select value={invPayMode} onChange={(e) => setInvPayMode(e.target.value)}>
                  <option>Online</option>
                  <option>Cash</option>
                  <option>Cheque</option>
                  <option>Bank Transfer</option>
                </select>
              </div>
              <div className="field">
                <label>GST Type (Supply)</label>
                <select value={invSupplyType} onChange={(e) => setInvSupplyType(e.target.value)}>
                  <option value="igst">IGST — Inter-State</option>
                  <option value="cgst_sgst">CGST + SGST — Intra-State (U.P.)</option>
                </select>
              </div>
            </div>
          </div>
          {!inv && (
            <div className="quote-summary">
              <strong>No invoice yet</strong>
              <p>
                {q
                  ? (q.status === 'Approved'
                    ? 'Approved quotation se invoice generate karein.'
                    : `Pehle quotation Approve karein (abhi ${q.status || 'Draft'}).`)
                  : 'Pehle quotation banao, Approve karo, phir invoice.'}
              </p>
              {invoiceOk && q && (
                <div className="quote-actions">
                  <button
                    type="button"
                    className="mini primary"
                    disabled={busy || (q.status !== 'Approved' && user?.role !== 'Admin')}
                    onClick={generateInvoice}
                  >
                    {busy ? 'Generating…' : 'Generate Invoice'}
                  </button>
                </div>
              )}
              {!invoiceOk && <p className="lock-hint">Invoice Accounts, Sales ya Admin generate kar sakte hain</p>}
            </div>
          )}

          {inv && (
            <div className="quote-summary">
              <div className="row-between">
                <strong>Invoice {inv.number}</strong>
                <span className={`pay-pill ${String(inv.paymentStatus || 'Unpaid').toLowerCase()}`}>
                  {inv.paymentStatus || 'Unpaid'}
                </span>
              </div>
              <p>
                {inr(inv.grandTotal)} · paid {inr(inv.paidAmount || 0)} · due {inr(outstanding)}
              </p>
              <p>Based on quotation rev. {inv.basedOnQuotationRevision || 1}</p>
              {(inv.items || []).slice(0, 4).map((it, i) => (
                <div className="doc-line" key={i}>
                  <span>{it.desc}</span>
                  <em>{inr(it.total || it.amount || 0)}</em>
                </div>
              ))}
              {(inv.items || []).length > 4 && (
                <p>+{(inv.items || []).length - 4} more items</p>
              )}
              <div className="quote-actions">
                <button type="button" className="mini primary" onClick={downloadInvoice}>PDF Download</button>
                <button type="button" className="mini wa" onClick={() => sendWa('invoice', invoiceRec())}>Send by WhatsApp</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'receipt' && (
        <div className="quote-box">
          {!inv && (
            <div className="quote-summary">
              <strong>No invoice yet</strong>
              <p>Receipt invoice ke payment se banti hai. Pehle Invoice tab se generate karein.</p>
            </div>
          )}

          {inv && (
            <>
              <div className="quote-summary">
                <div className="row-between">
                  <strong>Outstanding</strong>
                  <span>{inr(outstanding)}</span>
                </div>
                <p>{inv.number} · {inv.paymentStatus}</p>
              </div>

              {invoiceOk && inv.paymentStatus !== 'Paid' && (
                <div className="quote-editor" style={{ marginTop: 10 }}>
                  <div className="field">
                    <label>Amount (Rs)</label>
                    <input
                      type="number"
                      value={pay.amount}
                      onChange={(e) => setPay({ ...pay, amount: e.target.value })}
                      placeholder={String(outstanding || '')}
                    />
                  </div>
                  <div className="field">
                    <label>Payment Mode</label>
                    <select value={pay.mode} onChange={(e) => setPay({ ...pay, mode: e.target.value })}>
                      {PAY_MODES.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Reference / UTR</label>
                    <input
                      value={pay.reference}
                      onChange={(e) => setPay({ ...pay, reference: e.target.value })}
                      placeholder="UTR / txn id"
                    />
                  </div>
                  <div className="field">
                    <label>Remarks</label>
                    <input
                      value={pay.note}
                      onChange={(e) => setPay({ ...pay, note: e.target.value })}
                      placeholder="Advance / balance / note"
                    />
                  </div>
                  <button type="button" className="mini primary" disabled={busy} onClick={recordPayment}>
                    {busy ? 'Saving…' : 'Record Payment & Receipt'}
                  </button>
                </div>
              )}

              {!invoiceOk && <p className="lock-hint">Payment Accounts, Sales ya Admin record kar sakte hain</p>}

              <div className="field-label">PAYMENT LEDGER</div>
              {payments.length === 0 && (
                <p className="lock-hint">Abhi koi payment nahi</p>
              )}
              {payments.map((p) => (
                <div className="quote-summary pay-row" key={p.id}>
                  <div className="row-between">
                    <strong>{inr(p.amount)} · {p.mode}</strong>
                    <span>{p.receiptNo}</span>
                  </div>
                  <p>{p.reference ? `${p.reference} · ` : ''}{p.received_by || ''}</p>
                  <div className="quote-actions">
                    <button type="button" className="mini primary" onClick={() => downloadReceipt(p)}>
                      PDF Receipt
                    </button>
                    <button
                      type="button"
                      className="mini wa"
                      onClick={() => sendWa('receipt', receiptRecord(fieldLeadForDocs(lead), p))}
                    >
                      Send by WhatsApp
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

    </div>
  );
}
