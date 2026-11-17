import { useEffect, useMemo, useState } from 'react'
import { access } from '../api'
import { useTenant, scopeChannels, memberHandlesTenant, WORKSPACE_TENANT } from '../tenant'

const ROLE_HELP = {
  owner: 'Full control, including credentials, infrastructure, billing-sensitive actions, and members.',
  admin: 'Manage members and channel assignments; create, edit, publish, and view analytics.',
  editor: 'Create, edit, rewrite, schedule, and publish posts only for assigned channels.',
  analyst: 'Read posts and view analytics only for assigned channels.',
  viewer: 'Read-only access to posts and assigned channels.',
}

const ROLE_OPTIONS = Object.keys(ROLE_HELP).filter((role) => role !== 'owner')

export default function TeamPage({ workspace }) {
  const { tenantId, brands, isWorkspace, channelIds, selectedBrand } = useTenant()
  const [members, setMembers] = useState([])
  const [channels, setChannels] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ email: '', name: '', role: 'editor', channelIds: [], tenantIds: [] })
  const [saving, setSaving] = useState(false)
  const canManage = workspace.permissions.includes('*') || workspace.permissions.includes('team.manage')
  const isOwner = workspace.member.role === 'owner'
  const scopedChannels = isWorkspace ? channels : scopeChannels(channels, channelIds)

  async function load() {
    setLoading(true); setError('')
    try {
      const [allMembers, allChannels] = await Promise.all([access.members(), access.channels()])
      setMembers(allMembers); setChannels(allChannels)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const channelNames = useMemo(() => Object.fromEntries(channels.map((channel) => [channel.id, channel.name])), [channels])
  const brandNames = useMemo(() => Object.fromEntries(brands.map((brand) => [brand.id, brand.name])), [brands])
  const toggleChannel = (id) => setForm((current) => ({ ...current, channelIds: current.channelIds.includes(id) ? current.channelIds.filter((item) => item !== id) : [...current.channelIds, id] }))
  const toggleTenant = (id) => setForm((current) => ({ ...current, tenantIds: current.tenantIds.includes(id) ? current.tenantIds.filter((item) => item !== id) : [...current.tenantIds, id] }))

  const visibleMembers = members.filter((member) => memberHandlesTenant(member, tenantId, isWorkspace))

  async function addMember(event) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try {
      const tenantIds = form.tenantIds.length ? form.tenantIds : (isWorkspace ? [] : [tenantId])
      await access.addMember({ ...form, tenantIds })
      setForm({ email: '', name: '', role: 'editor', channelIds: [], tenantIds: [] })
      setMessage('Member added as a handler for the selected brand(s). They can sign in with this Postiz email immediately.')
      await load()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  async function updateMember(member, changes) {
    setError(''); setMessage('')
    try { await access.updateMember(member.id, changes); setMessage(`${member.name} updated.`); await load() } catch (e) { setError(e.message) }
  }

  async function removeMember(member) {
    if (!confirm(`Remove ${member.name} from this workspace? Their Postiz account is not deleted.`)) return
    try { await access.removeMember(member.id); setMessage(`${member.name} removed.`); await load() } catch (e) { setError(e.message) }
  }

  function brandLabel(member) {
    const ids = Array.isArray(member.tenantIds) ? member.tenantIds : []
    if (!ids.length) return member.role === 'owner' ? 'All brands' : 'Workspace only'
    return ids.map((id) => id === WORKSPACE_TENANT ? 'Workspace' : (brandNames[id] || id)).join(', ')
  }

  return <div>
    <div className="page-header"><div><h1 className="page-title">Team & Channel Access</h1><p className="text-muted mt-4">Assign people to a brand/client as the handler for that tenant. Roles are enforced in this Admin workspace.</p></div><button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button></div>
    {message && <div className="alert alert-success">{message}</div>}
    {error && <div className="alert alert-error">{error}</div>}
    {!isWorkspace && <div className="alert alert-info">Showing handlers for <strong>{selectedBrand?.name}</strong>. Switch to Workspace (shared) to see everyone.</div>}

    <div className="card"><h2 className="card-title">Role architecture</h2><div className="role-grid">{Object.entries(ROLE_HELP).map(([role, text]) => <div key={role} className="role-card"><span className="badge badge-starting">{role}</span><p>{text}</p></div>)}</div></div>

    {canManage && <form className="card" onSubmit={addMember}>
      <h2 className="card-title">Add workspace member</h2>
      <div className="grid-3">
        <div className="form-group"><label>Name</label><input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Team member name" /></div>
        <div className="form-group"><label>Postiz account email</label><input className="form-control" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="member@example.com" /></div>
        <div className="form-group"><label>Role</label><select className="form-control ads-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role[0].toUpperCase() + role.slice(1)}</option>)}</select></div>
      </div>
      <label className="form-label">Assigned brands / clients <span className="text-muted">(empty + owner = all brands; empty + other roles = workspace only)</span></label>
      <div className="channel-picker">
        <label className="channel-choice"><input type="checkbox" checked={form.tenantIds.includes(WORKSPACE_TENANT)} onChange={() => toggleTenant(WORKSPACE_TENANT)} /> Workspace (shared)</label>
        {brands.map((brand) => <label key={brand.id} className="channel-choice"><input type="checkbox" checked={form.tenantIds.includes(brand.id)} onChange={() => toggleTenant(brand.id)} /> {brand.name}</label>)}
        {!brands.length && <span className="text-muted">No brands yet. Add clients under Brands &amp; Clients.</span>}
      </div>
      <label className="form-label">Assigned channels <span className="text-muted">(leave empty for all channels in scope)</span></label>
      <div className="channel-picker">{scopedChannels.map((channel) => <label key={channel.id} className="channel-choice"><input type="checkbox" checked={form.channelIds.includes(channel.id)} onChange={() => toggleChannel(channel.id)} /> {channel.name} <small>{channel.provider}</small></label>)}{scopedChannels.length === 0 && <span className="text-muted">{isWorkspace ? 'No channels found. Connect channels in Postiz first.' : 'This brand has no channels assigned yet.'}</span>}</div>
      <button className="btn btn-primary" disabled={saving}>{saving && <span className="spinner" />} Add member</button>
    </form>}

    <div className="card table-wrap"><h2 className="card-title">Workspace members</h2><table><thead><tr><th>Member</th><th>Role</th><th>Brands</th><th>Channel scope</th><th>Status</th>{canManage && <th>Actions</th>}</tr></thead><tbody>
      {visibleMembers.map((member) => <tr key={member.id}>
        <td><strong>{member.name}</strong>{memberHandlesTenant(member, tenantId, isWorkspace) && !isWorkspace && <span className="badge badge-healthy handler-pill">Handler</span>}<div className="text-muted text-sm">{member.email}</div></td>
        <td>{canManage && member.role !== 'owner' ? <select className="form-control compact-select ads-select" value={member.role} onChange={(e) => updateMember(member, { role: e.target.value })}>{ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}</select> : <span className="badge badge-starting">{member.role}</span>}</td>
        <td>{canManage && member.role !== 'owner' ? <select className="form-control channel-scope-select ads-select" multiple value={member.tenantIds || []} onChange={(event) => updateMember(member, { tenantIds: [...event.target.selectedOptions].map((option) => option.value) })}><option value={WORKSPACE_TENANT}>Workspace</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select> : brandLabel(member)}<div className="text-muted text-sm">{canManage && member.role !== 'owner' ? 'No selection = workspace only' : ''}</div></td>
        <td>{canManage && member.role !== 'owner' ? <select className="form-control channel-scope-select ads-select" multiple value={member.channelIds} onChange={(event) => updateMember(member, { channelIds: [...event.target.selectedOptions].map((option) => option.value) })}>{scopedChannels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}</select> : (member.channelIds.length ? member.channelIds.map((id) => channelNames[id] || id).join(', ') : 'All channels')}<div className="text-muted text-sm">{canManage && member.role !== 'owner' ? 'No selection = all channels' : ''}</div></td>
        <td><span className={`badge ${member.active ? 'badge-healthy' : 'badge-unhealthy'}`}>{member.active ? 'Active' : 'Disabled'}</span></td>
        {canManage && <td className="flex gap-2">{member.role !== 'owner' && <button className="btn btn-ghost btn-sm" onClick={() => updateMember(member, { active: !member.active })}>{member.active ? 'Disable' : 'Enable'}</button>}{isOwner && member.role !== 'owner' && <button className="btn btn-danger btn-sm" onClick={() => removeMember(member)}>Remove</button>}</td>}
      </tr>)}
      {!loading && !visibleMembers.length && <tr><td colSpan={canManage ? 6 : 5} className="text-muted">No members found for this brand.</td></tr>}
      {loading && <tr><td colSpan={canManage ? 6 : 5}><span className="spinner" /> Loading team…</td></tr>}
    </tbody></table></div>
  </div>
}