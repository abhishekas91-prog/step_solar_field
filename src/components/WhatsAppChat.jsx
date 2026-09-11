import { useEffect, useRef, useState } from 'react';
import { Icon } from '../lib/icons';
import { api } from '../lib/api';

function messageText(m) {
  return m?.content_text || m?.text || m?.body || m?.content || '';
}

function isOutbound(m) {
  return (m?.direction || '').toLowerCase() === 'outbound';
}

function sameThread(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if ((a[i].id || '') !== (b[i].id || '')) return false;
    if (messageText(a[i]) !== messageText(b[i])) return false;
    if ((a[i].status || '') !== (b[i].status || '')) return false;
  }
  return true;
}

function mergeMessages(prev, next) {
  if (sameThread(prev, next)) return prev;
  const pending = prev.filter((m) => (
    !m.id
    && isOutbound(m)
    && !next.some((n) => isOutbound(n) && messageText(n) === messageText(m))
  ));
  return pending.length ? [...next, ...pending] : next;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (Number.isNaN(m) || m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function WhatsAppChat({ open, onClose, lead }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const threadRef = useRef(null);
  const stickRef = useRef(true);

  useEffect(() => {
    if (!open) return undefined;
    function onOverlay() {
      onClose?.();
    }
    document.addEventListener('ss-close-overlays', onOverlay);
    return () => document.removeEventListener('ss-close-overlays', onOverlay);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !lead?.phone) {
      setMessages([]);
      setError(open && lead && !lead.phone ? 'Lead has no phone number' : '');
      return undefined;
    }
    let cancelled = false;
    let first = true;
    setLoading(true);
    setError('');

    async function load() {
      try {
        const res = await api.whatsappChat(lead.phone);
        if (cancelled) return;
        setMessages((prev) => mergeMessages(prev, res.messages || []));
        setError('');
      } catch (e) {
        if (cancelled) return;
        if (first) {
          setError(e.message);
          setMessages([]);
        }
      } finally {
        if (!cancelled && first) {
          first = false;
          setLoading(false);
        }
      }
    }

    load();
    const timer = setInterval(load, 3000);
    function onVis() {
      if (document.visibilityState === 'visible') load();
    }
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [open, lead?.phone]);

  useEffect(() => {
    if (open && stickRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, loading]);

  function onThreadScroll() {
    const el = threadRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  async function send() {
    const body = text.trim();
    if (!body || sending || !lead?.phone) return;
    setSending(true);
    try {
      await api.whatsappChatSend({ phone: lead.phone, text: body });
      stickRef.current = true;
      setMessages((prev) => [
        ...prev,
        { direction: 'outbound', content_text: body, created_at: new Date().toISOString(), status: 'sent' },
      ]);
      setText('');
      inputRef.current?.focus();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  const name = lead?.full_name || lead?.name || lead?.code || 'Customer';

  return (
    <div className="wa-sheet" role="dialog" aria-label={`WhatsApp ${name}`}>
      <header className="wa-sheet-bar">
        <div>
          <strong>WhatsApp · {name}</strong>
          <small>{lead?.phone || 'No phone'} · via WaCRM</small>
        </div>
        <button type="button" onClick={onClose} aria-label="Close chat">
          <Icon name="back" size={22} color="#fff" />
        </button>
      </header>
      <div className="wa-sheet-thread" ref={threadRef} onScroll={onThreadScroll}>
        {loading && <div className="wa-empty">Loading chat…</div>}
        {!loading && error && (
          <div className="wa-empty">
            <strong>Chat not connected</strong>
            <p>{error}</p>
          </div>
        )}
        {!loading && !error && messages.length === 0 && (
          <div className="wa-empty">
            <strong>No messages yet</strong>
            <p>Is CRM se pehla WhatsApp yahin se bhejo.</p>
          </div>
        )}
        {!loading && !error && messages.map((m, i) => {
          const out = isOutbound(m);
          return (
            <div key={m.id || i} className={`wa-bubble-row ${out ? 'out' : 'in'}`}>
              <div className={`wa-bubble ${out ? 'out' : 'in'}`}>
                <div>{messageText(m) || '(media)'}</div>
                <span>
                  {timeAgo(m.created_at || m.at)}
                  {out ? ` · ${m.status || ''}` : ''}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="wa-sheet-composer">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          disabled={Boolean(error) || sending || !lead?.phone}
        />
        <button type="button" onClick={send} disabled={Boolean(error) || sending || !text.trim() || !lead?.phone}>
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export function WhatsAppFab({ lead }) {
  const [open, setOpen] = useState(false);
  if (!lead) return null;
  return (
    <>
      <button
        className="fab wa-fab"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="WhatsApp chat"
      >
        <Icon name="wa" size={28} />
      </button>
      <WhatsAppChat open={open} onClose={() => setOpen(false)} lead={lead} />
    </>
  );
}
