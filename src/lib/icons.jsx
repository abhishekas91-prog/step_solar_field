export function Icon({ name, size = 28, color = '#1e293b' }) {
  const s = { width: size, height: size };
  switch (name) {
    case 'search':
      return (
        <svg style={s} viewBox="0 0 48 48" fill="none">
          <circle cx="22" cy="20" r="10" stroke="#334155" strokeWidth="2.4" />
          <path d="M29 28l8 8" stroke="#334155" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="22" cy="20" r="5" fill="#fde68a" />
          <path d="M18 36c2.5-7 11.5-7 14 0" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M32 36h8" stroke="#22c55e" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M36 32v8" stroke="#22c55e" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'clipboard':
      return (
        <svg style={s} viewBox="0 0 48 48" fill="none">
          <rect x="12" y="10" width="24" height="30" rx="3" stroke="#334155" strokeWidth="2.2" fill="#fff" />
          <rect x="18" y="7" width="12" height="6" rx="2" fill="#94a3b8" />
          <path d="M18 22h12M18 28h12M18 34h8" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <circle cx="34" cy="34" r="8" fill="#f59e0b" />
          <path d="M30.5 34.5l2.4 2.4 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'form':
      return (
        <svg style={s} viewBox="0 0 48 48" fill="none">
          <rect x="12" y="8" width="24" height="32" rx="3" stroke="#334155" strokeWidth="2.2" fill="#fff" />
          <path d="M18 16h12M18 22h12M18 28h8" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <path d="M28 30l8 8M36 30l-8 8" stroke="#1e293b" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'checkform':
      return (
        <svg style={s} viewBox="0 0 48 48" fill="none">
          <rect x="14" y="8" width="20" height="28" rx="2" stroke="#334155" strokeWidth="2.2" fill="#fff" />
          <path d="M18 16h12M18 22h10M18 28h8" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 36l4 4 14-16" stroke="#ef4444" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'hourglass':
      return (
        <svg style={s} viewBox="0 0 48 48" fill="none">
          <rect x="14" y="8" width="20" height="32" rx="2" stroke="#334155" strokeWidth="2.2" fill="#fff" />
          <path d="M18 16h12M18 22h10" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <path d="M26 24c4 4 8 6 10 12" stroke="#64748b" strokeWidth="2" />
          <path d="M30 30h10v10H30z" fill="#f59e0b" opacity="0.85" />
        </svg>
      );
    case 'chart':
      return (
        <svg style={s} viewBox="0 0 48 48" fill="none">
          <rect x="12" y="10" width="18" height="24" rx="2" stroke="#334155" strokeWidth="2.2" fill="#fff" />
          <circle cx="21" cy="20" r="5" fill="#38bdf8" />
          <path d="M18 22h6M19 24h4" stroke="#0369a1" strokeWidth="1.4" />
          <circle cx="34" cy="30" r="9" fill="#f59e0b" />
          <circle cx="34" cy="28" r="3.2" fill="#1e293b" />
          <path d="M30 36h8" stroke="#1e293b" strokeWidth="2" />
        </svg>
      );
    case 'handshake':
      return (
        <svg style={s} viewBox="0 0 48 48" fill="none">
          <path d="M8 22l10-8 6 6 6-6 10 8" stroke="#334155" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M14 24l6 8h8l6-8" stroke="#334155" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M18 24h12" stroke="#64748b" strokeWidth="2" />
        </svg>
      );
    case 'grid':
      return (
        <svg style={s} viewBox="0 0 48 48" fill="none">
          <rect x="8" y="8" width="14" height="14" rx="3" stroke="#334155" strokeWidth="2.2" fill="#dbeafe" />
          <rect x="26" y="8" width="14" height="14" rx="3" stroke="#334155" strokeWidth="2.2" fill="#dcfce7" />
          <rect x="8" y="26" width="14" height="14" rx="3" stroke="#334155" strokeWidth="2.2" fill="#fef3c7" />
          <rect x="26" y="26" width="14" height="14" rx="3" stroke="#334155" strokeWidth="2.2" fill="#e2e8f0" />
        </svg>
      );
    case 'lost':
      return (
        <svg style={s} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="16" r="8" stroke="#1e293b" strokeWidth="2.2" />
          <path d="M16 40c2-10 14-10 16 0" stroke="#1e293b" strokeWidth="2.2" />
          <path d="M30 10l10 4-8 10" stroke="#ef4444" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'box':
      return (
        <svg style={s} viewBox="0 0 48 48" fill="none">
          <path d="M8 18l16-8 16 8-16 8z" stroke="#334155" strokeWidth="2.2" />
          <path d="M8 18v14l16 8 16-8V18" stroke="#334155" strokeWidth="2.2" />
          <path d="M24 26v14" stroke="#334155" strokeWidth="2.2" />
        </svg>
      );
    case 'tools':
      return (
        <svg style={s} viewBox="0 0 48 48" fill="none">
          <path d="M14 34l20-20" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
          <circle cx="12" cy="36" r="5" stroke="#334155" strokeWidth="2" />
          <path d="M30 10l8 8-6 2-4-4z" fill="#f59e0b" />
        </svg>
      );
    case 'plug':
      return (
        <svg style={s} viewBox="0 0 48 48" fill="none">
          <rect x="16" y="18" width="16" height="16" rx="3" stroke="#334155" strokeWidth="2.2" />
          <path d="M20 18V10M28 18V10M24 34v6" stroke="#334155" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'money':
      return (
        <svg style={s} viewBox="0 0 48 48" fill="none">
          <rect x="8" y="14" width="32" height="20" rx="4" stroke="#334155" strokeWidth="2.2" />
          <circle cx="24" cy="24" r="5" stroke="#16a34a" strokeWidth="2" />
        </svg>
      );
    case 'user':
      return (
        <svg style={s} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="18" r="8" stroke={color} strokeWidth="2.4" />
          <path d="M10 40c2.5-10 25.5-10 28 0" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'plus':
      return (
        <svg style={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'phone':
      return (
        <svg style={s} viewBox="0 0 24 24" fill="none">
          <path d="M6 4h4l2 5-2 1a12 12 0 006 6l1-2 5 2v4a2 2 0 01-2 2C9 22 2 15 2 6a2 2 0 012-2z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case 'wa':
      return (
        <svg style={s} viewBox="0 0 24 24" fill="#16a34a">
          <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5.1-1.3A10 10 0 1012 2zm5.2 14.2c-.2.6-1.1 1.1-1.8 1.2-.5.1-1.1.1-1.8 0-1.8-.3-3.9-1.6-5.4-3.5-1.4-1.8-2-3.6-2.1-4.2-.1-.7.2-1.5.7-2 .3-.3.7-.4 1.1-.4h.8c.3 0 .6.1.8.6l.9 2.1c.1.3 0 .6-.2.8l-.5.6c-.2.2-.2.4 0 .7.6 1 1.6 1.9 2.6 2.4.3.2.5.1.7-.1l.6-.7c.2-.2.5-.3.8-.2l2.2.9c.5.2.6.5.6.8z" />
        </svg>
      );
    case 'pin':
      return (
        <svg style={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" stroke={color} strokeWidth="1.8" />
          <circle cx="12" cy="10" r="2.2" fill={color} />
        </svg>
      );
    case 'back':
      return (
        <svg style={s} viewBox="0 0 24 24" fill="none">
          <path d="M15 6l-6 6 6 6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'menu':
      return (
        <svg style={s} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="5" r="1.6" fill="#fff" />
          <circle cx="12" cy="12" r="1.6" fill="#fff" />
          <circle cx="12" cy="19" r="1.6" fill="#fff" />
        </svg>
      );
    case 'cam':
      return (
        <svg style={s} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="7" width="18" height="13" rx="2" stroke={color} strokeWidth="1.8" />
          <circle cx="12" cy="13.5" r="3.2" stroke={color} strokeWidth="1.8" />
          <path d="M8 7l1.5-3h5L16 7" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}
