export const PIPELINE = [
  { key: 'reg', label: 'Consumer Registration', owner: 'Sales', icon: 'search' },
  { key: 'app', label: 'Consumer Application', owner: 'Sales', icon: 'clipboard' },
  { key: 'feas', label: 'Discom Feasibility', owner: 'Site Survey', icon: 'form' },
  { key: 'vendor', label: 'Consumer Vendor Selection', owner: 'Sales', icon: 'checkform' },
  { key: 'agreement', label: 'Vendor Upload Agreement', owner: 'Accounts', icon: 'hourglass' },
  { key: 'install', label: 'Vendor Installation', owner: 'Installation', icon: 'tools' },
  { key: 'inspection', label: 'Discom Inspection', owner: 'Installation', icon: 'plug' },
  { key: 'commission', label: 'Project Commissioning', owner: 'Installation', icon: 'handshake' },
  { key: 'subsidyreq', label: 'Consumer Subsidy Request', owner: 'Accounts', icon: 'chart' },
  { key: 'subsidydisb', label: 'Subsidy Disbursal', owner: 'Accounts', icon: 'money' },
];

export const SOLAR_PIPELINE = [
  { key: 'lead_captured', label: 'Lead Captured', owner: 'Sales', icon: 'search' },
  { key: 'site_survey_scheduled', label: 'Site Survey Scheduled', owner: 'Sales', icon: 'clipboard' },
  { key: 'survey_completed', label: 'Site Survey Completed', owner: 'Site Survey', icon: 'form' },
  { key: 'quotation_sent', label: 'Quotation Sent', owner: 'Sales', icon: 'checkform' },
  { key: 'docs_verified', label: 'Documents Verified', owner: 'Accounts', icon: 'hourglass' },
  { key: 'discom_applied', label: 'DISCOM Application', owner: 'Accounts', icon: 'chart' },
  { key: 'material_dispatched', label: 'Material Dispatched', owner: 'Installation', icon: 'box' },
  { key: 'installation_in_progress', label: 'Installation In Progress', owner: 'Installation', icon: 'tools' },
  { key: 'net_metering_pending', label: 'Net Metering Pending', owner: 'Installation', icon: 'plug' },
  { key: 'commissioned', label: 'Commissioned', owner: 'Installation', icon: 'handshake' },
  { key: 'subsidy_disbursed', label: 'Subsidy Disbursed', owner: 'Accounts', icon: 'money' },
];

export const STAGE_ALIAS = {
  lead_captured: 'reg',
  site_survey_scheduled: 'app',
  survey_completed: 'feas',
  quotation_sent: 'vendor',
  docs_verified: 'agreement',
  discom_applied: 'feas',
  material_dispatched: 'install',
  installation_in_progress: 'install',
  net_metering_pending: 'inspection',
  commissioned: 'commission',
  subsidy_disbursed: 'subsidydisb',
};

export const PIPELINE_MAP = Object.fromEntries(
  [...PIPELINE, ...SOLAR_PIPELINE].map((s) => [s.key, s]),
);
export const STAGE_STATUS = ['Pending', 'In Progress', 'Completed'];

export const TILES = [
  { key: 'all', label: 'All Projects', icon: 'grid' },
  { key: 'reg', label: 'Registration', icon: 'search' },
  { key: 'app', label: 'Application', icon: 'clipboard' },
  { key: 'feas', label: 'Feasibility', icon: 'form' },
  { key: 'vendor', label: 'Vendor Select', icon: 'checkform' },
  { key: 'agreement', label: 'Agreement', icon: 'hourglass' },
  { key: 'install', label: 'Installation', icon: 'tools' },
  { key: 'inspection', label: 'Inspection', icon: 'plug' },
  { key: 'commission', label: 'Commissioning', icon: 'handshake' },
  { key: 'subsidyreq', label: 'Subsidy Request', icon: 'chart' },
  { key: 'subsidydisb', label: 'Subsidy', icon: 'money' },
  { key: 'lost', label: 'Deal Lost', icon: 'lost' },
];

export const QUICK_CHIPS = [
  { id: 'all', label: 'All Projects' },
  { id: 'today_surveys', label: 'Today Site Surveys', stageKey: 'feas' },
  { id: 'utility', label: 'Utility Visits', stageKey: 'inspection' },
  { id: 'followup', label: 'Visit Follow-Up', stageKey: 'app' },
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

export function canonicalStageKey(stageOrKey) {
  const key = typeof stageOrKey === 'string' ? stageOrKey : stageOrKey?.key;
  if (!key) return '';
  return STAGE_ALIAS[key] || key;
}

export function currentStageKey(lead) {
  return canonicalStageKey(currentStage(lead));
}

export function countByTile(leads, tileKey) {
  if (tileKey === 'all') return leads.length;
  if (tileKey === 'lost') return leads.filter(isLost).length;
  return leads.filter((l) => currentStageKey(l) === tileKey && !isLost(l)).length;
}

export function filterByTile(leads, tileKey) {
  if (tileKey === 'all') return leads;
  if (tileKey === 'lost') return leads.filter(isLost);
  return leads.filter((l) => currentStageKey(l) === tileKey && !isLost(l));
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
