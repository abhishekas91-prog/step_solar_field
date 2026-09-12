import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

let overlayOpen = false;
let overlayCloser = null;

export function isChatOverlayOpen() {
  return overlayOpen;
}

export function closeChatOverlay() {
  overlayCloser?.();
}

function formatWhen(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function WhatsAppChat({ lead, open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [phone, setPhone] = useState(lead?.phone || '');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  overlayOpen = Boolean(open);
  overlayCloser = open ? onClose : null;

  async function load() {
    const leadPhone = lead?.phone || '';
    if (!leadPhone) {
      setError('No phone');
      return;
    }
    setLoading(true);
    try {
      const out = await api.whatsappThread(leadPhone);
      if (out?.error === 'whatsapp_disabled') {
        setError('WhatsApp Business API CRM mein configure nahi hai');
        setMessages([]);
        return;
      }
      const err = out?.error || '';
      const missing = !err || err === 'no_phone' || /not[_ ]found/i.test(err);
      if (out?.ok === false && err && !missing) {
        setError(err);
      } else {
        setError('');
      }
      setPhone(out?.phone || lead.phone || '');
      setMessages(Array.isArray(out?.messages) ? out.messages : []);
    } catch (e) {
      const msg = e.message || 'Chat load fail';
      setError(/not found/i.test(msg) ? '' : msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return undefined;
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.phone]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, open]);

  async function send(e) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError('');
    setText('');
    setMessages((m) => [
      ...m,
      { id: `local-${Date.now()}`, direction: 'outbound', text: body, status: 'sending', created_at: new Date().toISOString() },
    ]);
    try {
      const out = await api.whatsappChat({ phone: lead.phone, text: body });
      if (out?.ok === false) {
        setError(out.error === 'whatsapp_disabled'
          ? 'WhatsApp Business API CRM mein configure nahi hai'
          : (out.error || 'Send fail'));
        await load();
        return;
      }
      await load();
    } catch (err) {
      setError(err.message || 'Send fail');
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="wa-sheet" role="dialog" aria-label="WhatsApp chat">
      <div className="wa-head">
        <div>
          <strong>WhatsApp · {lead.full_name || lead.name || 'Customer'}</strong>
          <small>{phone} · via WaCRM Business API</small>
        </div>
        <button type="button" className="mini" onClick={onClose} aria-label="Close">Back</button>
      </div>
      <div className="wa-thread">
        {loading && !messages.length ? <div className="wa-empty">Loading chat…</div> : null}
        {!loading && !messages.length && !error ? (
          <div className="wa-empty">Abhi koi message nahi. Neeche type karke bhejo.</div>
        ) : null}
        {messages.map((m) => (
          <div key={m.id} className={`wa-bubble ${m.direction === 'inbound' ? 'in' : 'out'}`}>
            <p>{m.text || (m.media_url ? 'Attachment' : '')}</p>
            <span>{formatWhen(m.created_at)}{m.status ? ` · ${m.status}` : ''}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error ? <div className="wa-err">{error}</div> : null}
      <form className="wa-compose" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          autoComplete="off"
        />
        <button type="submit" className="mini wa" disabled={busy || !text.trim()}>Send</button>
      </form>
    </div>
  );
}
