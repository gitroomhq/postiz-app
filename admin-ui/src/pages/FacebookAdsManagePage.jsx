import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { facebookAds } from '../api'
import { useTenant } from '../tenant'

function pretty(value) {
  return String(value || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function StatusBadge({ status }) {
  const value = String(status || '').toUpperCase()
  const cls =
    value === 'ACTIVE' || value === 'IN_PROCESS' || value === 'WITH_ISSUES'
      ? 'badge badge-healthy'
      : value === 'PAUSED' || value === 'PENDING_REVIEW' || value === 'IN_REVIEW'
        ? 'badge badge-starting'
        : 'badge badge-unhealthy'
  return <span className={cls}>{pretty(value || 'unknown')}</span>
}

function StatusActions({ status, busy, onAction }) {
  const value = String(status || '').toUpperCase()
  return (
    <div className="ads-status-actions">
      <button type="button" className="btn btn-success btn-sm" disabled={busy || value === 'ACTIVE'} onClick={() => onAction('ACTIVE')}>
        Start
      </button>
      <button type="button" className="btn btn-ghost btn-sm" disabled={busy || value === 'PAUSED'} onClick={() => onAction('PAUSED')}>
        Pause
      </button>
      <button type="button" className="btn btn-danger btn-sm" disabled={busy || value === 'ARCHIVED'} onClick={() => onAction('ARCHIVED')}>
        Stop
      </button>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      {children}
    </div>
  )
}

function toInr(minor, offset = 100) {
  const n = Number(minor)
  if (!Number.isFinite(n)) return ''
  return String(Math.round(n / Math.max(1, offset)))
}

function tomorrowLocalIsoDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfLocalDayIso(dateStr) {
  // Asia/Calcutta morning 00:05 local as ISO
  return new Date(`${dateStr}T00:05:00+05:30`).toISOString()
}

function endOfLocalDayIso(dateStr) {
  return new Date(`${dateStr}T23:59:00+05:30`).toISOString()
}

export default function FacebookAdsManagePage() {
  const { tenantId, selectedBrand, isWorkspace } = useTenant()
  const fb = useMemo(
    () => ({
      status: () => facebookAds.status(tenantId),
      catalog: () => facebookAds.catalog(tenantId),
      campaigns: () => facebookAds.campaigns(tenantId),
      adGroups: () => facebookAds.adGroups(tenantId),
      ads: () => facebookAds.ads(tenantId),
      setCampaignStatus: (id, status) => facebookAds.setCampaignStatus(tenantId, id, status),
      setAdGroupStatus: (id, status) => facebookAds.setAdGroupStatus(tenantId, id, status),
      setAdStatus: (id, status) => facebookAds.setAdStatus(tenantId, id, status),
      updateCampaign: (id, body) => facebookAds.updateCampaign(tenantId, id, body),
      updateAdGroup: (id, body) => facebookAds.updateAdGroup(tenantId, id, body),
      updateAd: (id, body) => facebookAds.updateAd(tenantId, id, body),
      searchGeo: (q, type) => facebookAds.searchGeo(tenantId, q, type),
    }),
    [tenantId],
  )

  const [tab, setTab] = useState('campaigns') // campaigns | adgroups | ads
  const [catalog, setCatalog] = useState(null)
  const [connected, setConnected] = useState(false)
  const [campaigns, setCampaigns] = useState([])
  const [adGroups, setAdGroups] = useState([])
  const [ads, setAds] = useState([])
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [selectedAdGroupId, setSelectedAdGroupId] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [edit, setEdit] = useState(null) // { type, id, ...fields }
  const [geoQuery, setGeoQuery] = useState('')
  const [geoResults, setGeoResults] = useState([])

  const currencyOffset = catalog?.currencyOffset || 100

  async function refresh() {
    const [st, cat] = await Promise.all([fb.status(), fb.catalog()])
    setCatalog(cat)
    setConnected(!!st.connected)
    if (!st.connected) {
      setCampaigns([])
      setAdGroups([])
      setAds([])
      return
    }
    const [c, g, a] = await Promise.all([fb.campaigns(), fb.adGroups(), fb.ads()])
    setCampaigns(c.campaigns || [])
    setAdGroups(g.adGroups || [])
    setAds(a.ads || [])
  }

  useEffect(() => {
    ;(async () => {
      try {
        setError('')
        await refresh()
      } catch (e) {
        setError(e.message || String(e))
      }
    })()
  }, [tenantId])

  const filteredAdGroups = useMemo(() => {
    if (!selectedCampaignId) return adGroups
    return adGroups.filter((g) => String(g.campaign_id) === String(selectedCampaignId))
  }, [adGroups, selectedCampaignId])

  const filteredAds = useMemo(() => {
    if (selectedAdGroupId) return ads.filter((a) => String(a.adset_id) === String(selectedAdGroupId))
    if (selectedCampaignId) {
      const groupIds = new Set(filteredAdGroups.map((g) => String(g.id)))
      return ads.filter((a) => groupIds.has(String(a.adset_id)))
    }
    return ads
  }, [ads, selectedAdGroupId, selectedCampaignId, filteredAdGroups])

  async function runStatus(type, id, status) {
    setBusy(`${type}:${id}:${status}`)
    setError('')
    setNotice('')
    try {
      if (type === 'campaign') await fb.setCampaignStatus(id, status)
      else if (type === 'ad-group') await fb.setAdGroupStatus(id, status)
      else await fb.setAdStatus(id, status)
      await refresh()
      setNotice(`${pretty(type)} updated to ${pretty(status)}.`)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy('')
    }
  }

  function openEditAdGroup(group) {
    const targeting = group.targeting || {}
    const geo = targeting.geo_locations || {}
    setEdit({
      type: 'ad-group',
      id: group.id,
      name: group.name || '',
      dailyBudgetInr: toInr(group.daily_budget, currencyOffset) || '100',
      startDate: (group.start_time || '').slice(0, 10),
      endDate: (group.end_time || '').slice(0, 10),
      country: (geo.countries && geo.countries[0]) || 'IN',
      cities: (geo.cities || []).map((c) => ({
        key: String(c.key || c),
        name: c.name || String(c.key || c),
        radius: c.radius || 25,
      })),
      regions: (geo.regions || []).map((r) => ({
        key: String(r.key || r),
        name: r.name || String(r.key || r),
      })),
      areaRadius: '25',
    })
    setGeoQuery('')
    setGeoResults([])
    setTab('adgroups')
  }

  function openEditCampaign(campaign) {
    setEdit({
      type: 'campaign',
      id: campaign.id,
      name: campaign.name || '',
    })
  }

  function openEditAd(ad) {
    setEdit({
      type: 'ad',
      id: ad.id,
      name: ad.name || '',
    })
  }

  async function searchGeo() {
    const q = geoQuery.trim()
    if (q.length < 2) return
    try {
      const data = await fb.searchGeo(q, 'city,region')
      setGeoResults(data.locations || [])
    } catch (e) {
      setError(e.message || String(e))
    }
  }

  async function saveEdit() {
    if (!edit) return
    setBusy(`save:${edit.type}:${edit.id}`)
    setError('')
    setNotice('')
    try {
      if (edit.type === 'campaign') {
        await fb.updateCampaign(edit.id, { name: edit.name })
      } else if (edit.type === 'ad') {
        await fb.updateAd(edit.id, { name: edit.name })
      } else if (edit.type === 'ad-group') {
        const body = {
          name: edit.name,
          dailyBudgetInr: edit.dailyBudgetInr,
          currencyOffset,
          country: edit.country,
          cities: edit.cities,
          regions: edit.regions,
          areaRadius: edit.areaRadius,
        }
        if (edit.startDate) body.startTime = startOfLocalDayIso(edit.startDate)
        if (edit.endDate) body.endTime = endOfLocalDayIso(edit.endDate)
        await fb.updateAdGroup(edit.id, body)
      }
      await refresh()
      setNotice('Saved.')
      setEdit(null)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy('')
    }
  }

  async function resetForTomorrow(group) {
    const date = tomorrowLocalIsoDate()
    setBusy(`reset:${group.id}`)
    setError('')
    setNotice('')
    try {
      await fb.updateAdGroup(group.id, {
        startTime: startOfLocalDayIso(date),
        endTime: endOfLocalDayIso(date),
        currencyOffset,
      })
      // ensure paused overnight then user can start — keep current status, just schedule window
      await refresh()
      setNotice(`Ad group schedule set for ${date} (local). Pause now if you want it off until then, then Start on that day.`)
      openEditAdGroup({ ...group, start_time: startOfLocalDayIso(date), end_time: endOfLocalDayIso(date) })
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy('')
    }
  }

  if (!connected) {
    return (
      <div className="page">
        <h1 className="page-title">Ads Manager</h1>
        <p className="text-muted">Connect Facebook Ads first on the create page.</p>
        <Link className="btn btn-primary" to="/facebook-ads">
          Open Facebook Ads setup
        </Link>
      </div>
    )
  }

  return (
    <div className="page ads-manage-page">
      <div className="ads-manage-header">
        <div>
          <h1 className="page-title">Ads Manager</h1>
          <p className="text-muted text-sm">
            Control status, budget, locations, and schedule — {isWorkspace ? 'Workspace' : selectedBrand?.name || 'Brand'}
          </p>
        </div>
        <div className="form-actions">
          <Link className="btn btn-ghost" to="/facebook-ads">
            Create flow
          </Link>
          <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => refresh().catch((e) => setError(e.message))}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {notice && <div className="alert alert-info">{notice}</div>}

      <div className="ads-manage-tabs">
        {[
          ['campaigns', 'Campaigns'],
          ['adgroups', 'Ad sets'],
          ['ads', 'Ads'],
        ].map(([id, label]) => (
          <button key={id} type="button" className={`btn ${tab === id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="form-grid" style={{ marginBottom: 12 }}>
        <Field label="Filter by campaign">
          <select
            className="form-control"
            value={selectedCampaignId}
            onChange={(e) => {
              setSelectedCampaignId(e.target.value)
              setSelectedAdGroupId('')
            }}
          >
            <option value="">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Filter by ad set">
          <select className="form-control" value={selectedAdGroupId} onChange={(e) => setSelectedAdGroupId(e.target.value)}>
            <option value="">All ad sets</option>
            {filteredAdGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {tab === 'campaigns' && (
        <div className="card">
          <div className="table-wrap ads-table">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Objective</th>
                  <th>Delivery</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      <div className="text-muted text-sm">{c.id}</div>
                    </td>
                    <td>{pretty(c.objective)}</td>
                    <td>
                      <StatusBadge status={c.effective_status || c.status} />
                    </td>
                    <td>{pretty(c.status)}</td>
                    <td>
                      <StatusActions
                        status={c.status}
                        busy={String(busy).startsWith(`campaign:${c.id}:`)}
                        onAction={(s) => runStatus('campaign', c.id, s)}
                      />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditCampaign(c)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!campaigns.length && <p className="text-muted text-sm">No campaigns yet.</p>}
          </div>
        </div>
      )}

      {tab === 'adgroups' && (
        <div className="card">
          <div className="table-wrap ads-table">
            <table>
              <thead>
                <tr>
                  <th>Ad set</th>
                  <th>Budget</th>
                  <th>Schedule</th>
                  <th>Locations</th>
                  <th>Delivery</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdGroups.map((g) => {
                  const geo = g.targeting?.geo_locations || {}
                  const locBits = []
                  if (geo.cities?.length) locBits.push(geo.cities.map((c) => c.name || c.key).join(', '))
                  if (geo.regions?.length) locBits.push(geo.regions.map((r) => r.name || r.key).join(', '))
                  if (geo.countries?.length) locBits.push(geo.countries.join(', '))
                  return (
                    <tr key={g.id}>
                      <td>
                        <strong>{g.name}</strong>
                        <div className="text-muted text-sm">{pretty(g.optimization_goal)}</div>
                      </td>
                      <td>{g.daily_budget ? `₹${toInr(g.daily_budget, currencyOffset)} / day` : '—'}</td>
                      <td className="text-sm">
                        {(g.start_time || '').slice(0, 10) || '—'}
                        {g.end_time ? ` → ${(g.end_time || '').slice(0, 10)}` : ' → ongoing'}
                      </td>
                      <td className="text-sm">{locBits.join(' · ') || '—'}</td>
                      <td>
                        <StatusBadge status={g.effective_status || g.status} />
                      </td>
                      <td>
                        <StatusActions
                          status={g.status}
                          busy={String(busy).startsWith(`ad-group:${g.id}:`)}
                          onAction={(s) => runStatus('ad-group', g.id, s)}
                        />
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditAdGroup(g)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={!!busy}
                          onClick={() => resetForTomorrow(g)}
                        >
                          Reset next day
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!filteredAdGroups.length && <p className="text-muted text-sm">No ad sets yet.</p>}
          </div>
        </div>
      )}

      {tab === 'ads' && (
        <div className="card">
          <div className="table-wrap ads-table">
            <table>
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>Ad set</th>
                  <th>Delivery</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAds.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.name}</strong>
                      <div className="text-muted text-sm">{a.id}</div>
                    </td>
                    <td className="text-sm">{adGroups.find((g) => g.id === a.adset_id)?.name || a.adset_id}</td>
                    <td>
                      <StatusBadge status={a.effective_status || a.status} />
                    </td>
                    <td>{pretty(a.status)}</td>
                    <td>
                      <StatusActions
                        status={a.status}
                        busy={String(busy).startsWith(`ad:${a.id}:`)}
                        onAction={(s) => runStatus('ad', a.id, s)}
                      />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditAd(a)}>
                        Edit name
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredAds.length && <p className="text-muted text-sm">No ads yet.</p>}
          </div>
        </div>
      )}

      {edit && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">Edit {pretty(edit.type)}</div>
          <div className="form-grid">
            <Field label="Name">
              <input className="form-control" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </Field>
            {edit.type === 'ad-group' && (
              <>
                <Field label="Daily budget (INR ₹)">
                  <input
                    className="form-control"
                    type="number"
                    min="1"
                    value={edit.dailyBudgetInr}
                    onChange={(e) => setEdit({ ...edit, dailyBudgetInr: e.target.value })}
                  />
                </Field>
                <Field label="Start date">
                  <input
                    className="form-control"
                    type="date"
                    value={edit.startDate || ''}
                    onChange={(e) => setEdit({ ...edit, startDate: e.target.value })}
                  />
                </Field>
                <Field label="End date">
                  <input
                    className="form-control"
                    type="date"
                    value={edit.endDate || ''}
                    onChange={(e) => setEdit({ ...edit, endDate: e.target.value })}
                  />
                </Field>
                <Field label="Country fallback">
                  <input
                    className="form-control"
                    value={edit.country}
                    onChange={(e) => setEdit({ ...edit, country: e.target.value.toUpperCase() })}
                  />
                </Field>
                <Field label="Area radius (km)">
                  <input
                    className="form-control"
                    type="number"
                    min="17"
                    max="80"
                    value={edit.areaRadius}
                    onChange={(e) => setEdit({ ...edit, areaRadius: e.target.value })}
                  />
                </Field>
                <div className="form-group span-2">
                  <label>Search city / region</label>
                  <div className="ads-search-row">
                    <input className="form-control" value={geoQuery} onChange={(e) => setGeoQuery(e.target.value)} />
                    <button type="button" className="btn btn-ghost" onClick={searchGeo}>
                      Search
                    </button>
                  </div>
                  {!!geoResults.length && (
                    <div className="ads-chip-results">
                      {geoResults.map((loc) => (
                        <button
                          key={loc.key}
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            if (loc.type === 'city') {
                              setEdit((old) => ({
                                ...old,
                                cities: [...(old.cities || []).filter((c) => c.key !== loc.key), { key: loc.key, name: loc.name, radius: Number(old.areaRadius) || 25 }],
                              }))
                            } else {
                              setEdit((old) => ({
                                ...old,
                                regions: [...(old.regions || []).filter((r) => r.key !== loc.key), { key: loc.key, name: loc.name }],
                              }))
                            }
                          }}
                        >
                          + {loc.name} ({loc.type})
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="ads-chip-list">
                    {(edit.cities || []).map((city) => (
                      <span className="ads-chip" key={city.key}>
                        City: {city.name}
                        <button
                          type="button"
                          onClick={() => setEdit((old) => ({ ...old, cities: old.cities.filter((c) => c.key !== city.key) }))}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {(edit.regions || []).map((region) => (
                      <span className="ads-chip" key={region.key}>
                        Region: {region.name}
                        <button
                          type="button"
                          onClick={() => setEdit((old) => ({ ...old, regions: old.regions.filter((r) => r.key !== region.key) }))}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-primary" disabled={!!busy} onClick={saveEdit}>
              {busy.startsWith('save:') ? 'Saving...' : 'Save changes'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
