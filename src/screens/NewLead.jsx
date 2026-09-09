import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../lib/icons';
import BrandMark from '../components/BrandMark';
import { api } from '../lib/api';
import { goAppBack } from '../lib/useBackButton';
import { compressImage, captureGps } from '../lib/photo';
import { CITIES, PROPERTY_TYPES, ROOF_TYPES, STATES, TIMELINES } from '../lib/pipeline';

const empty = {
  full_name: '',
  phone: '',
  email: '',
  state: 'Bihar',
  city: 'Patna',
  pincode: '',
  property_type: 'Residential',
  monthly_bill: '',
  roof_type: 'Medium Space (300-500 sq. ft.)',
  timeline: 'Immediately',
  source: 'Field Agent',
  notes: '',
};

export default function NewLead({ reload }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [location, setLocation] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const camRef = useRef(null);
  const galRef = useRef(null);

  useEffect(() => {
    captureGps().then(setLocation).catch(() => {});
  }, []);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

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
      setLocation(await captureGps());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  async function submit(e) {
    e.preventDefault();
    const phone = String(form.phone).replace(/\D/g, '');
    if (phone.length !== 10) {
      setError('10 digit mobile number likhein');
      return;
    }
    if (!form.full_name.trim()) {
      setError('Customer name zaroori hai');
      return;
    }
    setBusy('save');
    setError('');
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
      const payload = {
        full_name: form.full_name.trim(),
        phone,
        email: form.email.trim() || `field+${phone}@stepsolar.in`,
        state: form.state,
        city: form.city,
        pincode: form.pincode.trim(),
        property_type: form.property_type,
        monthly_bill: Number(form.monthly_bill) || 0,
        roof_type: form.roof_type,
        timeline: form.timeline,
        source: 'Field Agent',
        notes: form.notes.trim(),
      };
      const created = await api.createLead(payload);
      const stages = created.stages || [];
      const first = stages[0];
      if (first && loc) {
        try {
          const next = stages.map((s, i) => (i === 0 ? { ...s, location: loc } : s));
          await api.updateLead(created.id, { stages: next });
        } catch {
          /* role may not own first stage — lead still created */
        }
      }
      if (file && first) {
        await api.uploadDoc(created.id, first.key, file);
      }
      reload?.();
      navigate(`/leads/${created.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  const cities = CITIES[form.state] || [];

  return (
    <div className="app-shell teal">
      <header className="topbar teal-bar">
        <button type="button" onClick={() => goAppBack('/')} aria-label="Back">
          <Icon name="back" size={22} color="#fff" />
        </button>
        <BrandMark title="New Lead" />
        <span style={{ width: 40 }} />
      </header>

      <form className="update-pad" onSubmit={submit}>
        <h1>Lead capture</h1>
        <p className="owner-line">Site se naya customer add karein</p>

        <div className="field">
          <label>Customer name</label>
          <input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required />
        </div>
        <div className="field">
          <label>Phone</label>
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)} inputMode="numeric" required />
        </div>
        <div className="field">
          <label>Email (optional)</label>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div className="field">
          <label>State</label>
          <select
            value={form.state}
            onChange={(e) => {
              const state = e.target.value;
              setForm((f) => ({ ...f, state, city: (CITIES[state] || [''])[0] }));
            }}
          >
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>City</label>
          <select value={form.city} onChange={(e) => set('city', e.target.value)}>
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Pincode</label>
          <input value={form.pincode} onChange={(e) => set('pincode', e.target.value)} inputMode="numeric" />
        </div>
        <div className="field">
          <label>Property</label>
          <select value={form.property_type} onChange={(e) => set('property_type', e.target.value)}>
            {PROPERTY_TYPES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Monthly bill (Rs)</label>
          <input value={form.monthly_bill} onChange={(e) => set('monthly_bill', e.target.value)} inputMode="numeric" />
        </div>
        <div className="field">
          <label>Roof</label>
          <select value={form.roof_type} onChange={(e) => set('roof_type', e.target.value)}>
            {ROOF_TYPES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Timeline</label>
          <select value={form.timeline} onChange={(e) => set('timeline', e.target.value)}>
            {TIMELINES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>

        <div className="field-label">SITE PHOTO</div>
        <button type="button" className="photo-drop" onClick={() => camRef.current?.click()}>
          {preview ? <img src={preview} alt="Site" /> : <span className="cam-hole" />}
        </button>
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
        <input ref={galRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPick} />
        <button type="button" className="linkish" onClick={() => galRef.current?.click()}>
          {preview ? 'Photo change karein' : 'Gallery se image upload karein'}
        </button>

        <div className="field-label">LOCATION</div>
        <button type="button" className="loc-btn" disabled={!!busy} onClick={refreshGps}>
          <Icon name="pin" size={22} color="#1578c8" />
          <span>{busy === 'gps' ? 'GPS…' : 'Location refresh karein'}</span>
        </button>
        {location && (
          <p className="loc-meta">
            {Number(location.lat).toFixed(5)}, {Number(location.lng).toFixed(5)}
            {location.accuracy != null ? ` (±${Math.round(location.accuracy)}m)` : ''}
          </p>
        )}

        {error && <div className="err">{error}</div>}
        <button className="submit-teal" disabled={!!busy} type="submit">
          {busy === 'save' ? 'Saving…' : 'Lead Create Karein'}
        </button>
      </form>
    </div>
  );
}
