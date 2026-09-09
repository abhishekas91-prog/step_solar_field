import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../lib/icons';
import BrandMark from '../components/BrandMark';
import { useAuth } from '../lib/auth';
import { goAppBack } from '../lib/useBackButton';
import { api } from '../lib/api';
import {
  canEditStage,
  formatPhone,
  stageLabel,
  statusTone,
} from '../lib/pipeline';
import DocsPanel from '../components/DocsPanel';

export default function LeadDetail({ leads, reload }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const cached = leads.find((l) => l.id === id);
  const [lead, setLead] = useState(cached || null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('pipeline');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const full = await api.getLead(id);
        if (!cancelled) setLead(full);
      } catch (e) {
        if (!cancelled && !cached) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error && !lead) {
    return (
      <div className="app-shell teal">
        <header className="topbar teal-bar">
          <button type="button" onClick={() => goAppBack('/')}><Icon name="back" size={22} color="#fff" /></button>
          <BrandMark title="Project" />
          <span style={{ width: 40 }} />
        </header>
        <div className="empty">{error}</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="app-shell teal">
        <header className="topbar teal-bar">
          <button type="button" onClick={() => goAppBack('/')}><Icon name="back" size={22} color="#fff" /></button>
          <BrandMark title="Loading…" />
          <span style={{ width: 40 }} />
        </header>
      </div>
    );
  }

  const phone = lead.phone || '';
  const pin = lead.pincode ? ` · ${lead.pincode}` : '';

  return (
    <div className="app-shell teal">
      <header className="topbar teal-bar">
        <button type="button" onClick={() => goAppBack('/')} aria-label="Back">
          <Icon name="back" size={22} color="#fff" />
        </button>
        <BrandMark title={lead.code || 'Project'} />
        <span style={{ width: 40 }} />
      </header>

      <div className="detail-pad">
        <div className="contact-card">
          <h2>{lead.full_name}</h2>
          <p>{[lead.city, lead.state].filter(Boolean).join(', ') || '—'}{pin}</p>
          {phone ? (
            <a className="call-link" href={`tel:${phone}`}>Call: {formatPhone(phone)}</a>
          ) : (
            <p className="call-link muted">No phone</p>
          )}
        </div>

        <div className="detail-tabs">
          <button type="button" className={tab === 'pipeline' ? 'active' : ''} onClick={() => setTab('pipeline')}>
            Pipeline
          </button>
          <button type="button" className={tab === 'docs' ? 'active' : ''} onClick={() => setTab('docs')}>
            Documents
          </button>
        </div>

        {tab === 'pipeline' && (
          <>
            <div className="section-label">PIPELINE STAGES</div>
            {(lead.stages || []).map((stage, i) => {
              const editable = canEditStage(user, stage);
              const tone = statusTone(stage.status);
              const active = stage.status === 'In Progress';
              const n = i + 1;
              return (
                <div key={stage.key} className={`stage-row ${active ? 'highlight' : ''}`}>
                  <div className="stage-row-top">
                    <div className="stage-title">
                      <span className={`dot ${tone}`} />
                      <div>
                        <strong>{n}. {stageLabel(stage)}</strong>
                        {(active || stage.status === 'Pending') && (
                          <small>Owner team: {stage.owner}</small>
                        )}
                      </div>
                    </div>
                    <span className={`status-text ${tone}`}>{stage.status}</span>
                  </div>
                  {editable && (
                    <button
                      className="update-btn"
                      type="button"
                      onClick={() => navigate(`/leads/${lead.id}/stages/${stage.key}`)}
                    >
                      Update
                    </button>
                  )}
                  {!editable && stage.status !== 'Completed' && (
                    <p className="lock-hint">Sirf {stage.owner} team update kar sakti hai</p>
                  )}
                </div>
              );
            })}
          </>
        )}

        {tab === 'docs' && (
          <DocsPanel
            lead={lead}
            user={user}
            onSaved={(updated) => {
              if (updated) setLead(updated);
              reload?.();
            }}
          />
        )}
      </div>
    </div>
  );
}
