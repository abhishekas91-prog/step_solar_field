import { COMPANY, loadLogoDataUri } from './documents';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inr(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

function num(n, d = 0) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('en-IN', { maximumFractionDigits: d });
}

function pct(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${v}%`;
}

export async function renderDesignProposalHtml({ lead, design, form, result, viewImage }) {
  const logoSrc = (await loadLogoDataUri()) || COMPANY.logoSrc;
  const sys = result?.system || {};
  const prod = result?.production || {};
  const fin = result?.financials || {};
  const losses = result?.losses || {};
  const panel = result?.panel || {};
  const inv = result?.inverter || {};
  const elec = result?.electrical || {};
  const bom = result?.bom || {};
  const loc = design?.location || {};
  const months = prod.months || [];
  const monthly = prod.monthly_kwh || [];
  const strings = (elec.strings || []).slice(0, 16);
  const items = bom.items || [];
  const cash = (fin.cashflows || []).slice(0, 10);
  return `
    <div class="dp">
      <table>
        <tr>
          <td class="noB center" style="width:90px"><img class="logo" src="${logoSrc}" alt="Step Solar"></td>
          <td class="noB">
            <div class="big">STEP SOLAR ENERGY PVT. LTD.</div>
            <div class="small">${esc(COMPANY.branchAddress)} · ${esc(COMPANY.branchPhone)} · ${esc(COMPANY.email)}</div>
            <div class="small">GSTIN ${esc(COMPANY.gstin)} · ${esc(COMPANY.website)}</div>
          </td>
          <td class="noB right">
            <div class="midtitle">REMOTE PV DESIGN</div>
            <div class="small">${new Date().toLocaleDateString('en-IN')}</div>
          </td>
        </tr>
      </table>

      <div class="sectionbar">CUSTOMER &amp; SITE</div>
      <table>
        <tr><td class="label">Customer</td><td>${esc(lead?.full_name || design?.name || '—')}</td><td class="label">Phone</td><td>${esc(lead?.phone || '—')}</td></tr>
        <tr><td class="label">Site</td><td colspan="3">${esc([lead?.city, lead?.state, lead?.pincode].filter(Boolean).join(', ') || design?.address || '—')}</td></tr>
        <tr><td class="label">GPS</td><td>${loc.lat != null ? `${Number(loc.lat).toFixed(5)}, ${Number(loc.lng).toFixed(5)}` : '—'}</td><td class="label">Roof</td><td>${esc(form.length_m)} × ${esc(form.width_m)} m · tilt ${esc(form.tilt)}° · az ${esc(form.azimuth)}°</td></tr>
        <tr><td class="label">Setback / orient</td><td>${esc(form.setback_m)} m · ${esc(form.orientation)}</td><td class="label">Shade notes</td><td>${esc(form.notes || '—')}</td></tr>
      </table>

      <div class="sectionbar">3D ROOFTOP LAYOUT</div>
      ${viewImage ? `<div class="center" style="padding:6px"><img class="view3d" src="${viewImage}" alt="3D solar view"></div>` : ''}
      <div class="small center italic" style="padding:2px 6px">Orbit view of surveyed roof with auto-filled modules. Indicative — not a structural CAD model.</div>

      <div class="sectionbar">SYSTEM SUMMARY</div>
      <table>
        <tr>
          <td class="center"><b>${esc(sys.dc_kw)}</b><br>kWp DC</td>
          <td class="center"><b>${esc(sys.panel_count)}</b><br>modules</td>
          <td class="center"><b>${esc(sys.ac_kw)}</b><br>kW AC</td>
          <td class="center"><b>${esc(sys.coverage_pct)}%</b><br>coverage</td>
        </tr>
        <tr>
          <td class="center"><b>${num(prod.year1_kwh)}</b><br>kWh year-1</td>
          <td class="center"><b>${esc(prod.specific_yield)}</b><br>kWh/kWp</td>
          <td class="center"><b>${esc(fin.payback_years ?? '—')}</b><br>yr payback</td>
          <td class="center"><b>${esc(prod.co2_tons_year)}</b><br>t CO₂ / yr</td>
        </tr>
      </table>

      <div class="sectionbar">EQUIPMENT</div>
      <table>
        <tr><td class="label">Module</td><td>${esc(panel.brand)} ${esc(panel.model)} · ${esc(panel.watt)} W · ${esc(panel.efficiency)}%</td></tr>
        <tr><td class="label">Inverter</td><td>${esc(inv.brand)} ${esc(inv.model)} × ${esc(inv.count || 1)} · ${esc(inv.total_ac_kw)} kW AC · ${esc(inv.efficiency)}%</td></tr>
        <tr><td class="label">Strings</td><td>${esc(elec.string_count)} strings · series target ${esc(elec.series_target)} · max Voc series ${esc(elec.max_series)}</td></tr>
        <tr><td class="label">Roof area</td><td>${esc(sys.roof_area_m2)} m² · DC/AC ${esc(sys.dc_ac_ratio)}</td></tr>
      </table>

      <div class="sectionbar">LOSSES / PR</div>
      <table>
        <tr>
          <td>Soiling ${pct(losses.soiling)}</td>
          <td>Shade ${pct(losses.shade)}</td>
          <td>Mismatch ${pct(losses.mismatch)}</td>
          <td>Wiring ${pct(losses.wiring)}</td>
        </tr>
        <tr>
          <td>Inverter ${pct(losses.inverter)}</td>
          <td>Availability ${pct(losses.availability)}</td>
          <td>Temp ${pct(losses.temperature)}</td>
          <td><b>PR ${pct(losses.pr)}</b></td>
        </tr>
      </table>

      <div class="sectionbar">MONTHLY GENERATION (kWh)</div>
      <table>
        <tr>${months.map((m) => `<td class="center bold">${esc(m)}</td>`).join('')}</tr>
        <tr>${monthly.map((v) => `<td class="center">${num(v)}</td>`).join('')}</tr>
      </table>

      <div class="sectionbar">INVESTMENT</div>
      <table>
        <tr><td class="label">CAPEX</td><td>${inr(fin.capex)}</td><td class="label">Subsidy</td><td>${inr(fin.subsidy)}</td></tr>
        <tr><td class="label">Net capex</td><td>${inr(fin.net_capex)}</td><td class="label">Y1 savings</td><td>${inr(fin.savings_y1)}</td></tr>
        <tr><td class="label">IRR</td><td>${fin.irr != null ? `${(fin.irr * 100).toFixed(1)}%` : '—'}</td><td class="label">LCOE</td><td>${fin.lcoe != null ? `₹ ${fin.lcoe}/kWh` : '—'}</td></tr>
        <tr><td class="label">NPV</td><td>${inr(fin.npv)}</td><td class="label">25-yr ROI</td><td>${esc(fin.roi_25)}</td></tr>
        <tr><td class="label">Lifetime kWh</td><td>${num(prod.lifetime_kwh)}</td><td class="label">Trees equiv.</td><td>${esc(prod.trees_equiv)}</td></tr>
      </table>

      <div class="sectionbar">BILL OF MATERIALS</div>
      <table>
        <tr class="bold"><td>Item</td><td>Qty</td><td class="right">Amount</td></tr>
        ${items.map((i) => `<tr><td>${esc(i.category)} · ${esc(i.sku)}</td><td>${esc(i.qty)} ${esc(i.unit)}</td><td class="right">${inr(i.total)}</td></tr>`).join('')}
        <tr class="bold"><td colspan="2">Material</td><td class="right">${inr(bom.material)}</td></tr>
      </table>

      <div class="sectionbar">STRING PLAN</div>
      <table>
        <tr class="bold"><td>ID</td><td>Panels</td><td>Voc</td><td>Vmp</td><td>W</td><td>MPPT</td></tr>
        ${strings.map((s) => `<tr><td>${esc(s.id)}</td><td>${esc(s.panels)}</td><td>${esc(s.voc)}</td><td>${esc(s.vmp)}</td><td>${num(s.power_w)}</td><td>${esc(s.mppt)}</td></tr>`).join('') || '<tr><td colspan="6">—</td></tr>'}
      </table>

      <div class="sectionbar">CASHFLOW (first 10 years)</div>
      <table>
        <tr class="bold"><td>Year</td><td>kWh</td><td class="right">Net</td><td class="right">Cumulative</td></tr>
        ${cash.map((c) => `<tr><td>${esc(c.year)}</td><td>${num(c.kwh)}</td><td class="right">${inr(c.net)}</td><td class="right">${inr(c.cumulative)}</td></tr>`).join('')}
      </table>

      <p class="prose">Indicative remote design from field GPS + roof measure, typical-year climate and IEC-style derates. Not a substitute for on-site structural survey or DISCOM interconnection. Generated by Step Solar Field ${new Date().toISOString().slice(0, 10)}.</p>
    </div>
  `;
}

export const DESIGN_PRINT_CSS = `
  @page{ size: A4; margin: 8mm; }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;background:#fff;color:#000;}
  .docwrap{background:#fff;padding:0;}
  .doc2{border:1.5px solid #0e5a9a;font-family:Calibri,Arial,sans-serif;color:#000;font-size:10px;}
  .doc2 table{width:100%;border-collapse:collapse;}
  .doc2 td{border:1px solid #94a3b8;padding:3px 5px;vertical-align:middle;font-size:10px;line-height:1.3;}
  .doc2 .noB{border:none;}
  .doc2 .center{text-align:center;}
  .doc2 .right{text-align:right;}
  .doc2 .bold{font-weight:700;}
  .doc2 .big{font-size:14px;font-weight:800;color:#0e5a9a;}
  .doc2 .midtitle{font-size:12px;font-weight:800;color:#1578c8;}
  .doc2 .small{font-size:9px;}
  .doc2 img.logo{width:56px;height:auto;display:block;margin:0 auto;}
  .doc2 img.view3d{width:100%;max-height:210px;object-fit:cover;border:1px solid #cbd5e1;}
  .doc2 .sectionbar{font-size:10px;font-weight:800;padding:4px 6px;background:#1578c8;color:#fff;letter-spacing:.04em;}
  .doc2 .italic{font-style:italic;}
  .doc2 .label{font-weight:700;width:118px;background:#f1f5f9;}
  .doc2 .prose{font-size:9px;line-height:1.35;padding:6px;}
  .doc2 p{margin:0;}
`;
