const KEY_TOKEN = 'ss_field_token';
const KEY_USER = 'ss_field_user';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export function getToken() {
  return localStorage.getItem(KEY_TOKEN);
}

export function setSession(token, user) {
  if (token) localStorage.setItem(KEY_TOKEN, token);
  if (user) localStorage.setItem(KEY_USER, JSON.stringify(user));
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(KEY_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_USER);
}

async function request(path, { method = 'GET', body, formData } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });
  } catch {
    throw new Error('Cannot reach the server. Check your connection.');
  }

  if (res.status === 401) {
    clearSession();
    throw Object.assign(new Error('Session expired — please sign in again.'), { status: 401 });
  }

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (typeof j.detail === 'string') msg = j.detail;
      else if (Array.isArray(j.detail)) msg = j.detail.map((d) => d.msg || d).join('; ');
      else if (j.message) msg = j.message;
    } catch {
      /* keep default */
    }
    throw Object.assign(new Error(msg), { status: res.status });
  }

  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me'),
  leads: (limit = 2000) => request(`/crm/leads?limit=${limit}`),
  async getLead(id) {
    try {
      return await request(`/crm/leads/${id}`);
    } catch (e) {
      if (e.status !== 404 && e.status !== 405 && e.status !== 422) throw e;
      const all = await request('/crm/leads?limit=2000');
      const found = (all || []).find((l) => l.id === id);
      if (!found) throw e;
      return found;
    }
  },
  createLead: (data) => request('/crm/leads', { method: 'POST', body: data }),
  updateLead: (id, patch) => request(`/crm/leads/${id}`, { method: 'PATCH', body: patch }),
  quotationStatus: (id, status) =>
    request(`/crm/leads/${id}/quotation/status`, { method: 'POST', body: { status } }),
  createInvoice: (id) => request(`/crm/leads/${id}/invoice`, { method: 'POST' }),
  addPayment: (id, data) =>
    request(`/crm/leads/${id}/invoice/payments`, { method: 'POST', body: data }),
  comments: (id, text) => request(`/crm/leads/${id}/comments`, { method: 'POST', body: { text } }),
  saveSurvey: (id, data) => request(`/crm/leads/${id}/survey`, { method: 'POST', body: data }),
  uploadDoc: (id, stageKey, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request(`/crm/leads/${id}/stages/${stageKey}/documents`, { method: 'POST', formData: fd });
  },
  docPath: (id, stageKey, docId) =>
    `/crm/leads/${id}/stages/${stageKey}/documents/${docId}`,
  sendWhatsAppDoc: (id, data) =>
    request(`/crm/leads/${id}/whatsapp/document`, { method: 'POST', body: data }),
  whatsappThread: (phone) =>
    request(`/crm/whatsapp/chat?phone=${encodeURIComponent(phone)}`),
  whatsappChat: (data) =>
    request('/crm/whatsapp/chat', { method: 'POST', body: data }),
};

export async function fetchDocObjectUrl(leadId, stageKey, docId) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${api.docPath(leadId, stageKey, docId)}`, { headers });
  if (!res.ok) throw new Error('Photo load failed');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
