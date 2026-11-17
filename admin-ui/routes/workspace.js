const express = require('express');
const { readWorkspaceData, writeWorkspaceData } = require('../db');
const { requirePermission } = require('./access');
const { WORKSPACE_TENANT, memberTenantIds } = require('../access-control');

const router = express.Router();
const id = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const cleanIds = (value) => Array.isArray(value) ? [...new Set(value.map(String).filter(Boolean))] : [];

router.get('/brands', requirePermission('brands.view'), (req, res) => {
  const brands = readWorkspaceData().brands;
  const member = req.principal.member;
  const ids = memberTenantIds(member);
  if (!ids.length) {
    if (member.role === 'owner') return res.json(brands);
    return res.json([]);
  }
  res.json(brands.filter((brand) => ids.includes(brand.id)));
});

router.post('/brands', requirePermission('brands.manage'), (req, res) => {
  const { name, description = '', channelIds = [] } = req.body || {};
  if (!String(name || '').trim()) return res.status(400).json({ error: 'Brand/client name is required.' });
  const data = readWorkspaceData();
  const now = new Date().toISOString();
  const brand = { id: id('brand'), name: String(name).trim(), description: String(description).trim(), channelIds: cleanIds(channelIds), createdAt: now, updatedAt: now };
  data.brands.push(brand); writeWorkspaceData(data);
  res.status(201).json(brand);
});

router.put('/brands/:id', requirePermission('brands.manage'), (req, res) => {
  const data = readWorkspaceData();
  const brand = data.brands.find((item) => item.id === req.params.id);
  if (!brand) return res.status(404).json({ error: 'Brand/client not found.' });
  if (typeof req.body?.name === 'string' && req.body.name.trim()) brand.name = req.body.name.trim();
  if (typeof req.body?.description === 'string') brand.description = req.body.description.trim();
  if (Array.isArray(req.body?.channelIds)) brand.channelIds = cleanIds(req.body.channelIds);
  brand.updatedAt = new Date().toISOString(); writeWorkspaceData(data);
  res.json(brand);
});

router.delete('/brands/:id', requirePermission('brands.manage'), (req, res) => {
  const data = readWorkspaceData();
  const index = data.brands.findIndex((item) => item.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Brand/client not found.' });
  data.brands.splice(index, 1); writeWorkspaceData(data);
  res.status(204).end();
});

router.get('/approvals', requirePermission('approvals.view'), (req, res) => {
  const data = readWorkspaceData();
  let items = data.approvals;
  const tenantId = req.get('x-tenant-id') || req.query.tenantId;
  if (tenantId && tenantId !== WORKSPACE_TENANT) {
    const brand = data.brands.find((item) => item.id === tenantId);
    const channelIds = brand?.channelIds || [];
    items = items.filter((item) => item.brandId === tenantId || (channelIds.length && item.channelIds?.some((id) => channelIds.includes(id))));
  }
  res.json(items);
});

router.post('/approvals', requirePermission('posts.create'), (req, res) => {
  const { title, postId = '', channelIds = [], notes = '' } = req.body || {};
  if (!String(title || '').trim()) return res.status(400).json({ error: 'A post title or description is required.' });
  const data = readWorkspaceData(); const now = new Date().toISOString();
  const brandId = String(req.body?.brandId || req.get('x-tenant-id') || '').trim();
  const item = { id: id('approval'), title: String(title).trim(), postId: String(postId || ''), channelIds: cleanIds(channelIds), brandId: brandId && brandId !== WORKSPACE_TENANT ? brandId : '', notes: String(notes || '').trim(), status: 'pending', requestedBy: req.principal.member.email, requestedAt: now, decisionBy: null, decidedAt: null, decisionNote: '' };
  data.approvals.unshift(item); writeWorkspaceData(data); res.status(201).json(item);
});

router.put('/approvals/:id', requirePermission('approvals.manage'), (req, res) => {
  const status = String(req.body?.status || '');
  if (!['approved', 'changes_requested', 'rejected'].includes(status)) return res.status(400).json({ error: 'Choose approved, changes_requested, or rejected.' });
  const data = readWorkspaceData(); const item = data.approvals.find((row) => row.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Approval item not found.' });
  item.status = status; item.decisionBy = req.principal.member.email; item.decidedAt = new Date().toISOString(); item.decisionNote = String(req.body?.decisionNote || '').trim();
  writeWorkspaceData(data); res.json(item);
});

module.exports = router;
