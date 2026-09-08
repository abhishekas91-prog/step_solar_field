export const PIPELINE = [
  { key: 'lead_captured', label: 'New Leads', owner: 'Sales', icon: 'search' },
  { key: 'site_survey_scheduled', label: 'New Site Survey', owner: 'Sales', icon: 'clipboard' },
  { key: 'survey_completed', label: 'Site Survey Pending', owner: 'Site Survey', icon: 'form' },
  { key: 'quotation_sent', label: 'Site Survey Completed', owner: 'Sales', icon: 'checkform' },
  { key: 'docs_verified', label: 'Estimation Requested', owner: 'Accounts', icon: 'hourglass' },
  { key: 'discom_applied', label: 'Estimation Shared', owner: 'Accounts', icon: 'chart' },
  { key: 'material_dispatched', label: 'Material Dispatched', owner: 'Installation', icon: 'box' },
  { key: 'installation_in_progress', label: 'Installation', owner: 'Installation', icon: 'tools' },
  { key: 'net_metering_pending', label: 'Utility Visits', owner: 'Installation', icon: 'plug' },
  { key: 'commissioned', label: 'Deal', owner: 'Installation', icon: 'handshake' },
  { key: 'subsidy_disbursed', label: 'Subsidy', owner: 'Accounts', icon: 'money' },
];

export const PIPELINE_MAP = Object.fromEntries(PIPELINE.map((s) => [s.key, s]));
export const STAGE_STATUS = ['Pending', 'In Progress', 'Completed'];

export const TILES = [
  { key: 'lead_captured', label: 'New Leads', icon: 'search' },
  { key: 'site_survey_scheduled', label: 'New Site Survey', icon: 'clipboard' },
  { key: 'survey_completed', label: 'Site Survey Pending', icon: 'form' },
  { key: 'quotation_sent', label: 'Site Survey Completed', icon: 'checkform' },
  { key: 'docs_verified', label: 'Estimation Requested', icon: 'hourglass' },
  { key: 'discom_applied', label: 'Estimation Shared', icon: 'chart' },
  { key: 'commissioned', label: 'Deal', icon: 'handshake' },
  { key: 'lost', label: 'Deal Lost', icon: 'lost' },
];

export const QUICK_CHIPS = [
  { id: 'today_surveys', label: 'Today Site Surveys', stageKey: 'site_survey_scheduled' },
  { id: 'utility', label: 'Utility Visits', stageKey: 'net_metering_pending' },
  { id: 'followup', label: 'Visit Follow-Up', stageKey: 'survey_completed' },
];

export const PROPERTY_TYPES = ['Residential', 'Commercial / Office', 'Industrial / Factory', 'Agricultural / Pump'];
export const ROOF_TYPES = [
  'Rented Roof / No Roof',
  'Small Space (100-200 sq. ft.)',
  'Medium Space (300-500 sq. ft.)',
  'Large Open Roof (500+ sq. ft.)',
];
export const TIMELINES = ['Immediately', 'Within 1-2 months', 'Sirf jankari aur quotation chahiye'];
export const STATES = ['Bihar', 'Uttar Pradesh', 'Jharkhand'];
export const CITIES = {
  Bihar: ['Patna', 'Ara', 'Muzaffarpur', 'Gaya', 'Bhagalpur', 'Darbhanga', 'Purnia', 'Motihari', 'Nalanda'],
  'Uttar Pradesh': ['Varanasi', 'Ghazipur', 'Ballia', 'Gorakhpur', 'Lucknow', 'Prayagraj', 'Ayodhya'],
  Jharkhand: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh'],
};

export function teamLabel(role) {
  if (!role) return '';
  if (role === 'Admin') return 'Admin';
  return `${role} team`;
}

export function canEditStage(user, stage) {
  if (!user || !stage) return false;
  if (user.role === 'Admin') return true;
  return stage.owner === user.role;
}

export function canQuotation(role) {
  return role === 'Admin' || role === 'Sales' || role === 'Accounts';
}

export function canInvoice(role) {
  return role === 'Admin' || role === 'Accounts' || role === 'Sales';
}

export function invoiceOutstanding(inv) {
  if (!inv) return 0;
  return Math.max(0, Number(inv.grandTotal || 0) - Number(inv.paidAmount || 0));
}

export function pendingForRole(lead, role) {
  const stages = lead?.stages || [];
  if (!role) return 0;
  if (role === 'Admin') return stages.filter((s) => s.status !== 'Completed').length;
  return stages.filter((s) => s.owner === role && s.status !== 'Completed').length;
}

export function statusTone(status) {
  if (status === 'Completed') return 'done';
  if (status === 'In Progress') return 'active';
  return 'idle';
}

export function formatPhone(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) return `${d.slice(0, 5)} ${d.slice(5)}`;
  return phone || '';
}

export function formatLoc(loc) {
  if (!loc || loc.lat == null || loc.lng == null) return '';
  const acc = loc.accuracy != null ? ` (±${Math.round(loc.accuracy)}m)` : '';
  return `${Number(loc.lat).toFixed(5)}, ${Number(loc.lng).toFixed(5)}${acc}`;
}

export function stageLabel(stage) {
  if (!stage) return '';
  return stage.label || PIPELINE_MAP[stage.key]?.label || stage.key;
}

export const STATUS_CYCLE = {
  Pending: 'In Progress',
  'In Progress': 'Completed',
  Completed: 'Pending',
};

export function currentStage(lead) {
  const stages = lead?.stages || [];
  const active = stages.find((s) => s.status === 'In Progress');
  if (active) return active;
  const lastDone = [...stages].reverse().find((s) => s.status === 'Completed');
  return lastDone || stages[0] || null;
}

export function progressPct(lead) {
  const stages = lead?.stages || [];
  if (!stages.length) return 0;
  const done = stages.filter((s) => s.status === 'Completed').length;
  return Math.round((done / stages.length) * 100);
}

export function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function isLost(lead) {
  const notes = String(lead?.notes || '').toLowerCase();
  return notes.includes('[lost]') || notes.includes('deal lost') || lead?.quotation?.status === 'Rejected';
}

export function matchesQuery(lead, q) {
  if (!q) return true;
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = [lead.full_name, lead.phone, lead.email, lead.code, lead.city, lead.state]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(s);
}

export function countByTile(leads, tileKey) {
  if (tileKey === 'lost') return leads.filter(isLost).length;
  return leads.filter((l) => currentStage(l)?.key === tileKey && !isLost(l)).length;
}

export function filterByTile(leads, tileKey) {
  if (tileKey === 'lost') return leads.filter(isLost);
  return leads.filter((l) => currentStage(l)?.key === tileKey && !isLost(l));
}

export function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'SS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
