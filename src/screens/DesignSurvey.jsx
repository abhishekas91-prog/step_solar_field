import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Icon } from '../lib/icons';
import BrandMark from '../components/BrandMark';
import Solar3DView from '../components/Solar3DView';
import { goAppBack } from '../lib/useBackButton';
import { api } from '../lib/api';
import { loadLogoDataUri } from '../lib/documents';
import { DESIGN_PRINT_CSS, renderDesignProposalHtml } from '../lib/designProposal';

function metersOffset(lat, lng, northM, eastM) {
  const dLat = northM / 111320;
  const dLng = eastM / (111320 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

function rectangle(lat, lng, lengthM, widthM) {
  const a = metersOffset(lat, lng, 0, 0);
  const b = metersOffset(lat, lng, 0, lengthM);
  const c = metersOffset(lat, lng, widthM, lengthM);
  const d = metersOffset(lat, lng, widthM, 0);
  return [a, b, c, d];
}

function inr(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

export default function DesignSurvey({ leads }) {
  const { id } = useParams();
  const cached = (leads || []).find((l) => l.id === id);
  const [lead, setLead] = useState(cached || null);
  const [design, setDesign] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const viewRef = useRef(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [form, setForm] = useState({
    length_m: 12,
    width_m: 8,
    tilt: 18,
    azimuth: 180,
    setback_m: 0.4,
    orientation: 'portrait',
    tank_height_m: 0,
    notes: '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const full = await api.getLead(id).catch(() => cached);
        if (!cancelled && full) setLead(full);
        let d = null;
        const list = await api.designs(id);
        if (list[0]) d = list[0];
        else {
          d = await api.createDesign({
            lead_id: id,
            name: `${full?.full_name || 'Site'} rooftop`,
            address: [full?.city, full?.state, full?.pincode].filter(Boolean).join(', '),
            annual_bill_kwh: full?.monthly_bill ? Math.round((Number(full.monthly_bill) * 12) / 8.5) : 7200,
          });
        }
        if (cancelled || !d) return;
        setDesign(d);
        setResult(d.result || null);
        if (d.notes) setForm((f) => ({ ...f, notes: d.notes }));
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function pinGps() {
    if (!navigator.geolocation) {
      setError('GPS not available');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (!design) return;
        const loc = { lat: p.coords.latitude, lng: p.coords.longitude, zoom: 19 };
        const next = { ...design, location: loc };
        setDesign(next);
        api.saveDesign(design.id, next).catch(() => {});
      },
      () => setError('GPS denied'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function run() {
    if (!design) return;
    setBusy(true);
    setError('');
    try {
      const loc = design.location || { lat: 25.5941, lng: 85.1376, zoom: 19 };
      const points = rectangle(loc.lat, loc.lng, Number(form.length_m), Number(form.width_m));
      const roof = {
        id: 'roof-field-1',
        name: 'Surveyed roof',
        tilt: Number(form.tilt),
        azimuth: Number(form.azimuth),
        setback_m: Number(form.setback_m),
        row_gap_m: 0.02,
        col_gap_m: 0.02,
        orientation: form.orientation,
        points,
      };
      const obstructions = Number(form.tank_height_m) > 0
        ? [{ id: 'obs-tank', type: 'water-tank', height_m: Number(form.tank_height_m), lat: loc.lat, lng: loc.lng }]
        : [];
      const payload = {
        ...design,
        location: loc,
        roofs: [roof],
        obstructions,
        notes: form.notes,
        survey: {
          length_m: Number(form.length_m),
          width_m: Number(form.width_m),
          captured_at: new Date().toISOString(),
        },
      };
      await api.saveDesign(design.id, payload);
      const r = await api.simulateDesign(design.id, payload);
      setDesign(r.design);
      setResult(r.result);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function savePdf() {
    if (!result) return;
    setPdfBusy(true);
    setError('');
    try {
      await loadLogoDataUri();
      const viewImage = viewRef.current?.snapshot?.() || '';
      const html = await renderDesignProposalHtml({ lead, design, form, result, viewImage });
      const { presentPdf } = await import('../lib/pdf');
      const name = String(lead?.full_name || 'site').replace(/[^\w.-]+/g, '_');
      presentPdf({
        html,
        filename: `StepSolar-PVDesign-${name}.pdf`,
        lead,
        docType: 'pv-design',
        docNo: design?.id || 'design',
        css: DESIGN_PRINT_CSS,
        autoSave: true,
      });
    } catch (e) {
      setError(e.message || 'PDF nahi bani');
    } finally {
      setPdfBusy(false);
    }
  }

  const sys = result?.system;
  const prod = result?.production;
  const fin = result?.financials;
  const panel = result?.panel;
  const inv = result?.inverter;
  const losses = result?.losses;
  const bom = result?.bom;

  return (
    <div className="app-shell teal">
      <header className="topbar teal-bar">
        <button type="button" onClick={() => goAppBack(`/leads/${id}`)} aria-label="Back">
          <Icon name="back" size={22} color="#fff" />
        </button>
        <BrandMark title="PV Design" />
        <span style={{ width: 40 }} />
      </header>

      <div className="detail-pad">
        <div className="contact-card">
          <h2>{lead?.full_name || 'Site'}</h2>
          <p>{[lead?.city, lead?.state].filter(Boolean).join(', ') || design?.address || '—'}</p>
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {design?.location ? `${design.location.lat.toFixed(5)}, ${design.location.lng.toFixed(5)}` : 'Pin GPS before layout'}
          </p>
        </div>

        {error ? <div className="err">{error}</div> : null}

        <button className="update-btn" type="button" onClick={pinGps}>Pin GPS</button>

        <div className="section-label">ROOF MEASURE</div>
        <div className="field"><label>Length (m)</label>
          <input type="number" value={form.length_m} onChange={(e) => set('length_m', e.target.value)} />
        </div>
        <div className="field"><label>Width (m)</label>
          <input type="number" value={form.width_m} onChange={(e) => set('width_m', e.target.value)} />
        </div>
        <div className="field"><label>Tilt °</label>
          <input type="number" value={form.tilt} onChange={(e) => set('tilt', e.target.value)} />
        </div>
        <div className="field"><label>Azimuth ° (180 = south)</label>
          <input type="number" value={form.azimuth} onChange={(e) => set('azimuth', e.target.value)} />
        </div>
        <div className="field"><label>Setback (m)</label>
          <input type="number" step="0.05" value={form.setback_m} onChange={(e) => set('setback_m', e.target.value)} />
        </div>
        <div className="field"><label>Module orientation</label>
          <select value={form.orientation} onChange={(e) => set('orientation', e.target.value)}>
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>
        <div className="field"><label>Water tank / tree height (m)</label>
          <input type="number" value={form.tank_height_m} onChange={(e) => set('tank_height_m', e.target.value)} />
        </div>
        <div className="field"><label>Shade / structure notes</label>
          <textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Parapet 0.6m, tank NE, south clear…" />
        </div>

        <button className="update-btn" type="button" disabled={busy || !design} onClick={run}>
          {busy ? 'Simulating…' : 'Layout + simulate'}
        </button>

        {sys && (
          <>
            <div className="section-label">3D SOLAR VIEW</div>
            <Solar3DView ref={viewRef} form={form} result={result} playing />

            <div className="contact-card" style={{ marginTop: 16 }}>
              <h2>{sys.dc_kw} kWp</h2>
              <p>{sys.panel_count} modules · {sys.coverage_pct}% coverage · {sys.ac_kw} kW AC</p>
              {panel && <p>{panel.brand} {panel.model} · {panel.watt} W</p>}
              {inv && <p>{inv.brand} {inv.model} × {inv.count || 1}</p>}
              {prod && <p>{prod.year1_kwh} kWh/yr · {prod.specific_yield} kWh/kWp · PR {losses?.pr}%</p>}
              {fin && <p>Payback {fin.payback_years ?? '—'} yr · CAPEX {inr(fin.capex)}</p>}
              {fin && <p>Net {inr(fin.net_capex)} · Y1 save {inr(fin.savings_y1)}</p>}
              {prod && <p>CO₂ {prod.co2_tons_year} t/yr · {prod.trees_equiv} trees</p>}
            </div>

            {prod?.months && (
              <div className="contact-card" style={{ marginTop: 12 }}>
                <h3 style={{ fontSize: 14, marginBottom: 8 }}>Monthly kWh</h3>
                <div className="month-grid">
                  {prod.months.map((m, i) => (
                    <div key={m} className="month-cell"><span>{m}</span><em>{prod.monthly_kwh?.[i] ?? '—'}</em></div>
                  ))}
                </div>
              </div>
            )}

            {bom?.items && (
              <div className="contact-card" style={{ marginTop: 12 }}>
                <h3 style={{ fontSize: 14, marginBottom: 8 }}>Bill of materials</h3>
                {bom.items.slice(0, 8).map((it) => (
                  <p key={it.sku} className="muted" style={{ fontSize: 12 }}>{it.category}: {it.qty} {it.unit} · {inr(it.total)}</p>
                ))}
              </div>
            )}

            <button className="update-btn" type="button" disabled={pdfBusy} onClick={savePdf}>
              {pdfBusy ? 'Making PDF…' : 'Save detailed PDF'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
