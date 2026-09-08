import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../lib/icons';
import BrandMark from '../components/BrandMark';
import { useAuth } from '../lib/auth';
import { api, fetchDocObjectUrl } from '../lib/api';
import { compressImage, captureGps } from '../lib/photo';
import {
  STAGE_STATUS,
  canEditStage,
  formatLoc,
  stageLabel,
} from '../lib/pipeline';
import QuoteEditor from '../components/QuoteEditor';

export default function StageUpdate({ leads, reload }) {
  const { id, stageKey } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const cached = leads.find((l) => l.id === id);
  const [lead, setLead] = useState(cached || null);
  const [status, setStatus] = useState('Pending');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [existingUrls, setExistingUrls] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const camRef = useRef(null);
  const galRef = useRef(null);
  const primedKey = useRef('');

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

  const stage = (lead?.stages || []).find((s) => s.key === stageKey);

  useEffect(() => {
    if (!stage) return;
    const stamp = `${lead?.id}:${stage.key}`;
    if (primedKey.current === stamp) return;
    primedKey.current = stamp;
    setStatus(stage.status || 'Pending');
    setNotes(stage.notes || '');
    setLocation(stage.location || null);
    setFile(null);
    setPreview('');
    setError('');
    setOk('');
    if (!stage.location) {
      captureGps().then(setLocation).catch(() => {});
    }
  }, [lead?.id, stage]);

  useEffect(() => {
    let revoked = [];
    let cancelled = false;
    (async () => {
      if (!lead || !stage) return;
      const docs = stage.documents || [];
      const urls = [];
      for (const doc of docs) {
        if (!String(doc.content_type || '').startsWith('image/')) continue;
        try {
          const url = await fetchDocObjectUrl(lead.id, stage.key, doc.id);
          urls.push(url);
          revoked.push(url);
        } catch {
          /* skip */
        }
      }
      if (!cancelled) setExistingUrls(urls);
    })();
    return () => {
      cancelled = true;
      revoked.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [lead?.id, stage?.key, (stage?.documents || []).length]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function onPick(e) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    setBusy('photo');
    setError('');
    try {
      const compact = await compressImage(picked);
      if (preview) URL.revokeObjectURL(preview);
      setFile(compact);
      setPreview(URL.createObjectURL(compact));
    } catch {
      setError('Photo read nahi ho payi');
    } finally {
      setBusy('');
    }
  }

  async function refreshGps() {
    setBusy('gps');
    setError('');
    try {
      const loc = await captureGps();
      setLocation(loc);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  async function submit() {
    if (!lead || !stage) return;
    if (!canEditStage(user, stage)) {
      setError(`Sirf ${stage.owner} team update kar sakti hai`);
      return;
    }
    setBusy('save');
    setError('');
    setOk('');
    try {
      let loc = location;
      if (!loc) {
        try {
          loc = await captureGps();
          setLocation(loc);
        } catch {
          /* optional */
        }
      }
      const next = (lead.stages || []).map((s) =>
        s.key === stage.key
          ? {
              ...s,
              status,
              notes,
              updatedAt: new Date().toISOString(),
              ...(loc ? { location: loc } : {}),
            }
          : s,
      );
      const updated = await api.updateLead(lead.id, { stages: next });
      if (file) {
        await api.uploadDoc(lead.id, stage.key, file);
      }
      const fresh = file ? await api.getLead(lead.id) : updated;
      setLead(fresh);
      if (file && preview) URL.revokeObjectURL(preview);
      setFile(null);
      setPreview('');
      setOk('Stage update save ho gaya');
      reload?.();
      setTimeout(() => navigate(`/leads/${lead.id}`), 700);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  if (!lead) {
    return (
      <div className="app-shell teal">
        <header className="topbar teal-bar">
          <button type="button" onClick={() => navigate(-1)}><Icon name="back" size={22} color="#fff" /></button>
          <BrandMark title="Stage Update" />
          <span style={{ width: 40 }} />
        </header>
        <div className="empty">{error || 'Loading…'}</div>
      </div>
    );
  }

  if (!stage) {
    return (
      <div className="app-shell teal">
        <header className="topbar teal-bar">
          <button type="button" onClick={() => navigate(-1)}><Icon name="back" size={22} color="#fff" /></button>
          <BrandMark title="Stage Update" />
          <span style={{ width: 40 }} />
        </header>
        <div className="empty">Stage nahi mili</div>
      </div>
    );
  }

  const locked = !canEditStage(user, stage);

  return (
    <div className="app-shell teal">
      <header className="topbar teal-bar">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="back" size={22} color="#fff" />
        </button>
        <BrandMark title="Stage Update" />
        <span style={{ width: 40 }} />
      </header>

      <div className="update-pad">
        <h1>{stageLabel(stage)}</h1>
        <p className="owner-line">Owner team: {stage.owner}</p>

        <div className="field-label">STATUS</div>
        <div className="status-pills">
          {STAGE_STATUS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={locked}
              className={`status-pill ${status === s ? s.replace(' ', '-').toLowerCase() : ''}`}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="field-label">NOTES / REMARKS</div>
        <textarea
          className="notes-box"
          value={notes}
          disabled={locked}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Site pe kya hua, yahan likhein"
        />

        <div className="field-label">PROOF PHOTO</div>
        <button
          type="button"
          className="photo-drop"
          disabled={locked || !!busy}
          onClick={() => camRef.current?.click()}
        >
          {preview || existingUrls[0] ? (
            <img src={preview || existingUrls[0]} alt="Proof" />
          ) : (
            <span className="cam-hole" />
          )}
        </button>
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
        <input ref={galRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPick} />
        {existingUrls.length > 1 && (
          <div className="thumb-row">
            {existingUrls.map((u) => (
              <img key={u} src={u} alt="" />
            ))}
          </div>
        )}
        {!locked && (
          <button type="button" className="linkish" onClick={() => galRef.current?.click()}>
            {busy === 'photo' ? 'Photo ready kar rahe hain…' : 'Gallery se image upload karein'}
          </button>
        )}

        <div className="field-label">LOCATION</div>
        <button type="button" className="loc-btn" disabled={locked || !!busy} onClick={refreshGps}>
          <Icon name="pin" size={22} color="#1578c8" />
          <span>{busy === 'gps' ? 'GPS…' : 'Location refresh karein'}</span>
        </button>
        {location && <p className="loc-meta">{formatLoc(location)}</p>}

        {(stage.key === 'quotation_sent' || stage.key === 'vendor') && (
          <QuoteEditor
            lead={lead}
            user={user}
            locked={locked}
            onSaved={(updated) => {
              setLead(updated);
              reload?.();
            }}
          />
        )}

        {error && <div className="err">{error}</div>}
        {ok && <div className="ok">{ok}</div>}
        {locked && <p className="lock-hint">Sirf {stage.owner} team update kar sakti hai</p>}

        <button
          className="submit-teal"
          type="button"
          disabled={locked || !!busy}
          onClick={submit}
        >
          {busy === 'save' ? 'Saving…' : 'Update Submit Karein'}
        </button>
      </div>
    </div>
  );
}
