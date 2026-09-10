import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  COMPANY,
  COMMERCIAL_ITEMS,
  autoFillPrices,
  commercialTotals,
  defaultQuoteItemsForCapacity,
  documentTotals,
  fieldLeadForDocs,
  inr,
  itemPrice,
  printRecord,
  quotationRecord,
} from '../lib/documents';
import { sendDocWhatsApp } from '../lib/pdf';

function blankItem(gst = 5) {
  return { desc: '', hsn: '', qty: 1, unit: 'Nos', price: 0, gst };
}

function canQuote(role) {
  return role === 'Admin' || role === 'Sales' || role === 'Accounts';
}

function quoteKind(q) {
  return q?.kind === 'commercial' ? 'commercial' : 'quotation';
}

export default function QuoteEditor({ lead, user, onSaved, locked, fixedKind }) {
  const mapped = fieldLeadForDocs(lead);
  const q = lead?.quotation;
  const allowed = canQuote(user?.role);
  const activeKind = fixedKind || quoteKind(q);
  const hasThisKind = Boolean(q) && (!fixedKind || quoteKind(q) === fixedKind);
  const [open, setOpen] = useState(!q);
  const [kind, setKind] = useState(activeKind);
  const [items, setItems] = useState([]);
  const [custAddress, setCustAddress] = useState('');
  const [subsidyCentral, setSubsidyCentral] = useState(0);
  const [subsidyState, setSubsidyState] = useState(0);
  const [targetGrand, setTargetGrand] = useState('');
  const [targetCommercial, setTargetCommercial] = useState('');
  const [capacity, setCapacity] = useState('');
  const [technology, setTechnology] = useState('');
  const [spaceRequired, setSpaceRequired] = useState('');
  const [application, setApplication] = useState('');
  const [ratePerWp, setRatePerWp] = useState('');
  const [commercialGst, setCommercialGst] = useState(8.9);
  const [validity, setValidity] = useState(15);
  const [payAdvance, setPayAdvance] = useState(10);
  const [payDispatch, setPayDispatch] = useState(80);
  const [payInstall, setPayInstall] = useState(10);
  const [payMode, setPayMode] = useState('Online');
  const [supplyType, setSupplyType] = useState('igst');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    if (!open) return;
    const nextKind = fixedKind || q?.kind || 'quotation';
    setKind(nextKind);
    const sameKind = quoteKind(q) === nextKind;
    const src = (sameKind && q?.items && q.items.length)
      ? q.items
      : (nextKind === 'commercial' ? COMMERCIAL_ITEMS : defaultQuoteItemsForCapacity(mapped.capacity));
    setItems(src.map((it) => ({
      desc: it.desc || '',
      hsn: it.hsn || '',
      qty: Number(it.qty || 1),
      unit: it.unit || 'Nos',
      price: itemPrice(it),
      gst: it.gst != null ? Number(it.gst) : (Number(q?.gstPercent) || 5),
    })));
    setCustAddress(q?.custAddress || [mapped.address, mapped.city, mapped.state].filter(Boolean).join(', '));
    setSubsidyCentral(Number(q?.subsidyCentral || 0));
    setSubsidyState(Number(q?.subsidyState || 0));
    setCapacity(q?.capacity ?? mapped.capacity ?? '');
    setTechnology(q?.technology || '');
    setSpaceRequired(q?.spaceRequired || '');
    setApplication(q?.application || '');
    setRatePerWp(q?.rate ?? q?.ratePerWp ?? '');
    setCommercialGst(Number(q?.gstPct ?? q?.gstPercent ?? 8.9));
    setValidity(Number(q?.validity || 15));
    setPayAdvance(Number(q?.payAdvance ?? 10));
    setPayDispatch(Number(q?.payDispatch ?? 80));
    setPayInstall(Number(q?.payInstall ?? 10));
    setPayMode(q?.payMode || 'Online');
    setSupplyType(q?.supplyType || 'igst');
    setTargetGrand('');
    setTargetCommercial('');
    setError('');
    setOk('');
  }, [open, lead?.id, fixedKind]);

  const totals = documentTotals(items, { subsidyCentral, subsidyState });
  const cTotals = commercialTotals({ capacity, rate: ratePerWp, gstPct: commercialGst });
  const editorPrices = kind !== 'commercial';
  const displayTotal = kind === 'commercial' ? cTotals.grandTotal : totals.netPayable;

  function setItem(i, k, v) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  }

  function switchKind(next) {
    if (fixedKind) return;
    setKind(next);
    if (!q?.items?.length || quoteKind(q) !== next) {
      setItems((next === 'commercial' ? COMMERCIAL_ITEMS : defaultQuoteItemsForCapacity(mapped.capacity)).map((it) => ({ ...it })));
    }
  }

  async function save() {
    if (!allowed) {
      setError('Quotation Sales, Accounts ya Admin bana sakte hain');
      return;
    }
    setBusy(true);
    setError('');
    setOk('');
    try {
      const payload = {
        kind,
        items: items.filter((it) => it.desc || it.qty),
        custAddress,
        branchAddress: COMPANY.branchAddress,
        branchPhone: COMPANY.branchPhone,
        payMode,
        supplyType,
        template: 'invoice.html',
        status: q?.status || 'Draft',
      };
      if (kind === 'commercial') {
        payload.capacity = Number(capacity) || 0;
        payload.technology = technology;
        payload.spaceRequired = spaceRequired;
        payload.application = application;
        payload.rate = Number(ratePerWp) || 0;
        payload.gstPct = Number(commercialGst) || 0;
        payload.gstPercent = Number(commercialGst) || 0;
        payload.validity = String(validity || 15);
        payload.payAdvance = Number(payAdvance) || 0;
        payload.payDispatch = Number(payDispatch) || 0;
        payload.payInstall = Number(payInstall) || 0;
        payload.subtotal = cTotals.subtotal;
        payload.gstAmount = cTotals.gstAmount;
        payload.grandTotal = cTotals.grandTotal;
        payload.netPayable = cTotals.grandTotal;
      } else {
        payload.gstPercent = 0;
        payload.subtotal = totals.subtotal;
        payload.gstAmount = totals.gstAmount;
        payload.grandTotal = totals.grandTotal;
        payload.subsidyCentral = Number(subsidyCentral) || 0;
        payload.subsidyState = Number(subsidyState) || 0;
        payload.netPayable = totals.netPayable;
      }
      const updated = await api.updateLead(lead.id, { quotation: payload });
      setOk('Quotation save ho gayi');
      setOpen(false);
      onSaved?.(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function quoteRec() {
    return quotationRecord({
      ...mapped,
      quotation: {
        ...(q || {}),
        kind,
        items: items.length ? items : (q?.items || []),
        custAddress,
        subsidyCentral,
        subsidyState,
        capacity,
        technology,
        spaceRequired,
        application,
        rate: ratePerWp,
        gstPct: commercialGst,
        payMode,
        supplyType,
        gstPercent: kind === 'commercial' ? commercialGst : (q?.gstPercent || 0),
        validity,
        payAdvance,
        payDispatch,
        payInstall,
      },
    });
  }

  function downloadPdf() {
    printRecord(quoteRec(), {
      lead,
      docType: kind === 'commercial' ? 'commercial' : 'quotation',
      onStatus: (msg, isErr) => {
        if (!msg) return;
        if (isErr) setError(msg);
        else setOk(msg);
      },
    });
  }

  async function sendWa() {
    setError('');
    setOk('WhatsApp se bhej rahe hain…');
    try {
      const rec = quoteRec();
      const out = await sendDocWhatsApp(lead, {
        docType: kind === 'commercial' ? 'commercial' : 'quotation',
        docNo: rec.docNo,
      });
      if (out?.ok === false && out?.error === 'whatsapp_disabled') {
        setOk('');
        setError('WhatsApp Business API CRM mein configure nahi hai');
        return;
      }
      if (out?.ok === false) {
        setOk('');
        setError(out?.error || 'WhatsApp send fail');
        return;
      }
      setOk('WhatsApp Business API se bhej diya');
    } catch (e) {
      setOk('');
      setError(e.message || 'WhatsApp send fail');
    }
  }

  async function markStatus(status) {
    if (!q) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api.quotationStatus(lead.id, status);
      setOk(`Quotation ${status} mark ho gayi`);
      onSaved?.(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function markSent() {
    return markStatus('Sent');
  }

  if (!lead) return null;

  const title = kind === 'commercial' || fixedKind === 'commercial' ? 'COMMERCIAL QUOTATION' : 'QUOTATION';
  const newLabel = fixedKind === 'commercial' ? 'New Commercial Quotation' : 'New Quotation';

  return (
    <div className="quote-box">
      {!fixedKind && <div className="field-label">{title}</div>}
      {hasThisKind && !open && (
        <div className="quote-summary">
          <div className="row-between">
            <strong>{q.kind === 'commercial' ? 'Commercial' : 'Residential'} · {q.status || 'Draft'}</strong>
            <span>{inr(q.netPayable ?? q.grandTotal)}</span>
          </div>
          <p>{(q.items || []).length} items · rev. {q.revision || 1}</p>
          {error && <div className="err">{error}</div>}
          {ok && <div className="ok">{ok}</div>}
          <div className="quote-actions">
            <button type="button" className="mini primary" onClick={downloadPdf}>PDF Download</button>
            <button type="button" className="mini wa" onClick={sendWa}>Send by WhatsApp</button>
            {allowed && !locked && (
              <button type="button" className="mini" onClick={() => setOpen(true)}>Edit Items</button>
            )}
            {allowed && !locked && q.status !== 'Sent' && q.status !== 'Approved' && (
              <button type="button" className="mini" disabled={busy} onClick={markSent}>Mark Sent</button>
            )}
            {allowed && !locked && q.status !== 'Approved' && (
              <button type="button" className="mini" disabled={busy} onClick={() => markStatus('Approved')}>Approve</button>
            )}
          </div>
        </div>
      )}

      {!hasThisKind && !open && allowed && !locked && (
        <button type="button" className="submit-teal" style={{ marginTop: 0 }} onClick={() => setOpen(true)}>
          {newLabel}
        </button>
      )}

      {!hasThisKind && !open && (!allowed || locked) && (
        <p className="lock-hint">Abhi is type ki quotation nahi hai</p>
      )}

      {open && (
        <div className="quote-editor">
          {!fixedKind && (
            <div className="field">
              <label>Document type</label>
              <select value={kind} onChange={(e) => switchKind(e.target.value)} disabled={!allowed}>
                <option value="quotation">Residential Quotation</option>
                <option value="commercial">Commercial Quotation</option>
              </select>
            </div>
          )}
          <div className="field">
            <label>Customer Address / Place of Supply</label>
            <input value={custAddress} onChange={(e) => setCustAddress(e.target.value)} disabled={!allowed} />
          </div>
          <div className="quote-row2">
            <div className="field">
              <label>Payment Mode</label>
              <select value={payMode} onChange={(e) => setPayMode(e.target.value)} disabled={!allowed}>
                <option>Online</option>
                <option>Cash</option>
                <option>Cheque</option>
                <option>Bank Transfer</option>
              </select>
            </div>
            <div className="field">
              <label>GST Type (Supply)</label>
              <select value={supplyType} onChange={(e) => setSupplyType(e.target.value)} disabled={!allowed}>
                <option value="igst">IGST — Inter-State</option>
                <option value="cgst_sgst">CGST + SGST — Intra-State (U.P.)</option>
              </select>
            </div>
          </div>

          {kind === 'commercial' && (
            <>
              <div className="field"><label>System Capacity (KWp)</label><input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
              <div className="field"><label>Technology</label><input value={technology} onChange={(e) => setTechnology(e.target.value)} /></div>
              <div className="field"><label>Space Required</label><input value={spaceRequired} onChange={(e) => setSpaceRequired(e.target.value)} /></div>
              <div className="field"><label>Application</label><input value={application} onChange={(e) => setApplication(e.target.value)} /></div>
              <div className="field"><label>Rate per Wp (Rs)</label><input type="number" value={ratePerWp} onChange={(e) => setRatePerWp(e.target.value)} /></div>
              <div className="field"><label>GST %</label><input type="number" value={commercialGst} onChange={(e) => setCommercialGst(+e.target.value)} /></div>
              <div className="field"><label>Target Gross Total</label><input type="number" value={targetCommercial} onChange={(e) => setTargetCommercial(e.target.value)} placeholder="Auto-fill Rate/Wp" /></div>
              <button
                type="button"
                className="mini"
                onClick={() => {
                  const target = Number(targetCommercial);
                  const cap = Number(capacity);
                  if (!target || !cap) return;
                  const wp = cap * 1000;
                  const rate = target / (wp * (1 + Number(commercialGst) / 100));
                  setRatePerWp(rate.toFixed(2));
                }}
              >
                Auto-fill Rate/Wp
              </button>
              <div className="field"><label>Validity (days)</label><input type="number" value={validity} onChange={(e) => setValidity(+e.target.value)} /></div>
              <div className="field"><label>Advance %</label><input type="number" value={payAdvance} onChange={(e) => setPayAdvance(+e.target.value)} /></div>
              <div className="field"><label>Before Dispatch %</label><input type="number" value={payDispatch} onChange={(e) => setPayDispatch(+e.target.value)} /></div>
              <div className="field"><label>After Installation %</label><input type="number" value={payInstall} onChange={(e) => setPayInstall(+e.target.value)} /></div>
            </>
          )}

          {items.map((it, i) => (
            <div className="quote-item" key={i}>
              <div className="row-between">
                <strong>Item {i + 1}</strong>
                <button type="button" className="linkish" style={{ margin: 0 }} onClick={() => setItems((a) => a.filter((_, x) => x !== i))}>Remove</button>
              </div>
              <input placeholder="Description" value={it.desc} onChange={(e) => setItem(i, 'desc', e.target.value)} />
              <input placeholder="Brand / Spec" value={it.hsn} onChange={(e) => setItem(i, 'hsn', e.target.value)} />
              <div className="quote-row3">
                <input type="number" placeholder="Qty" value={it.qty} onChange={(e) => setItem(i, 'qty', +e.target.value)} />
                <input placeholder="Unit" value={it.unit} onChange={(e) => setItem(i, 'unit', e.target.value)} />
                {editorPrices && (
                  <input type="number" placeholder="Price" value={it.price} onChange={(e) => setItem(i, 'price', +e.target.value)} />
                )}
              </div>
              {editorPrices && (
                <input type="number" placeholder="GST %" value={it.gst} onChange={(e) => setItem(i, 'gst', +e.target.value)} />
              )}
            </div>
          ))}

          <button type="button" className="mini" onClick={() => setItems((a) => [...a, blankItem(kind === 'commercial' ? 0 : 5)])}>
            Add item
          </button>

          {kind === 'quotation' && (
            <div className="quote-subsidy">
              <div className="field"><label>Central subsidy</label><input type="number" value={subsidyCentral} onChange={(e) => setSubsidyCentral(+e.target.value)} /></div>
              <div className="field"><label>State subsidy</label><input type="number" value={subsidyState} onChange={(e) => setSubsidyState(+e.target.value)} /></div>
              <div className="field"><label>Target grand total</label><input type="number" value={targetGrand} onChange={(e) => setTargetGrand(e.target.value)} placeholder="Auto-fill prices" /></div>
              <button
                type="button"
                className="mini"
                onClick={() => {
                  if (!Number(targetGrand)) return;
                  setItems(autoFillPrices(items, Number(targetGrand)));
                }}
              >
                Auto-fill prices
              </button>
            </div>
          )}

          <div className="quote-total">
            <small>{kind === 'commercial' ? 'Gross Total Payable' : 'Net Payable'}</small>
            <strong>{inr(displayTotal)}</strong>
          </div>

          {error && <div className="err">{error}</div>}
          {ok && <div className="ok">{ok}</div>}

          <div className="quote-actions">
            {q && <button type="button" className="mini" onClick={() => setOpen(false)}>Cancel</button>}
            <button type="button" className="mini" onClick={downloadPdf}>PDF Download</button>
            <button type="button" className="mini wa" onClick={sendWa}>Send by WhatsApp</button>
            {allowed && (
              <button type="button" className="mini primary" disabled={busy} onClick={save}>
                {busy ? 'Saving…' : 'Save Quotation'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
