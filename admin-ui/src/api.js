// All API calls go through the Express backend
const BASE = '';

function getAuth() {
  return localStorage.getItem('postiz_auth') || '';
}

function getTenant() {
  return localStorage.getItem('postiz_tenant') || localStorage.getItem('postiz_ads_tenant') || '';
}

async function request(url, options = {}) {
  const tenant = getTenant();
  const res = await fetch(BASE + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      auth: getAuth(),
      ...(tenant ? { 'x-tenant-id': tenant } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || res.statusText), { status: res.status });
  }
  return res.json();
}

// ── Admin API ──────────────────────────────────────────────

export const health = {
  get: () => request('/api/health'),
};

export const credentials = {
  list:      ()           => request('/api/credentials'),
  providers: ()           => request('/api/credentials/providers'),
  save:      (body)       => request('/api/credentials', { method: 'POST', body: JSON.stringify(body) }),
  remove:    (id)         => request(`/api/credentials/${id}`, { method: 'DELETE' }),
  activate:  (id)         => request(`/api/credentials/${id}/activate`, { method: 'POST' }),
  apply:     ()           => request('/api/credentials/apply', { method: 'POST' }),
};

export const docker = {
  restartPostiz: () => request('/api/docker/restart-postiz', { method: 'POST' }),
  postizLogs:    () => fetch('/api/docker/postiz-logs', { headers: { auth: getAuth() } }).then(r => r.text()),
};

export const aiContent = {
  generate: (body) => request('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) }),
};

export const access = {
  me:      () => request('/api/access/me'),
  members: () => request('/api/access/members'),
  addMember: (body) => request('/api/access/members', { method: 'POST', body: JSON.stringify(body) }),
  updateMember: (id, body) => request(`/api/access/members/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  removeMember: (id) => request(`/api/access/members/${id}`, { method: 'DELETE' }),
  channels: () => request('/api/access/channels'),
};

export const workspace = {
  brands: () => request('/api/workspace/brands'),
  addBrand: (body) => request('/api/workspace/brands', { method: 'POST', body: JSON.stringify(body) }),
  updateBrand: (id, body) => request(`/api/workspace/brands/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  removeBrand: (id) => request(`/api/workspace/brands/${id}`, { method: 'DELETE' }),
  approvals: () => request('/api/workspace/approvals'),
  requestApproval: (body) => request('/api/workspace/approvals', { method: 'POST', body: JSON.stringify(body) }),
  decideApproval: (id, body) => request(`/api/workspace/approvals/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
};

export const analytics = { get: (date) => request(`/api/analytics${date ? `?date=${encodeURIComponent(date)}` : ''}`) };
function tenantHeaders(tenantId) {
  return tenantId ? { 'x-tenant-id': tenantId } : {};
}
export const facebookAds = {
  catalog: (tenantId) => request('/api/facebook-ads/catalog', { headers: tenantHeaders(tenantId) }),
  status: (tenantId) => request('/api/facebook-ads/status', { headers: tenantHeaders(tenantId) }),
  authUrl: (tenantId) => request('/api/facebook-ads/auth-url?tenantId=' + encodeURIComponent(tenantId || '_workspace')),
  businesses: (tenantId) => request('/api/facebook-ads/businesses', { headers: tenantHeaders(tenantId) }),
  adAccounts: (tenantId, businessId) => request('/api/facebook-ads/ad-accounts' + (businessId ? '?businessId=' + encodeURIComponent(businessId) : ''), { headers: tenantHeaders(tenantId) }),
  select: (tenantId, body) => request('/api/facebook-ads/select', { method: 'POST', headers: tenantHeaders(tenantId), body: JSON.stringify(body) }),
  pages: (tenantId) => request('/api/facebook-ads/pages', { headers: tenantHeaders(tenantId) }),
  pagePosts: (tenantId, pageId) => request('/api/facebook-ads/pages/' + encodeURIComponent(pageId) + '/posts', { headers: tenantHeaders(tenantId) }),
  leadForms: (tenantId, pageId) => request('/api/facebook-ads/pages/' + encodeURIComponent(pageId) + '/lead-forms', { headers: tenantHeaders(tenantId) }),
  createLeadForm: (tenantId, pageId, body) => request('/api/facebook-ads/pages/' + encodeURIComponent(pageId) + '/lead-forms', { method: 'POST', headers: tenantHeaders(tenantId), body: JSON.stringify(body) }),
  campaigns: (tenantId) => request('/api/facebook-ads/campaigns', { headers: tenantHeaders(tenantId) }),
  createCampaign: (tenantId, body) => request('/api/facebook-ads/campaigns', { method: 'POST', headers: tenantHeaders(tenantId), body: JSON.stringify(body) }),
  adGroups: (tenantId) => request('/api/facebook-ads/ad-groups', { headers: tenantHeaders(tenantId) }),
  createAdGroup: (tenantId, body) => request('/api/facebook-ads/ad-groups', { method: 'POST', headers: tenantHeaders(tenantId), body: JSON.stringify(body) }),
  ads: (tenantId) => request('/api/facebook-ads/ads', { headers: tenantHeaders(tenantId) }),
  createAd: (tenantId, body) => request('/api/facebook-ads/ads', { method: 'POST', headers: tenantHeaders(tenantId), body: JSON.stringify(body) }),
  setCampaignStatus: (tenantId, id, status) => request('/api/facebook-ads/campaigns/' + encodeURIComponent(id) + '/status', { method: 'POST', headers: tenantHeaders(tenantId), body: JSON.stringify({ status }) }),
  setAdGroupStatus: (tenantId, id, status) => request('/api/facebook-ads/ad-groups/' + encodeURIComponent(id) + '/status', { method: 'POST', headers: tenantHeaders(tenantId), body: JSON.stringify({ status }) }),
  setAdStatus: (tenantId, id, status) => request('/api/facebook-ads/ads/' + encodeURIComponent(id) + '/status', { method: 'POST', headers: tenantHeaders(tenantId), body: JSON.stringify({ status }) }),
  updateCampaign: (tenantId, id, body) => request('/api/facebook-ads/campaigns/' + encodeURIComponent(id), { method: 'POST', headers: tenantHeaders(tenantId), body: JSON.stringify(body) }),
  updateAdGroup: (tenantId, id, body) => request('/api/facebook-ads/ad-groups/' + encodeURIComponent(id), { method: 'POST', headers: tenantHeaders(tenantId), body: JSON.stringify(body) }),
  updateAd: (tenantId, id, body) => request('/api/facebook-ads/ads/' + encodeURIComponent(id), { method: 'POST', headers: tenantHeaders(tenantId), body: JSON.stringify(body) }),
  searchGeo: (tenantId, q, type) => request('/api/facebook-ads/targeting/geo?q=' + encodeURIComponent(q || '') + (type ? '&type=' + encodeURIComponent(type) : ''), { headers: tenantHeaders(tenantId) }),
  searchInterests: (tenantId, q) => request('/api/facebook-ads/targeting/interests?q=' + encodeURIComponent(q || ''), { headers: tenantHeaders(tenantId) }),
  audiences: (tenantId) => request('/api/facebook-ads/audiences', { headers: tenantHeaders(tenantId) }),
};
export const growth = {
  recommendations: () => request('/api/growth/recommendations'),
  campaign: (body) => request('/api/growth/campaign', { method: 'POST', body: JSON.stringify(body) }),
};

// ── Postiz API (proxied) ───────────────────────────────────

async function postiz(path, options = {}) {
  const res = await fetch(`/postiz/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      auth: getAuth(),
      ...(options.headers || {}),
    },
    credentials: 'include',
  });
  if (res.status === 401) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || res.statusText);
  }
  return res.json();
}

export const postizAuth = {
  login: async (email, password) => {
    const res = await fetch('/postiz/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, provider: 'LOCAL' }),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(await res.text());
    // NOT_SECURED exposes JWT in x-postiz-auth (relayed by our proxy) and auth header
    const token = res.headers.get('x-postiz-auth') || res.headers.get('auth');
    return { token };
  },
  canRegister: () => postiz('/auth/can-register'),
};

export const postizPosts = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return postiz(`/public/v1/posts${qs ? '?' + qs : ''}`);
  },
};

export const postizIntegrations = {
  list: () => postiz('/integrations/list'),
  disconnect: (id) => postiz(`/integrations/${id}`, { method: 'DELETE' }),
  oauthLink: (provider) => postiz(`/auth/oauth/${provider}`),
};

export const postizUsers = {
  me: () => postiz('/user/self'),
  team: () => postiz('/settings/team'),
};
