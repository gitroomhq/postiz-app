const express = require('express');
const {
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  can,
  getPermissions,
  publicMember,
  updateMembers,
  normalEmail,
  canAccessTenant,
  WORKSPACE_TENANT,
} = require('../access-control');
const { readAccessControl, readWorkspaceData } = require('../db');

const router = express.Router();

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.principal?.member || !req.principal.member.active) {
      return res.status(403).json({ error: 'This Postiz account has not been assigned to the workspace.' });
    }
    if (!can(req.principal.member, permission)) {
      return res.status(403).json({ error: `Your ${req.principal.member.role} role cannot ${permission.replace('.', ' ')}.` });
    }
    next();
  };
}

function requireOwner(req, res, next) {
  if (req.principal?.member?.role !== 'owner') {
    return res.status(403).json({ error: 'Only the workspace owner can perform this action.' });
  }
  next();
}

router.get('/me', (req, res) => {
  const member = req.principal.member;
  if (!member || !member.active) {
    return res.status(403).json({ error: 'Ask a workspace owner to add your Postiz email and assign a role.' });
  }
  res.json({
    user: req.principal.user,
    member,
    permissions: getPermissions(member.role),
    roles: Object.entries(ROLE_LABELS).map(([id, label]) => ({ id, label, permissions: ROLE_PERMISSIONS[id] })),
  });
});

router.get('/members', requirePermission('team.view'), (_req, res) => {
  res.json(readAccessControl().members.map(publicMember));
});

router.post('/members', requirePermission('team.manage'), (req, res) => {
  const { email, name, role = 'viewer', channelIds = [], tenantIds = [] } = req.body || {};
  const normalizedEmail = normalEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return res.status(400).json({ error: 'A valid Postiz account email is required.' });
  }
  if (!ROLE_PERMISSIONS[role]) return res.status(400).json({ error: 'Invalid role.' });
  if (role === 'owner') return res.status(400).json({ error: 'Owner access cannot be granted from this form.' });
  const data = readAccessControl();
  if (data.members.some((member) => normalEmail(member.email) === normalizedEmail)) {
    return res.status(409).json({ error: 'This email is already in the workspace.' });
  }
  const now = new Date().toISOString();
  const member = {
    id: `member_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    email: normalizedEmail,
    name: String(name || normalizedEmail).trim(),
    postizUserId: null,
    role,
    channelIds: Array.isArray(channelIds) ? [...new Set(channelIds.filter(Boolean))] : [],
    tenantIds: Array.isArray(tenantIds) ? [...new Set(tenantIds.filter(Boolean))] : [],
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  // Add the existing Postiz account to the owner's native organization first.
  // This keeps posts, channels and scheduled work in one Postiz workspace rather
  // than giving the person a disconnected personal organization.
  fetch(`${req.postizUrl}/api/settings/team/add`, {
    method: 'POST',
    headers: { auth: req.principal.token, 'content-type': 'application/json' },
    body: JSON.stringify({ email: normalizedEmail, role: role === 'admin' ? 'ADMIN' : 'USER' }),
  }).then(async (response) => {
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message = payload.message || payload.error || 'Postiz could not add this account to the organization.';
      return res.status(response.status).json({ error: message });
    }
    updateMembers((members) => members.push(member));
    res.status(201).json(publicMember(member));
  }).catch((error) => res.status(502).json({ error: `Could not add the Postiz team member: ${error.message}` }));
});

router.put('/members/:id', requirePermission('team.manage'), (req, res) => {
  const { role, channelIds, tenantIds, name, active } = req.body || {};
  if (role && !ROLE_PERMISSIONS[role]) return res.status(400).json({ error: 'Invalid role.' });
  let updated;
  updateMembers((members) => {
    const member = members.find((item) => item.id === req.params.id);
    if (!member) return;
    if (member.role === 'owner' && req.principal.member.id !== member.id) return;
    if (role && role !== 'owner') member.role = role;
    if (Array.isArray(channelIds)) member.channelIds = [...new Set(channelIds.filter(Boolean))];
    if (Array.isArray(tenantIds)) member.tenantIds = [...new Set(tenantIds.filter(Boolean))];
    if (typeof name === 'string' && name.trim()) member.name = name.trim();
    if (typeof active === 'boolean') member.active = active;
    member.updatedAt = new Date().toISOString();
    updated = publicMember(member);
  });
  if (!updated) return res.status(404).json({ error: 'Member not found or protected.' });
  res.json(updated);
});

router.delete('/members/:id', requireOwner, async (req, res) => {
  if (req.principal.member.id === req.params.id) return res.status(400).json({ error: 'The workspace owner cannot remove themselves.' });
  const candidate = readAccessControl().members.find((member) => member.id === req.params.id);
  if (!candidate || candidate.role === 'owner') return res.status(404).json({ error: 'Member not found or protected.' });
  try {
    const teamResponse = await fetch(`${req.postizUrl}/api/settings/team`, { headers: { auth: req.principal.token } });
    if (teamResponse.ok) {
      const teamPayload = await teamResponse.json();
      const team = Array.isArray(teamPayload) ? teamPayload : teamPayload?.items || teamPayload?.users || [];
      const nativeMember = team.find((item) => normalEmail(item?.user?.email || item?.email || item?.users?.email) === normalEmail(candidate.email));
      const nativeId = nativeMember?.userId || nativeMember?.user?.id || nativeMember?.users?.id;
      if (nativeId) {
        const deleteResponse = await fetch(`${req.postizUrl}/api/settings/team/${nativeId}`, { method: 'DELETE', headers: { auth: req.principal.token } });
        if (!deleteResponse.ok) return res.status(deleteResponse.status).json({ error: 'Postiz could not remove this team member.' });
      }
    }
  } catch (error) {
    return res.status(502).json({ error: `Could not remove the Postiz team member: ${error.message}` });
  }
  let removed = false;
  updateMembers((members) => {
    const index = members.findIndex((item) => item.id === req.params.id && item.role !== 'owner');
    if (index >= 0) { members.splice(index, 1); removed = true; }
  });
  if (!removed) return res.status(404).json({ error: 'Member not found or protected.' });
  res.status(204).end();
});

router.get('/channels', requirePermission('channels.view'), async (req, res) => {
  try {
    const response = await fetch(`${req.postizUrl}/api/integrations/list`, {
      headers: { auth: req.principal.token },
    });
    if (!response.ok) return res.status(response.status).json({ error: 'Could not retrieve Postiz channels.' });
    const data = await response.json();
    const channels = Array.isArray(data) ? data : data?.items || data?.integrations || [];
    const member = req.principal.member;
    let allowed = member.role === 'owner' || member.role === 'admin' || member.channelIds.length === 0
      ? channels
      : channels.filter((channel) => member.channelIds.includes(channel.id));
    const tenantId = req.get('x-tenant-id') || req.query.tenantId;
    if (tenantId && tenantId !== WORKSPACE_TENANT) {
      if (!canAccessTenant(member, tenantId) && member.role !== 'owner' && member.role !== 'admin') {
        allowed = [];
      } else {
        const brand = readWorkspaceData().brands.find((item) => item.id === tenantId);
        if (brand?.channelIds?.length) {
          allowed = allowed.filter((channel) => brand.channelIds.includes(channel.id));
        } else if (brand && !(member.role === 'owner' || member.role === 'admin')) {
          allowed = [];
        }
      }
    }
    res.json(allowed.map((channel) => ({
      id: channel.id,
      name: channel.name || channel.profile || 'Unnamed channel',
      provider: channel.providerIdentifier || channel.provider || 'unknown',
      picture: channel.picture || null,
      type: channel.type || null,
      internalId: channel.internalId || channel.inId || null,
    })));
  } catch (error) {
    res.status(502).json({ error: `Could not retrieve Postiz channels: ${error.message}` });
  }
});

module.exports = { router, requirePermission, requireOwner };
