const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '/app/data';
const CREDS_FILE = path.join(DATA_DIR, 'credentials.json');
const ACCESS_FILE = path.join(DATA_DIR, 'access-control.json');
const WORKSPACE_FILE = path.join(DATA_DIR, 'workspace-data.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readAll() {
  ensureDir();
  try { return JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8')); } catch { return []; }
}

function writeAll(data) {
  ensureDir();
  fs.writeFileSync(CREDS_FILE, JSON.stringify(data, null, 2));
}

function readAccessControl() {
  ensureDir();
  try {
    const data = JSON.parse(fs.readFileSync(ACCESS_FILE, 'utf8'));
    return {
      version: 1,
      members: Array.isArray(data.members) ? data.members : [],
      updatedAt: data.updatedAt || null,
    };
  } catch {
    return { version: 1, members: [], updatedAt: null };
  }
}

function writeAccessControl(data) {
  ensureDir();
  const normalized = {
    version: 1,
    members: Array.isArray(data.members) ? data.members : [],
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(ACCESS_FILE, JSON.stringify(normalized, null, 2));
  return normalized;
}

function normalizeAdsConnections(data) {
  const connections = (data.facebookAdsConnections && typeof data.facebookAdsConnections === 'object')
    ? { ...data.facebookAdsConnections }
    : {};
  if (data.facebookAdsConnection && !connections._workspace) {
    connections._workspace = data.facebookAdsConnection;
  }
  return connections;
}

function readWorkspaceData() {
  ensureDir();
  try {
    const data = JSON.parse(fs.readFileSync(WORKSPACE_FILE, 'utf8'));
    return {
      version: 1,
      brands: Array.isArray(data.brands) ? data.brands : [],
      approvals: Array.isArray(data.approvals) ? data.approvals : [],
      analyticsSnapshots: Array.isArray(data.analyticsSnapshots) ? data.analyticsSnapshots : [],
      facebookAdsConnections: normalizeAdsConnections(data),
      facebookAdsConnection: data.facebookAdsConnection || null,
      updatedAt: data.updatedAt || null,
    };
  } catch {
    return { version: 1, brands: [], approvals: [], analyticsSnapshots: [], facebookAdsConnections: {}, facebookAdsConnection: null, updatedAt: null };
  }
}

function writeWorkspaceData(data) {
  ensureDir();
  const connections = normalizeAdsConnections(data);
  const normalized = {
    version: 1,
    brands: Array.isArray(data.brands) ? data.brands : [],
    approvals: Array.isArray(data.approvals) ? data.approvals : [],
    analyticsSnapshots: Array.isArray(data.analyticsSnapshots) ? data.analyticsSnapshots.slice(-1000) : [],
    facebookAdsConnections: connections,
    facebookAdsConnection: connections._workspace || null,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(WORKSPACE_FILE, JSON.stringify(normalized, null, 2));
  return normalized;
}

module.exports = { readAll, writeAll, readAccessControl, writeAccessControl, readWorkspaceData, writeWorkspaceData };
