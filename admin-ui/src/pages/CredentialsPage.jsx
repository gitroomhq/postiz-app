import { useEffect, useState } from 'react'
import { credentials, docker } from '../api'

const PROVIDER_LABELS = {
  linkedin: 'LinkedIn', facebook: 'Facebook / Instagram', github: 'GitHub',
  google: 'Google / YouTube', x: 'X (Twitter)', tiktok: 'TikTok',
  reddit: 'Reddit', discord: 'Discord', pinterest: 'Pinterest', tumblr: 'Tumblr',
  openai: 'OpenAI (AI Writer)',
  gemini: 'Google Gemini (AI Writer)',
  openrouter: 'OpenRouter (AI text & image models)',
}

const TOKEN_ONLY_PROVIDERS = new Set(['openai', 'gemini', 'openrouter'])

export default function CredentialsPage() {
  const [list, setList] = useState([])
  const [providers, setProviders] = useState([])
  const [form, setForm] = useState({ provider: '', label: '', client_id: '', client_secret: '', is_active: true })
  const [editing, setEditing] = useState(null)
  const [msg, setMsg] = useState(null)
  const [error, setError] = useState(null)
  const [applying, setApplying] = useState(false)
  const [restarting, setRestarting] = useState(false)

  const tokenOnly = TOKEN_ONLY_PROVIDERS.has(form.provider)

  async function load() {
    const [creds, provs] = await Promise.all([credentials.list(), credentials.providers()])
    setList(creds); setProviders(provs)
  }

  useEffect(() => { load() }, [])

  function startEdit(row) {
    setEditing(row.id)
    setForm({
      id: row.id,
      provider: row.provider,
      label: row.label || '',
      client_id: row.client_id,
      client_secret: '',
      is_active: !!row.is_active,
    })
    setMsg(null); setError(null)
  }

  function startAdd() {
    setEditing('new')
    setForm({ provider: providers[0] || '', label: '', client_id: '', client_secret: '', is_active: true })
    setMsg(null); setError(null)
  }

  function cancel() { setEditing(null); setForm({ provider: '', label: '', client_id: '', client_secret: '', is_active: true }) }

  async function save(e) {
    e.preventDefault()
    try {
      await credentials.save(form)
      setMsg(`Saved ${PROVIDER_LABELS[form.provider] || form.provider} credential. Click "Apply & Restart" to activate in Postiz.`)
      setEditing(null)
      load()
    } catch (e) { setError(e.message) }
  }

  async function remove(row) {
    const title = row.label ? `${PROVIDER_LABELS[row.provider] || row.provider} (${row.label})` : (PROVIDER_LABELS[row.provider] || row.provider)
    if (!confirm(`Remove ${title} credentials?`)) return
    await credentials.remove(row.id)
    setMsg(`Removed ${title}.`)
    load()
  }

  async function activate(row) {
    try {
      await credentials.activate(row.id)
      const title = row.label ? `${PROVIDER_LABELS[row.provider] || row.provider} (${row.label})` : (PROVIDER_LABELS[row.provider] || row.provider)
      setMsg(`Set active: ${title}`)
      load()
    } catch (e) { setError(e.message) }
  }

  async function applyAndRestart() {
    setApplying(true); setMsg(null); setError(null)
    try {
      const r = await credentials.apply()
      setMsg(`Written to .env: ${r.providers.join(', ') || 'none'}. Restarting Postiz…`)
      setRestarting(true)
      await docker.restartPostiz()
      setMsg('Credentials applied and Postiz restarted ✓')
    } catch (e) { setError(e.message) } finally { setApplying(false); setRestarting(false) }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Provider Credentials</h1>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={startAdd}>+ Add Provider</button>
          <button className="btn btn-success btn-sm" onClick={applyAndRestart} disabled={applying || restarting || list.length === 0}>
            {(applying || restarting) && <span className="spinner" />} Apply & Restart Postiz
          </button>
        </div>
      </div>

      <div className="alert alert-info">
        You can save multiple credentials per provider. Mark one as <strong>active</strong> for each provider, then click <strong>Apply & Restart</strong> to write active values to <code>.env</code> and recreate Postiz.
      </div>

      {msg   && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {editing && (
        <div className="card">
          <div className="card-title">{editing === 'new' ? 'Add Provider Credential' : `Edit Credential #${editing}`}</div>
          <form onSubmit={save}>
            <div className="grid-2">
              <div>
                <div className="form-group">
                  <label>Provider</label>
                  {editing === 'new' ? (
                    <select className="form-control" value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}>
                      {providers.map(p => <option key={p} value={p}>{PROVIDER_LABELS[p] || p}</option>)}
                    </select>
                  ) : (
                    <input className="form-control" value={PROVIDER_LABELS[form.provider] || form.provider} disabled />
                  )}
                </div>
                <div className="form-group">
                  <label>Label (optional)</label>
                  <input className="form-control" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Example: Client A, Backup App, Prod Key" />
                </div>
                <div className="form-group">
                  <label>{tokenOnly ? 'API Key' : 'Client ID / App ID'}</label>
                  <input className="form-control" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} placeholder={tokenOnly ? 'Paste API key' : 'Paste client_id / app_id'} required />
                </div>
                {!tokenOnly && (
                  <div className="form-group">
                    <label>Client Secret / App Secret</label>
                    <input className="form-control" type="password" value={form.client_secret} onChange={e => setForm(f => ({ ...f, client_secret: e.target.value }))} placeholder="Paste secret" required={editing === 'new'} />
                    {editing !== 'new' && <p className="text-muted text-sm" style={{ marginTop: 4 }}>Leave blank to keep existing secret.</p>}
                  </div>
                )}
                <div className="form-group">
                  <label style={{ textTransform: 'none', letterSpacing: 0 }}>
                    <input
                      type="checkbox"
                      checked={!!form.is_active}
                      onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                      style={{ marginRight: 8 }}
                    />
                    Set as active for this provider
                  </label>
                </div>
              </div>
              <div className="card" style={{ background: '#0f172a' }}>
                <div className="card-title">Where to get credentials</div>
                {HINTS[form.provider] ? (
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: '#94a3b8' }} dangerouslySetInnerHTML={{ __html: HINTS[form.provider] }} />
                ) : (
                  <p className="text-muted text-sm">Select a provider to see setup instructions.</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary btn-sm">Save</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={cancel}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Label</th>
              <th>Client ID</th>
              <th>Active</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map(row => (
              <tr key={row.id}>
                <td><strong>{PROVIDER_LABELS[row.provider] || row.provider}</strong></td>
                <td className="text-muted">{row.label || '—'}</td>
                <td><span className="mono">{row.client_id.slice(0, 12)}…</span></td>
                <td>
                  <span className={`badge ${row.is_active ? 'badge-healthy' : 'badge-starting'}`}>
                    {row.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="text-muted">{new Date(row.updated_at).toLocaleString()}</td>
                <td>
                  <div className="flex gap-2">
                    {!row.is_active && <button className="btn btn-success btn-sm" onClick={() => activate(row)}>Set Active</button>}
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(row)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(row)}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={6} className="text-muted" style={{ textAlign: 'center', padding: 28 }}>No credentials saved. Click "+ Add Provider" to start.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const HINTS = {
  linkedin:  '<b>1.</b> Go to <a href="https://www.linkedin.com/developers/apps/new" target="_blank" style="color:#3b82f6">LinkedIn Developer Portal</a><br><b>2.</b> Create app → enable <em>Share on LinkedIn + OpenID</em><br><b>3.</b> Redirect URL: <code>http://localhost:4007/integrations/social/linkedin</code>',
  facebook:  '<b>1.</b> Go to <a href="https://developers.facebook.com/apps/" target="_blank" style="color:#3b82f6">Facebook Developers</a><br><b>2.</b> New App → Business<br><b>3.</b> Add <em>Facebook Login</em> product<br><b>4.</b> Redirect: <code>http://localhost:4007/integrations/social/facebook</code>',
  github:    '<b>1.</b> Go to <a href="https://github.com/settings/developers" target="_blank" style="color:#3b82f6">GitHub → OAuth Apps</a><br><b>2.</b> New OAuth App<br><b>3.</b> Callback: <code>http://localhost:4007/integrations/social/github</code>',
  google:    '<b>1.</b> <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color:#3b82f6">Google Cloud Console</a> → OAuth 2.0 Client ID<br><b>2.</b> Redirect: <code>http://localhost:4007/integrations/social/google</code><br><b>3.</b> Enable <em>YouTube Data API v3</em>',
  x:         '<b>1.</b> <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" style="color:#3b82f6">X Developer Portal</a> → Create App<br><b>2.</b> Enable OAuth 2.0<br><b>3.</b> Callback: <code>http://localhost:4007/integrations/social/x</code>',
  reddit:    '<b>1.</b> <a href="https://www.reddit.com/prefs/apps" target="_blank" style="color:#3b82f6">Reddit Apps</a> → Create App (web app)<br><b>2.</b> Redirect: <code>http://localhost:4007/integrations/social/reddit</code>',
  discord:   '<b>1.</b> <a href="https://discord.com/developers/applications" target="_blank" style="color:#3b82f6">Discord Developer Portal</a><br><b>2.</b> New Application → OAuth2<br><b>3.</b> Redirect: <code>http://localhost:4007/integrations/social/discord</code>',
  tiktok:    '<b>1.</b> <a href="https://developers.tiktok.com/" target="_blank" style="color:#3b82f6">TikTok Developer</a> → Create App<br><b>2.</b> Redirect: <code>http://localhost:4007/integrations/social/tiktok</code>',
  pinterest: '<b>1.</b> <a href="https://developers.pinterest.com/apps/" target="_blank" style="color:#3b82f6">Pinterest Developer</a> → Create App<br><b>2.</b> Redirect: <code>http://localhost:4007/integrations/social/pinterest</code>',
  openai:    '<b>1.</b> Open <a href="https://platform.openai.com/api-keys" target="_blank" style="color:#3b82f6">OpenAI API Keys</a><br><b>2.</b> Create a new secret key<br><b>3.</b> Save it here, then click <strong>Apply & Restart Postiz</strong><br><b>4.</b> Postiz AI writer in Create Post will use this key',
  gemini:    '<b>1.</b> Create a restricted Gemini API key in Google AI Studio<br><b>2.</b> Save it here, then click <strong>Apply & Restart Postiz</strong><br><b>3.</b> Gemini is quota-limited and is used here for captions, hashtags, and media prompts',
  openrouter:'<b>1.</b> Open <a href="https://openrouter.ai/keys" target="_blank" style="color:#3b82f6">OpenRouter API Keys</a><br><b>2.</b> Create an API key and save it here<br><b>3.</b> In Postiz Create Post, select <strong>OpenRouter</strong> and choose a text and image model.',
}
