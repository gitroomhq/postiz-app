import { useEffect, useState } from 'react'
import { access } from '../api'
import { useTenant, scopeChannels } from '../tenant'

export default function ProvidersPage() {
  const { channelIds, isWorkspace, selectedBrand } = useTenant()
  const [channels, setChannels] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true); setError('')
    try { setChannels(await access.channels()) } catch (e) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const visible = isWorkspace ? channels : scopeChannels(channels, channelIds)

  return <div>
    <div className="page-header"><div><h1 className="page-title">Assigned Channels</h1><p className="text-muted mt-4">{isWorkspace ? 'Channels assigned to your workspace role.' : `Pages and accounts owned by ${selectedBrand?.name || 'this brand'}.`}</p></div><button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button></div>
    <div className="alert alert-info">To connect another social account, use Calendar or Create Post inside this Admin UI, then assign it to a brand under Brands &amp; Clients.</div>
    {error && <div className="alert alert-error">{error}</div>}
    <div className="card table-wrap"><table><thead><tr><th>Account</th><th>Provider</th><th>Type</th><th>Access</th></tr></thead><tbody>
      {visible.map((channel) => <tr key={channel.id}><td><div className="flex items-center gap-2">{channel.picture && <img src={channel.picture} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />}<strong>{channel.name}</strong></div></td><td><span className="badge badge-starting">{channel.provider}</span></td><td className="text-muted">{channel.type || 'Social channel'}</td><td><span className="badge badge-healthy">Assigned</span></td></tr>)}
      {!loading && !visible.length && <tr><td colSpan={4} className="text-muted" style={{ textAlign: 'center', padding: 28 }}>{isWorkspace ? 'No channels have been assigned to this role.' : 'This brand has no channels assigned yet. Add them under Brands & Clients.'}</td></tr>}
      {loading && <tr><td colSpan={4} className="text-muted" style={{ textAlign: 'center', padding: 24 }}><span className="spinner" /> Loading…</td></tr>}
    </tbody></table></div>
  </div>
}