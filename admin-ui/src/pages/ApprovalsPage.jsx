import { useEffect, useState } from 'react'
import { access, workspace } from '../api'
import { useTenant, scopeChannels } from '../tenant'

export default function ApprovalsPage({ workspace: currentWorkspace }) {
  const { tenantId, isWorkspace, selectedBrand, channelIds } = useTenant()
  const [items, setItems] = useState([]); const [channels, setChannels] = useState([]); const [error, setError] = useState(''); const [form, setForm] = useState({ title: '', notes: '', channelIds: [] })
  const canDecide = currentWorkspace.permissions.includes('*') || currentWorkspace.permissions.includes('approvals.manage')
  const scopedChannels = isWorkspace ? channels : scopeChannels(channels, channelIds)
  async function load() { try { const [approvalItems, channelItems] = await Promise.all([workspace.approvals(), access.channels()]); setItems(approvalItems); setChannels(channelItems) } catch (e) { setError(e.message) } }
  useEffect(() => { load() }, [tenantId])
  async function create(e) {
    e.preventDefault()
    try {
      await workspace.requestApproval({ ...form, brandId: isWorkspace ? '' : tenantId })
      setForm({ title: '', notes: '', channelIds: [] })
      load()
    } catch (cause) { setError(cause.message) }
  }
  async function decide(item, status) { const note = prompt('Optional review note:') || ''; await workspace.decideApproval(item.id, { status, decisionNote: note }); load() }
  const visible = isWorkspace ? items : items.filter((item) => item.brandId === tenantId || item.channelIds?.some((id) => channelIds.includes(id)))
  return <div><div className="page-header"><div><h1 className="page-title">Approval Queue</h1><p className="text-muted mt-4">{isWorkspace ? 'Request review before client posts are scheduled or published.' : `Approvals for ${selectedBrand?.name || 'this brand'}.`}</p></div><button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button></div>{error && <div className="alert alert-error">{error}</div>}<form className="card" onSubmit={create}><h2 className="card-title">Request approval</h2><div className="grid-2"><div className="form-group"><label>Post title / summary</label><input className="form-control" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="August sofa campaign" /></div><div className="form-group"><label>Reviewer notes</label><input className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Check offer wording and image" /></div></div><div className="channel-picker">{scopedChannels.map((channel) => <label className="channel-choice" key={channel.id}><input type="checkbox" checked={form.channelIds.includes(channel.id)} onChange={() => setForm((old) => ({ ...old, channelIds: old.channelIds.includes(channel.id) ? old.channelIds.filter((id) => id !== channel.id) : [...old.channelIds, channel.id] }))} /> {channel.name}</label>)}</div><button className="btn btn-primary">Request approval</button></form><div className="card table-wrap"><table><thead><tr><th>Post</th><th>Requester</th><th>Channels</th><th>Status</th>{canDecide && <th>Decision</th>}</tr></thead><tbody>{visible.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><div className="text-muted text-sm">{item.notes}</div></td><td>{item.requestedBy}</td><td>{item.channelIds.length || 'All / not specified'}</td><td><span className={`badge ${item.status === 'approved' ? 'badge-healthy' : item.status === 'pending' ? 'badge-starting' : 'badge-unhealthy'}`}>{item.status}</span></td>{canDecide && <td>{item.status === 'pending' && <div className="flex gap-2"><button className="btn btn-success btn-sm" onClick={() => decide(item, 'approved')}>Approve</button><button className="btn btn-ghost btn-sm" onClick={() => decide(item, 'changes_requested')}>Request changes</button><button className="btn btn-danger btn-sm" onClick={() => decide(item, 'rejected')}>Reject</button></div>}</td>}</tr>)}{!visible.length && <tr><td colSpan={canDecide ? 5 : 4} className="text-muted">No approval requests yet.</td></tr>}</tbody></table></div></div>
}