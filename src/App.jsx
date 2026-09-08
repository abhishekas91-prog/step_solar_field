import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { api } from './lib/api';
import Login from './screens/Login';
import Dashboard from './screens/Dashboard';
import LeadList from './screens/LeadList';
import LeadDetail from './screens/LeadDetail';
import NewLead from './screens/NewLead';
import StageUpdate from './screens/StageUpdate';
import BackButtonHandler from './lib/useBackButton';

function Guard({ children }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) {
    return (
      <div className="app-shell">
        <header className="topbar"><span className="topbar-brand"><img src="/step-solar-logo.png" alt="Step Solar" /><span>Step Solar</span></span></header>
        <div className="empty">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

function Shell() {
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const raw = await api.leads();
      setLeads(Array.isArray(raw) ? raw : []);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <>
      {error && !leads.length ? <div className="err" style={{ padding: 12 }}>{error}</div> : null}
      <Routes>
        <Route path="/" element={<Dashboard leads={leads} />} />
        <Route path="/leads" element={<LeadList leads={leads} />} />
        <Route path="/leads/new" element={<NewLead reload={reload} />} />
        <Route path="/leads/:id/stages/:stageKey" element={<StageUpdate leads={leads} reload={reload} />} />
        <Route path="/leads/:id" element={<LeadDetail leads={leads} reload={reload} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <>
      <BackButtonHandler />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<Guard><Shell /></Guard>} />
      </Routes>
    </>
  );
}
