import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Icon } from '../lib/icons';
import BrandMark from '../components/BrandMark';
import { TILES, QUICK_CHIPS, countByTile, isToday } from '../lib/pipeline';

export default function Dashboard({ leads }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);

  const todayNew = useMemo(
    () => leads.filter((l) => isToday(l.created_at || l.createdAt)).length,
    [leads],
  );

  useEffect(() => {
    const close = () => setMenu(false);
    document.addEventListener('ss-close-overlays', close);
    return () => document.removeEventListener('ss-close-overlays', close);
  }, []);

  function openTile(key) {
    if (key === 'all') {
      navigate('/leads?all=1');
      return;
    }
    navigate(`/leads?tile=${encodeURIComponent(key)}`);
  }

  function openSearch() {
    const query = q.trim();
    navigate(query ? `/leads?q=${encodeURIComponent(query)}` : '/leads');
  }

  function openChip(chip) {
    if (chip.id === 'all') {
      navigate('/leads?all=1');
      return;
    }
    if (chip.id === 'today_surveys') {
      navigate(`/leads?tile=${encodeURIComponent(chip.stageKey)}&today=1`);
      return;
    }
    navigate(`/leads?tile=${encodeURIComponent(chip.stageKey)}`);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <span style={{ width: 40 }} />
        <BrandMark title="Step Solar Dashboard" />
        <button type="button" onClick={() => setMenu(true)} aria-label="Menu">
          <Icon name="menu" size={22} />
        </button>
      </header>

      <section className="profile-hero">
        <div className="avatar-ring">
          <img src="/step-solar-logo.png" alt="Step Solar" />
        </div>
        <div className="profile-copy">
          <h2>{user?.full_name || 'Field User'}</h2>
          <p>{user?.email}</p>
          <p>{user?.role || 'Sales'}</p>
          <p>Step Solar Energy</p>
        </div>
      </section>

      <button className="pill-banner" type="button" onClick={() => navigate('/leads?today=1')}>
        Today New Leads : {todayNew}
      </button>

      <div className="chip-row">
        {QUICK_CHIPS.map((c) => (
          <button key={c.id} className="chip" type="button" onClick={() => openChip(c)}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="search-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by phone or name"
          onKeyDown={(e) => e.key === 'Enter' && openSearch()}
        />
        <button className="search-btn" type="button" onClick={openSearch} aria-label="Search">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#1578c8" strokeWidth="2.2" />
            <path d="M16 16l5 5" stroke="#1578c8" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="tile-grid">
        {TILES.map((t) => (
          <button key={t.key} className="tile" type="button" onClick={() => openTile(t.key)}>
            <span className="badge">{countByTile(leads, t.key)}</span>
            <Icon name={t.icon} size={48} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <button className="fab" type="button" onClick={() => navigate('/leads/new')} aria-label="Add lead">
        <Icon name="plus" size={28} />
      </button>

      {menu && (
        <div className="menu-sheet" onClick={() => setMenu(false)}>
          <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
            <strong>Signed in as</strong>
            <p style={{ color: '#64748b', fontSize: 13 }}>{user?.full_name} · {user?.role}</p>
            <button type="button" onClick={() => { setMenu(false); navigate('/leads?all=1'); }}>All projects</button>
            <button type="button" onClick={() => { setMenu(false); navigate('/leads/new'); }}>New lead</button>
            <button type="button" onClick={() => { logout(); navigate('/login'); }}>Sign out</button>
          </div>
        </div>
      )}
    </div>
  );
}
