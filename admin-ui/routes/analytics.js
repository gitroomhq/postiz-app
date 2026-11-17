const express = require('express');
const { readWorkspaceData, writeWorkspaceData } = require('../db');
const { requirePermission } = require('./access');
const { WORKSPACE_TENANT } = require('../access-control');

const router = express.Router();
const numeric = (value) => typeof value === 'number' && Number.isFinite(value) ? value : 0;
function metricsFrom(value, result = {}) {
  if (Array.isArray(value)) value.forEach((item) => metricsFrom(item, result));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, val]) => {
    if (typeof val === 'number') result[key] = (result[key] || 0) + numeric(val);
    else metricsFrom(val, result);
  });
  return result;
}

router.get('/', requirePermission('analytics.view'), async (req, res) => {
  try {
    const integrationsResponse = await fetch(`${req.postizUrl}/api/integrations/list`, { headers: { auth: req.principal.token } });
    if (!integrationsResponse.ok) return res.status(integrationsResponse.status).json({ error: 'Could not retrieve channels for analytics.' });
    const raw = await integrationsResponse.json(); const integrations = Array.isArray(raw) ? raw : raw?.items || raw?.integrations || [];
    let allowed = req.principal.member.role === 'owner' || req.principal.member.role === 'admin' || req.principal.member.channelIds.length === 0 ? integrations : integrations.filter((item) => req.principal.member.channelIds.includes(item.id));
    const tenantId = req.get('x-tenant-id') || req.query.tenantId;
    if (tenantId && tenantId !== WORKSPACE_TENANT) {
      const brand = readWorkspaceData().brands.find((item) => item.id === tenantId);
      if (brand?.channelIds?.length) allowed = allowed.filter((item) => brand.channelIds.includes(item.id));
    }
    const date = String(req.query.date || new Date().toISOString().slice(0, 10));
    const channels = await Promise.all(allowed.map(async (channel) => {
      let analytics = null; let error = null;
      try {
        const response = await fetch(`${req.postizUrl}/api/analytics/${encodeURIComponent(channel.id)}?date=${encodeURIComponent(date)}`, { headers: { auth: req.principal.token } });
        if (response.ok) analytics = await response.json(); else error = `Analytics unavailable (${response.status})`;
      } catch (cause) { error = cause.message; }
      return { id: channel.id, name: channel.name || channel.profile || 'Unnamed channel', provider: channel.providerIdentifier || channel.provider || 'unknown', analytics, metrics: metricsFrom(analytics), error };
    }));
    const snapshot = { id: `snapshot_${Date.now()}`, date, collectedAt: new Date().toISOString(), channels };
    const data = readWorkspaceData(); data.analyticsSnapshots.push(snapshot); writeWorkspaceData(data);
    res.json({ date, channels, snapshots: data.analyticsSnapshots.slice(-30) });
  } catch (error) { res.status(502).json({ error: `Could not collect analytics: ${error.message}` }); }
});

module.exports = router;
