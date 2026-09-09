import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../lib/icons';
import BrandMark from '../components/BrandMark';
import { useAuth } from '../lib/auth';
import { goAppBack } from '../lib/useBackButton';
import {
  TILES,
  currentStage,
  filterByTile,
  isLost,
  isToday,
  matchesQuery,
  pendingForRole,
  statusTone,
  stageLabel,
  teamLabel,
} from '../lib/pipeline';

export default function LeadList({ leads }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const tile = params.get('tile') || '';
  const q = params.get('q') || '';
  const todayOnly = params.get('today') === '1';
  const allProjects = params.get('all') === '1';

  const heading = allProjects
    ? 'All Projects'
    : (tile || q || todayOnly
      ? (TILES.find((x) => x.key === tile)?.label || (q ? `Search: ${q}` : 'Today New Leads'))
      : `Namaste, ${user?.full_name || 'Team'}`);

  const items = useMemo(() => {
    let list = leads;
    if (tile) list = filterByTile(list, tile);
    if (q) list = list.filter((l) => matchesQuery(l, q));
    if (todayOnly) list = list.filter((l) => isToday(l.created_at || l.createdAt));
    return list;
  }, [leads, tile, q, todayOnly]);

  return (
    <div className="app-shell teal">
      <header className="topbar teal-bar greet">
        <button type="button" onClick={() => goAppBack('/')} aria-label="Back">
          <Icon name="back" size={22} color="#fff" />
        </button>
        <div className="greet-copy">
          <BrandMark title={heading} />
          {!tile && !q && !todayOnly && !allProjects && <small>{teamLabel(user?.role)}</small>}
        </div>
        <span style={{ width: 40 }} />
      </header>

      {items.length === 0 ? (
        <div className="empty">Is list mein koi project nahi hai.</div>
      ) : (
        <div className="proj-list">
          {items.map((lead) => {
            const stage = currentStage(lead);
            const lost = isLost(lead);
            const pending = pendingForRole(lead, user?.role);
            const tone = lost ? 'idle' : statusTone(stage?.status);
            return (
              <button
                key={lead.id}
                className="proj-card"
                type="button"
                onClick={() => navigate(`/leads/${lead.id}`)}
              >
                <div className="proj-top">
                  <span className="proj-code">{lead.code}</span>
                  {pending > 0 && !lost && <span className="pending-pill">{pending} pending</span>}
                </div>
                <h3>{lead.full_name}</h3>
                <p className="proj-city">{[lead.city, lead.state].filter(Boolean).join(', ') || '—'}</p>
                <div className="proj-stage">
                  <span className={`dot ${tone}`} />
                  <strong>{lost ? 'Deal Lost' : stageLabel(stage)}</strong>
                  <em>{lost ? 'Lost' : stage?.status || 'Pending'}</em>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <button className="fab teal-fab" type="button" onClick={() => navigate('/leads/new')} aria-label="Add lead">
        <Icon name="plus" size={28} />
      </button>
    </div>
  );
}
