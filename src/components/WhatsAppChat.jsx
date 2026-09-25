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

const SKIP_KEYS = new Set([
  'id', 'uuid', 'gid', 'direction', 'status', 'state', 'ack', 'created_at', 'createdAt',
  'updated_at', 'updatedAt', 'timestamp', 'time', 'date', 'sent_at', 'received_at',
  'media_url', 'content_type', 'mime_type', 'phone', 'from', 'to', 'sender', 'sender_type',
  'conversation_id', 'contact_id', 'message_id', 'wamid', 'wa_id', 'type', 'msg_type',
  'message_type', 'at', 'ok', 'enabled', 'error', 'role', 'from_me', 'is_from_me',
  'outgoing', 'incoming', 'sent', 'read', 'delivered',
]);

const SKIP_TEXT = /^(delivered|read|sent|pending|failed|inbound|outbound|incoming|outgoing|customer|agent|business|bot|user|contact|text|image|video|audio|document|chat|message|media|file|sticker|ok|true|false)$/i;

function digitsPhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function parseMaybeJson(value) {
  if (typeof value !== 'string') return value;
  const t = value.trim();
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try { return JSON.parse(t); } catch { return value; }
  }
  return value;
}

function isBoringText(s) {
  const t = String(s || '').trim();
  if (!t || t.length > 4000) return true;
  if (SKIP_TEXT.test(t)) return true;
  if (/^https?:\/\//i.test(t) && t.length < 120) return true;
  if (/^\d+$/.test(t)) return true;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return true;
  if (/^wamid\./i.test(t)) return true;
  if (/^[0-9a-f-]{8,}$/i.test(t) && t.length <= 64) return true;
  return false;
}

function collectTexts(node, depth, found) {
  if (depth > 7 || node == null) return;
  if (typeof node === 'string') {
    const parsed = parseMaybeJson(node);
    if (parsed !== node) {
      collectTexts(parsed, depth + 1, found);
      return;
    }
    if (!isBoringText(node)) found.push(node.trim());
    return;
  }
  if (typeof node === 'number' || typeof node === 'boolean') return;
  if (Array.isArray(node)) {
    node.forEach((item) => collectTexts(item, depth + 1, found));
    return;
  }
  if (typeof node !== 'object') return;
  const preferred = [];
  const rest = [];
  for (const [k, v] of Object.entries(node)) {
    if (SKIP_KEYS.has(k) || k.startsWith('_')) continue;
    if (/text|body|content|caption|msg|title|comment|conversation|description|payload/i.test(k)) {
      preferred.push(v);
    } else {
      rest.push(v);
    }
  }
  preferred.forEach((v) => collectTexts(v, depth + 1, found));
  rest.forEach((v) => collectTexts(v, depth + 1, found));
}

function pickText(m) {
  if (typeof m === 'string') return isBoringText(m) ? '' : m.trim();
  if (!m || typeof m !== 'object') return '';
  const direct = [
    m.content_text, m.contentText, m.processed_message_content, m.message_content,
    m.display_text, m.plain_text, m.rendered_content, m.conversation,
    m.text?.body, m.body?.text, m.text, m.body, m.message, m.content, m.caption, m.msg,
    m.message_text, m.messageText, m.message_body, m.text_body, m.wamessage,
    m.interactive?.body?.text, m.interactive?.body, m.button?.text,
    m.button_reply?.title, m.list_reply?.title,
    m.image?.caption, m.video?.caption, m.document?.caption, m.document?.filename,
    m.extendedTextMessage?.text, m.conversation,
  ];
  for (const value of direct) {
    if (typeof value === 'string' && !isBoringText(value)) return value.trim();
    if (value && typeof value === 'object') {
      const nested = pickText(value);
      if (nested) return nested;
    }
  }
  const found = [];
  collectTexts(m, 0, found);
  found.sort((a, b) => b.length - a.length);
  return found[0] || '';
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

function unwrapMessage(m) {
  if (typeof m === 'string') {
    const t = m.trim();
    if (t.startsWith('{') || t.startsWith('[')) {
      try { return unwrapMessage(JSON.parse(t)); } catch { return m; }
    }
    return m;
  }
  if (!m || typeof m !== 'object') return m;
  if (m.message && typeof m.message === 'object' && !Array.isArray(m.message) && !m.content_text && !m.text && !m.body) {
    return { ...m.message, ...m, message: m.message };
  }
  return m;
}

function normalizeMessage(m, index) {
  if (typeof m === 'string') {
    return { id: `msg-${index}`, direction: 'outbound', text: m, media_url: '', status: '', created_at: '' };
  }
  const raw = unwrapMessage(m && typeof m === 'object' ? m : {});
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const media_url = pickMedia(obj);
  const text = pickText(obj) || (isMediaMessage(obj, media_url) ? 'Attachment' : '');
  return {
    id: String(obj.id ?? obj.message_id ?? obj.wamid ?? `msg-${index}-${pickWhen(obj) || index}`),
    direction: pickDirection(obj),
    text,
    media_url,
    status: obj.status || obj.state || '',
    created_at: pickWhen(obj),
  };
}

function chatPhone(phone) {
  const d = digitsPhone(phone);
  if (d.length === 11 && d.startsWith('0')) return d.slice(1);
  if (d.length === 12 && d.startsWith('91')) return d.slice(2);
  if (d.length > 12 && d.startsWith('91')) return d.slice(-10);
  return d;
}

function scoreMessageArray(list) {
  if (!Array.isArray(list) || !list.length) return -1;
  let score = 0;
  let withText = 0;
  for (const item of list) {
    if (typeof item === 'string' && item.trim()) {
      withText += 1;
      score += 6;
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    score += 1;
    if (pickText(item) || pickMedia(item)) {
      withText += 1;
      score += 8;
    }
    if (item.content_text || item.contentText || item.content || item.text || item.body || item.message) {
      score += 3;
    }
    const kind = String(item.type || item.message_type || item.msg_type || '').toLowerCase();
    if (['status', 'ack', 'receipt', 'activity', 'event'].includes(kind)) score -= 4;
  }
  if (!withText) return score - 20;
  return score + withText * 4;
}

function extractMessageList(out) {
  const candidates = [];
  function consider(list) {
    if (!Array.isArray(list) || !list.length) return;
    if (candidates.includes(list)) return;
    candidates.push(list);
  }
  function walk(node, depth) {
    if (depth > 6 || node == null) return;
    if (typeof node === 'string') {
      const t = node.trim();
      if ((t.startsWith('{') || t.startsWith('[')) && t.length > 2) {
        try { walk(JSON.parse(t), depth + 1); } catch { /* ignore */ }
      }
      return;
    }
    if (Array.isArray(node)) {
      consider(node);
      node.slice(0, 8).forEach((item) => {
        if (item && typeof item === 'object') walk(item, depth + 1);
      });
      return;
    }
    if (typeof node !== 'object') return;
    for (const key of [
      'messages', 'payload', 'thread', 'chats', 'history', 'data', 'items',
      'records', 'result', 'inbox', 'chat', 'conversation', 'content',
    ]) {
      if (node[key] != null) walk(node[key], depth + 1);
    }
  }
  if (Array.isArray(out)) consider(out);
  else walk(out, 0);

  let best = [];
  let bestScore = -999;
  for (const list of candidates) {
    const s = scoreMessageArray(list);
    if (s > bestScore) {
      bestScore = s;
      best = list;
    }
  }
  const withBody = best.filter((item) => {
    if (typeof item === 'string') return Boolean(item.trim());
    if (!item || typeof item !== 'object') return false;
    const kind = String(item.type || item.message_type || item.msg_type || '').toLowerCase();
    if (['status', 'ack', 'receipt'].includes(kind) && !pickText(item) && !pickMedia(item)) return false;
    return true;
  });
  return withBody.length ? withBody : best;
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
  const inFlight = useRef(false);
  const backoffUntil = useRef(0);

  overlayOpen = Boolean(open);
  overlayCloser = open ? onClose : null;

  async function load(silent, force) {
    const leadPhone = chatPhone(lead?.phone);
    if (!leadPhone) {
      setError('No phone');
      return;
    }
    if (inFlight.current) return;
    if (!force && Date.now() < backoffUntil.current) return;
    inFlight.current = true;
    if (!silent) setLoading(true);
    try {
      const out = await api.whatsappThread(leadPhone);
      if (out?.error === 'whatsapp_disabled') {
        setError('WhatsApp Business API CRM mein configure nahi hai');
        return;
      }
      const err = out?.error || '';
      const missing = !err || err === 'no_phone' || /not[_ ]found/i.test(err);
      if (out?.ok === false && err && !missing) {
        setError(err);
      } else {
        setError('');
      }
      setPhone(out?.phone || leadPhone);
      const list = extractMessageList(out).map(normalizeMessage);
      const seen = new Set();
      setMessages(list.map((m, i) => {
        let id = String(m.id || `msg-${i}`);
        if (seen.has(id)) id = `${id}-${i}`;
        seen.add(id);
        return { ...m, id };
      }));
    } catch (e) {
      if (e.status === 429 || /too many requests/i.test(e.message || '')) {
        backoffUntil.current = Date.now() + 45_000;
        setError('Server busy. Thodi der baad Retry dabao.');
        return;
      }
      const msg = e.message || 'Chat load fail';
      setError(/not found/i.test(msg) ? '' : msg);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    let timer;
    backoffUntil.current = 0;
    async function tick(first) {
      if (cancelled) return;
      await load(!first);
      if (cancelled) return;
      const wait = Date.now() < backoffUntil.current
        ? Math.max(5000, backoffUntil.current - Date.now())
        : 25000;
      timer = setTimeout(() => tick(false), wait);
    }
    tick(true);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
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
      const out = await api.whatsappChat({ phone: chatPhone(lead.phone) || lead.phone, text: body });
      if (out?.ok === false) {
        setError(out.error === 'whatsapp_disabled'
          ? 'WhatsApp Business API CRM mein configure nahi hai'
          : (out.error || 'Send fail'));
          await load(false, true);
          return;
        }
        await load(false, true);
      } catch (err) {
        setError(err.message || 'Send fail');
        await load(false, true);
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
            {m.text || m.media_url ? (
              <span className="wa-text">{m.text || 'Attachment'}</span>
            ) : null}
            <span className="wa-meta">
              {formatWhen(m.created_at)}{m.status ? ` · ${m.status}` : ''}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error ? (
        <div className="wa-err">
          {error}
          <button type="button" className="mini" onClick={() => load(false, true)}>Retry</button>
        </div>
      ) : null}
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
