import { useEffect, useState } from 'react'
import { access, workspace } from '../api'
import { useTenant, scopeChannels } from '../tenant'

export default function BrandsPage({ workspace: currentWorkspace }) {
  const { tenantId, isWorkspace, selectedBrand, channelIds, reloadBrands } = useTenant()
  const [brands, setBrands] = useState([]); const [channels, setChannels] = useState([]); const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '', channelIds: [] });
  const canManage = currentWorkspace.permissions.includes('*') || currentWorkspace.permissions.includes('brands.manage')
  async function load() {
    try {
      const [b, c] = await Promise.all([workspace.brands(), access.channels()]);
      setBrands(b); setChannels(c)
      window.dispatchEvent(new Event('postiz-brands-changed'))
    } catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, [])
  const assignmentChannels = isWorkspace ? channels : (channelIds.length ? scopeChannels(channels, channelIds) : channels)
  const toggle = (id) => setForm((old) => ({ ...old, channelIds: old.channelIds.includes(id) ? old.channelIds.filter((item) => item !== id) : [...old.channelIds, id] }))
  async function add(e) {
    e.preventDefault(); setError('');
    try {
      await workspace.addBrand(form);
      setForm({ name: '', description: '', channelIds: [] });
      await load()
      if (reloadBrands) await reloadBrands()
    } catch (cause) { setError(cause.message) }
  }
  async function saveBrandChannels(brand, nextIds) {
    setError('')
    try {
      await workspace.updateBrand(brand.id, { channelIds: nextIds })
      await load()
      if (reloadBrands) await reloadBrands()
    } catch (cause) { setError(cause.message) }
  }
  const channelName = (id) => channels.find((channel) => channel.id === id)?.name || id
  const visibleBrands = isWorkspace ? brands : brands.filter((brand) => brand.id === tenantId)
  return <div><div className="page-header"><div><h1 className="page-title">Brands & Clients</h1><p className="text-muted mt-4">Group Facebook Pages, Instagram accounts, and other channels by client or brand. The sidebar switcher scopes the rest of Admin to the selected brand.</p></div><button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button></div>
    {error && <div className="alert alert-error">{error}</div>}
    {!isWorkspace && <div className="alert alert-info">Editing scope: <strong>{selectedBrand?.name}</strong>. Switch to Workspace (shared) to add another client.</div>}
    {canManage && !isWorkspace && selectedBrand && <div className="card"><h2 className="card-title">Channels for {selectedBrand.name}</h2><p className="text-muted text-sm ads-hint">These pages/accounts belong to this brand. Unassigned channels stay in the workspace pool.</p><div className="channel-picker">{channels.map((channel) => <label className="channel-choice" key={channel.id}><input type="checkbox" checked={(selectedBrand.channelIds || []).includes(channel.id)} onChange={() => { const current = selectedBrand.channelIds || []; const next = current.includes(channel.id) ? current.filter((id) => id !== channel.id) : [...current, channel.id]; saveBrandChannels(selectedBrand, next) }} /> {channel.name} <small>{channel.provider}</small></label>)}</div></div>}
    {canManage && isWorkspace && <form className="card" onSubmit={add}><h2 className="card-title">Add brand or client</h2><div className="grid-2"><div className="form-group"><label>Name</label><input className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="JK Mall" /></div><div className="form-group"><label>Description</label><input className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Furniture social accounts" /></div></div><label className="form-label">Channels owned by this brand</label><div className="channel-picker">{assignmentChannels.map((channel) => <label className="channel-choice" key={channel.id}><input type="checkbox" checked={form.channelIds.includes(channel.id)} onChange={() => toggle(channel.id)} /> {channel.name} <small>{channel.provider}</small></label>)}</div><button className="btn btn-primary">Create brand</button></form>}
    <div className="card table-wrap"><table><thead><tr><th>Brand/client</th><th>Description</th><th>Owned channels</th>{canManage && <th />}</tr></thead><tbody>{visibleBrands.map((brand) => <tr key={brand.id}><td><strong>{brand.name}</strong></td><td className="text-muted">{brand.description || '—'}</td><td>{brand.channelIds.length ? brand.channelIds.map(channelName).join(', ') : <span className="text-muted">No channels assigned</span>}</td>{canManage && <td><button className="btn btn-danger btn-sm" onClick={async () => { if (confirm(`Delete ${brand.name}? Channels will remain connected.`)) { await workspace.removeBrand(brand.id); await load(); if (reloadBrands) await reloadBrands() } }}>Delete</button></td>}</tr>)}{!visibleBrands.length && <tr><td colSpan={4} className="text-muted">No brands yet. Add a client and assign its channels.</td></tr>}</tbody></table></div>
  </div>
}