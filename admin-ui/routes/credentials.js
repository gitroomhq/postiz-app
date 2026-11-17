const express = require('express');
const fs = require('fs');
const { readAll, writeAll } = require('../db');

const router = express.Router();

const ENV_MAP = {
  linkedin:  { id: 'LINKEDIN_CLIENT_ID',  secret: 'LINKEDIN_CLIENT_SECRET' },
  facebook:  { id: 'FACEBOOK_APP_ID',     secret: 'FACEBOOK_APP_SECRET' },
  instagram: { id: 'FACEBOOK_APP_ID',     secret: 'FACEBOOK_APP_SECRET' },
  github:    { id: 'GITHUB_CLIENT_ID',    secret: 'GITHUB_CLIENT_SECRET' },
  google:    { id: 'GOOGLE_CLIENT_ID',    secret: 'GOOGLE_CLIENT_SECRET' },
  youtube:   { id: 'GOOGLE_CLIENT_ID',    secret: 'GOOGLE_CLIENT_SECRET' },
  x:         { id: 'X_CLIENT_ID',         secret: 'X_CLIENT_SECRET' },
  tiktok:    { id: 'TIKTOK_CLIENT_KEY',   secret: 'TIKTOK_CLIENT_SECRET' },
  reddit:    { id: 'REDDIT_CLIENT_ID',    secret: 'REDDIT_CLIENT_SECRET' },
  discord:   { id: 'DISCORD_CLIENT_ID',   secret: 'DISCORD_CLIENT_SECRET' },
  pinterest: { id: 'PINTEREST_CLIENT_ID', secret: 'PINTEREST_CLIENT_SECRET' },
  tumblr:    { id: 'TUMBLR_CLIENT_ID',    secret: 'TUMBLR_CLIENT_SECRET' },
  openai:    { token: 'OPENAI_API_KEY' },
  gemini:    { token: 'GEMINI_API_KEY' },
  openrouter:{ token: 'OPENROUTER_API_KEY' },
};

function normalizeRows(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(r => r && r.provider)
    .map(r => ({
      id: r.id || Date.now() + Math.floor(Math.random() * 10000),
      provider: String(r.provider).toLowerCase(),
      label: String(r.label || '').trim(),
      client_id: String(r.client_id || ''),
      client_secret: String(r.client_secret || ''),
      is_active: !!r.is_active,
      updated_at: r.updated_at || new Date().toISOString(),
    }));
}

function withoutSecrets(rows) {
  return rows.map(({ client_secret, ...rest }) => rest);
}

function chooseActive(rows, provider) {
  const candidates = rows.filter(r => r.provider === provider);
  if (candidates.length === 0) return null;
  const active = candidates.find(r => r.is_active);
  if (active) return active;
  return candidates
    .slice()
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))[0];
}

function deactivateProviderRows(rows, provider, keepId) {
  for (const r of rows) {
    if (r.provider === provider) r.is_active = r.id === keepId;
  }
}

router.get('/providers', (_req, res) => res.json(Object.keys(ENV_MAP)));

router.get('/', (_req, res) => {
  const creds = withoutSecrets(normalizeRows(readAll()));
  res.json(creds);
});

router.post('/', (req, res) => {
  const { id, provider, label, client_id, client_secret, is_active } = req.body;
  const key = provider?.toLowerCase();
  const map = ENV_MAP[key];
  if (!key || !map || !client_id)
    return res.status(400).json({ error: 'a supported provider and client_id are required' });

  const creds = normalizeRows(readAll());
  const idx = id != null ? creds.findIndex(c => String(c.id) === String(id)) : -1;
  const isTokenOnly = !!map.token;
  const secret = isTokenOnly ? '' : (client_secret || (idx >= 0 ? creds[idx].client_secret : ''));
  if (!isTokenOnly && !secret)
    return res.status(400).json({ error: 'client_secret is required when adding a provider' });

  const entry = {
    id: idx >= 0 ? creds[idx].id : Date.now() + Math.floor(Math.random() * 1000),
    provider: key,
    label: String(label || '').trim(),
    client_id,
    client_secret: secret,
    is_active: !!is_active,
    updated_at: new Date().toISOString(),
  };

  if (idx >= 0) {
    creds[idx] = entry;
  } else {
    const hasActiveInProvider = creds.some(c => c.provider === key && c.is_active);
    if (!hasActiveInProvider) entry.is_active = true;
    creds.push(entry);
  }

  if (entry.is_active) deactivateProviderRows(creds, key, entry.id);

  writeAll(creds);
  const [safe] = withoutSecrets([entry]);
  res.json(safe);
});

router.post('/:id/activate', (req, res) => {
  const creds = normalizeRows(readAll());
  const idx = creds.findIndex(c => String(c.id) === String(req.params.id));
  if (idx < 0) return res.status(404).json({ error: 'credential not found' });

  const target = creds[idx];
  deactivateProviderRows(creds, target.provider, target.id);
  target.updated_at = new Date().toISOString();
  writeAll(creds);
  res.json({ ok: true, id: target.id, provider: target.provider });
});

router.delete('/:id', (req, res) => {
  const creds = normalizeRows(readAll());
  const idx = creds.findIndex(c => String(c.id) === String(req.params.id));
  if (idx < 0) return res.status(404).json({ error: 'credential not found' });

  const removed = creds[idx];
  creds.splice(idx, 1);

  if (removed.is_active) {
    const replacement = chooseActive(creds, removed.provider);
    if (replacement) replacement.is_active = true;
  }

  writeAll(creds);
  res.json({ ok: true });
});

router.post('/apply', (req, res) => {
  const envPath = process.env.HOST_ENV_FILE || '/app/.env.stack';
  let content = '';
  try { content = fs.readFileSync(envPath, 'utf8'); } catch {}

  const managedVars = new Set(
    Object.values(ENV_MAP).flatMap(m => [m.id, m.secret, m.token]).filter(Boolean)
  );
  const kept = content.split('\n').filter(line => {
    const key = line.split('=')[0].trim();
    return key && !managedVars.has(key);
  });

  const rows = normalizeRows(readAll());
  const providers = [...new Set(rows.map(r => r.provider))];
  const selectedRows = providers.map(p => chooseActive(rows, p)).filter(Boolean);

  for (const row of selectedRows) {
    const map = ENV_MAP[row.provider];
    if (map) {
      if (map.token) {
        kept.push(`${map.token}=${row.client_id}`);
      } else {
        kept.push(`${map.id}=${row.client_id}`);
        kept.push(`${map.secret}=${row.client_secret}`);
      }
    }
  }

  fs.writeFileSync(envPath, kept.filter(Boolean).join('\n') + '\n');
  res.json({
    ok: true,
    providers: selectedRows.map(r => r.provider),
    selected: selectedRows.map(r => ({
      id: r.id,
      provider: r.provider,
      label: r.label || '',
      is_active: !!r.is_active,
    })),
  });
});

module.exports = router;
