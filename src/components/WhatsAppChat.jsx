import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { Icon } from '../lib/icons';

let overlayOpen = false;
let overlayCloser = null;

export function isChatOverlayOpen() {
  return overlayOpen;
}

export function closeChatOverlay() {
  overlayCloser?.();
}

const TEXT_META = new Set([
  'id', 'direction', 'status', 'state', 'created_at', 'createdAt', 'updated_at',
  'timestamp', 'media_url', 'content_type', 'phone', 'from', 'to', 'sender',
  'sender_type', 'conversation_id', 'contact_id', 'message_id', 'wamid',
  'type', 'msg_type', 'message_type', 'at',
]);

function asText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'object') return '';
  const nested = value.content_text || value.contentText || value.body || value.text
    || value.message || value.caption || value.content || value.msg;
  if (!nested || nested === value) return '';
  return asText(nested);
}

function deepText(obj, depth = 0) {
  if (depth > 4 || !obj || typeof obj !== 'object') return '';
  for (const [k, v] of Object.entries(obj)) {
    if (TEXT_META.has(k)) continue;
    if (typeof v === 'string' && v.trim()) return v;
    const nested = deepText(v, depth + 1);
    if (nested) return nested;
  }
  return '';
}

function pickText(m) {
  if (!m || typeof m !== 'object') return '';
  const direct = [
    m.content_text, m.contentText, m.text, m.body, m.message, m.content, m.caption, m.msg,
    m.message_text, m.messageText, m.message_body, m.text_body, m.wamessage,
    m.payload, m.data, m.interactive?.body, m.button?.text,
    m.button_reply?.title, m.list_reply?.title, m.template?.name,
    m.image?.caption, m.video?.caption, m.document?.caption,
    m.image?.link, m.document?.filename, m.filename,
  ];
  for (const value of direct) {
    const out = asText(value).trim();
    if (out) return asText(value);
  }
  return deepText(m);
}

function pickWhen(m) {
  const raw = m?.created_at ?? m?.createdAt ?? m?.at ?? m?.timestamp ?? m?.sent_at
    ?? m?.time ?? m?.date ?? m?.updated_at ?? m?.received_at;
  if (raw == null || raw === '') return '';
  if (typeof raw === 'number' || (/^\d+$/.test(String(raw)))) {
    const n = Number(raw);
    return n < 1e12 ? n * 1000 : n;
  }
  return raw;
}

function pickDirection(m) {
  const sender = String(m?.sender_type || '').toLowerCase();
  if (sender === 'customer') return 'inbound';
  if (sender && sender !== 'customer') return 'outbound';
  const d = String(m?.direction || m?.type || m?.msg_type || m?.message_type || '').toLowerCase();
  if (['in', 'inbound', 'incoming', 'received', 'from_customer', 'customer', 'user'].includes(d)) return 'inbound';
  if (['out', 'outbound', 'outgoing', 'sent', 'from_agent', 'agent', 'business', 'bot'].includes(d)) return 'outbound';
  if (m?.from_me === true || m?.from_me === 1 || m?.is_from_me === true || m?.outgoing === true || m?.sent === true) return 'outbound';
  if (m?.from_me === false || m?.from_me === 0 || m?.is_from_me === false || m?.incoming === true) return 'inbound';
  const from = String(m?.from || m?.sender || m?.role || '').toLowerCase();
  if (['customer', 'user', 'contact', 'inbound'].includes(from)) return 'inbound';
  if (['agent', 'business', 'bot', 'system', 'outbound'].includes(from)) return 'outbound';
  return 'outbound';
}

function pickMedia(m) {
  if (!m || typeof m !== 'object') return '';
  const url = m.media_url || m.mediaUrl || m.file_url || m.attachment_url
    || m.image_url || m.document_url || m.audio_url || m.video_url || m.media
    || m.image?.url || m.image?.link || m.video?.url || m.document?.url || m.audio?.url;
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) return url;
  if (url && typeof url === 'object') {
    const nested = url.url || url.link || url.href || url.src;
    if (typeof nested === 'string' && /^https?:\/\//i.test(nested)) return nested;
  }
  return '';
}

function isMediaMessage(m, mediaUrl) {
  if (mediaUrl) return true;
  const t = String(m?.type || m?.message_type || m?.msg_type || '').toLowerCase();
  return ['image', 'video', 'audio', 'document', 'sticker', 'file', 'media'].includes(t);
}

function normalizeMessage(m, index) {
  if (typeof m === 'string') {
    return { id: `msg-${index}`, direction: 'outbound', text: m, media_url: '', status: '', created_at: '' };
  }
  const raw = m && typeof m === 'object' ? m : {};
  const media_url = pickMedia(raw);
  const text = pickText(raw) || (isMediaMessage(raw, media_url) ? 'Attachment' : '');
  return {
    id: raw.id ?? raw.message_id ?? raw.wamid ?? `msg-${index}-${pickWhen(raw) || index}`,
    direction: pickDirection(raw),
    text,
    media_url,
    status: raw.status || raw.state || '',
    created_at: pickWhen(raw),
  };
}

function extractMessageList(out) {
  if (Array.isArray(out)) return out;
  if (!out || typeof out !== 'object') return [];
  const nested = out.messages ?? out.data?.messages ?? out.thread ?? out.conversation?.messages
    ?? out.chats ?? out.data;
  if (Array.isArray(nested)) return nested;
  if (nested && typeof nested === 'object') {
    if (Array.isArray(nested.data)) return nested.data;
    if (Array.isArray(nested.messages)) return nested.messages;
    if (Array.isArray(nested.items)) return nested.items;
  }
  return [];
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
      setMessages(extractMessageList(out).map(normalizeMessage));
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
            {m.media_url && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(m.media_url) ? (
              <img className="wa-media" src={m.media_url} alt="" />
            ) : null}
            {m.text ? <p>{m.text}</p> : null}
            {!m.text ? <p>{m.media_url ? 'Attachment' : '(media)'}</p> : null}
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

export function WhatsAppFab({ lead }) {
  const [open, setOpen] = useState(false);
  if (!lead?.phone) return null;
  return (
    <>
      <button className="fab wa-fab" type="button" onClick={() => setOpen(true)} aria-label="WhatsApp">
        <Icon name="wa" size={28} />
      </button>
      <WhatsAppChat lead={lead} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
