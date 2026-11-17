import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { access, facebookAds } from '../api'
import { useTenant } from '../tenant'

function pretty(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}


function adsApi(tenantId) {
  return {
    catalog: () => facebookAds.catalog(tenantId),
    status: () => facebookAds.status(tenantId),
    authUrl: () => facebookAds.authUrl(tenantId),
    businesses: () => facebookAds.businesses(tenantId),
    adAccounts: (businessId) => facebookAds.adAccounts(tenantId, businessId),
    select: (body) => facebookAds.select(tenantId, body),
    pages: () => facebookAds.pages(tenantId),
    pagePosts: (pageId) => facebookAds.pagePosts(tenantId, pageId),
    leadForms: (pageId) => facebookAds.leadForms(tenantId, pageId),
    createLeadForm: (pageId, body) => facebookAds.createLeadForm(tenantId, pageId, body),
    campaigns: () => facebookAds.campaigns(tenantId),
    createCampaign: (body) => facebookAds.createCampaign(tenantId, body),
    adGroups: () => facebookAds.adGroups(tenantId),
    createAdGroup: (body) => facebookAds.createAdGroup(tenantId, body),
    ads: () => facebookAds.ads(tenantId),
    createAd: (body) => facebookAds.createAd(tenantId, body),
    setCampaignStatus: (id, status) => facebookAds.setCampaignStatus(tenantId, id, status),
    setAdGroupStatus: (id, status) => facebookAds.setAdGroupStatus(tenantId, id, status),
    setAdStatus: (id, status) => facebookAds.setAdStatus(tenantId, id, status),
    searchGeo: (q, type) => facebookAds.searchGeo(tenantId, q, type),
    searchInterests: (q) => facebookAds.searchInterests(tenantId, q),
    audiences: () => facebookAds.audiences(tenantId),
  }
}

function Field({ label, className = '', children }) {
  return (
    <div className={`form-group ${className}`.trim()}>
      <label>{label}</label>
      {children}
    </div>
  )
}

function Select({ value, onChange, required, children }) {
  return (
    <select className="form-control ads-select" value={value} onChange={onChange} required={required}>
      {children}
    </select>
  )
}

function ResultTable({ columns, rows, empty }) {
  if (!rows?.length) {
    return <p className="text-muted text-sm">{empty}</p>
  }
  return (
    <div className="table-wrap ads-table">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {row.cells.map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusBadge({ status }) {
  const value = String(status || '').toUpperCase()
  const cls = value === 'ACTIVE' ? 'badge badge-healthy' : value === 'PAUSED' ? 'badge badge-starting' : 'badge badge-unhealthy'
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

export default function FacebookAdsPage() {
  const params = new URLSearchParams(window.location.search)
  const { tenantId, setTenantId, brands, selectedBrand, isWorkspace, channelIds } = useTenant()
  const [channels, setChannels] = useState([])
  const [catalog, setCatalog] = useState(null)
  const [status, setStatus] = useState(null)
  const [businesses, setBusinesses] = useState([])
  const [adAccounts, setAdAccounts] = useState([])
  const [pages, setPages] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [adGroups, setAdGroups] = useState([])
  const [ads, setAds] = useState([])
  const [businessId, setBusinessId] = useState('')
  const [adAccountId, setAdAccountId] = useState('')
  const [error, setError] = useState(params.get('error') || '')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')
  const [campaignForm, setCampaignForm] = useState({ name: '', objective: 'OUTCOME_TRAFFIC' })
  const [adGroupForm, setAdGroupForm] = useState({
    name: '',
    campaignId: '',
    optimizationGoal: 'LEAD_GENERATION',
    bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
    destinationType: 'ON_AD',
    billingEvent: 'IMPRESSIONS',
    dailyBudgetInr: '500',
    bidAmountInr: '',
    country: 'IN',
    areaQuery: '',
    interestQuery: '',
    areaRadius: '25',
    ageMin: '18',
    ageMax: '65',
    gender: '0',
    cities: [],
    regions: [],
    interests: [],
    customAudiences: [],
    pageId: '',
    advantageAudience: true,
    advantagePlacements: true,
    leadGenFormId: '',
    autoCreateLeadForm: false,
    privacyPolicyUrl: '',
    leadFormName: '',
  })
  const [leadForms, setLeadForms] = useState([])
  const [loadingLeadForms, setLoadingLeadForms] = useState(false)
  const [geoResults, setGeoResults] = useState([])
  const [interestResults, setInterestResults] = useState([])
  const [audiences, setAudiences] = useState([])
  const [searchBusy, setSearchBusy] = useState('')
  const [pagePosts, setPagePosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [adForm, setAdForm] = useState({
    name: '',
    adGroupId: '',
    pageId: '',
    creativeSource: 'existing_post',
    objectStoryId: '',
    manualPostRef: '',
    leadGenFormId: '',
    dailyBudgetInr: '500',
    message: '',
    link: '',
    headline: '',
    description: '',
    imageUrl: '',
  })

  const fb = adsApi(tenantId)

  async function refreshLists() {
    const [pageData, campaignData, groupData, adData] = await Promise.all([
      fb.pages(),
      fb.campaigns(),
      fb.adGroups(),
      fb.ads(),
    ])
    setPages(pageData.pages || [])
    setCampaigns(campaignData.campaigns || [])
    setAdGroups(groupData.adGroups || [])
    setAds(adData.ads || [])
    setAdGroupForm((old) => ({ ...old, campaignId: old.campaignId || campaignData.campaigns?.[0]?.id || '' }))
    setAdForm((old) => ({
      ...old,
      adGroupId: old.adGroupId || groupData.adGroups?.[0]?.id || '',
      pageId: old.pageId || pageData.pages?.[0]?.id || '',
    }))
    try {
      const audienceData = await fb.audiences()
      setAudiences(audienceData.audiences || [])
    } catch (_) {
      setAudiences([])
    }
  }

  useEffect(() => {
    const fromUrl = params.get('tenant')
    if (fromUrl && fromUrl !== tenantId) setTenantId(fromUrl)
    access.channels().then(setChannels).catch(() => setChannels([]))
  }, [])

  useEffect(() => {
    (async () => {
      try {
        setError('')
        setBusinesses([])
        setAdAccounts([])
        setPages([])
        setCampaigns([])
        setAdGroups([])
        setAds([])
        const [nextCatalog, nextStatus] = await Promise.all([fb.catalog(), fb.status()])
        setCatalog(nextCatalog)
        setStatus(nextStatus)
        setBusinessId(nextStatus.connection?.selectedBusinessId || '')
        setAdAccountId(nextStatus.connection?.selectedAdAccountId || '')
        if (nextStatus.connected) {
          const biz = await fb.businesses()
          setBusinesses(biz.businesses || [])
          const accounts = await fb.adAccounts(nextStatus.connection?.selectedBusinessId)
          setAdAccounts(accounts.adAccounts || [])
          if (nextStatus.connection?.selectedAdAccountId) await refreshLists()
        }
      } catch (e) {
        setError(e.message)
      }
    })()
  }, [tenantId])

  async function connect() {
    setError('')
    try {
      const { url } = await fb.authUrl()
      window.location.href = url
    } catch (e) {
      setError(e.message)
    }
  }

  async function loadPagePosts(pageId) {
    setPagePosts([])
    setAdForm((old) => ({ ...old, pageId, objectStoryId: '' }))
    if (!pageId) return
    setLoadingPosts(true)
    setError('')
    try {
      const data = await fb.pagePosts(pageId)
      const posts = data.posts || []
      setPagePosts(posts)
      if (!posts.length) {
        const detail = (data.sourceErrors || []).slice(0, 2).join(' | ')
        setNotice('No promotable posts returned. Click Reload posts, Reconnect, or paste a post URL/ID. ' + (detail ? ('Meta: ' + detail) : ''))
      } else {
        setNotice('')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingPosts(false)
    }
  }

  function campaignById(id) {
    return campaigns.find((campaign) => campaign.id === id) || null
  }

  function goalsForCampaign(campaignId) {
    const objective = campaignById(campaignId)?.objective || campaignForm.objective || 'OUTCOME_TRAFFIC'
    const mapped = catalog?.optimizationGoalsByObjective?.[objective]
    return mapped?.length ? mapped : (catalog?.optimizationGoals || [])
  }

  function onCampaignPicked(campaignId) {
    const goals = goalsForCampaign(campaignId)
    const nextGoal = goals.includes(adGroupForm.optimizationGoal) ? adGroupForm.optimizationGoal : (goals[0] || 'LINK_CLICKS')
    const objective = campaignById(campaignId)?.objective || ''
    const nextDestination = objective === 'OUTCOME_LEADS' ? 'ON_AD' : adGroupForm.destinationType
    setAdGroupForm((old) => ({
      ...old,
      campaignId,
      optimizationGoal: nextGoal,
      destinationType: nextDestination,
    }))
  }

  async function loadLeadForms(pageId) {
    setLoadingLeadForms(true)
    try {
      if (!pageId) {
        setLeadForms([])
        return
      }
      const data = await fb.leadForms(pageId)
      setLeadForms(data.forms || [])
      setAdGroupForm((old) => ({
        ...old,
        leadGenFormId: old.leadGenFormId || data.forms?.[0]?.id || '',
      }))
      setAdForm((old) => ({
        ...old,
        leadGenFormId: old.leadGenFormId || data.forms?.[0]?.id || '',
      }))
    } catch (err) {
      setLeadForms([])
      setError(err.message || String(err))
    } finally {
      setLoadingLeadForms(false)
    }
  }

  async function searchAreas() {
    const q = String(adGroupForm.areaQuery || '').trim()
    if (q.length < 2) return
    setSearchBusy('geo')
    try {
      const data = await fb.searchGeo(q, 'city,region')
      setGeoResults(data.locations || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setSearchBusy('')
    }
  }

  async function searchTags() {
    const q = String(adGroupForm.interestQuery || '').trim()
    if (q.length < 2) return
    setSearchBusy('interest')
    try {
      const data = await fb.searchInterests(q)
      setInterestResults(data.interests || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setSearchBusy('')
    }
  }

  function clampCityRadius(value) {
    const n = Number(value)
    if (!Number.isFinite(n)) return 25
    return Math.min(80, Math.max(17, n))
  }

  function addCity(location) {
    setAdGroupForm((old) => {
      if (old.cities.some((city) => city.key === location.key)) return old
      return {
        ...old,
        cities: [...old.cities, { key: location.key, name: location.name, radius: clampCityRadius(old.areaRadius || 25), distanceUnit: 'kilometer' }],
        areaQuery: '',
      }
    })
    setGeoResults([])
  }

  function addRegion(location) {
    setAdGroupForm((old) => {
      if (old.regions.some((region) => region.key === location.key)) return old
      return {
        ...old,
        regions: [...old.regions, { key: location.key, name: location.name }],
        areaQuery: '',
      }
    })
    setGeoResults([])
  }

  function addInterest(interest) {
    setAdGroupForm((old) => {
      if (old.interests.some((item) => item.id === interest.id)) return old
      return {
        ...old,
        interests: [...old.interests, { id: interest.id, name: interest.name }],
        interestQuery: '',
      }
    })
    setInterestResults([])
  }

  function toggleAudience(id) {
    setAdGroupForm((old) => ({
      ...old,
      customAudiences: old.customAudiences.includes(id)
        ? old.customAudiences.filter((item) => item !== id)
        : [...old.customAudiences, id],
    }))
  }

    async function setObjectStatus(kind, id, status) {
    const key = `${kind}:${id}:${status}`
    setBusy(key)
    setError('')
    setNotice('')
    try {
      if (kind === 'campaign') await fb.setCampaignStatus(id, status)
      else if (kind === 'ad-group') await fb.setAdGroupStatus(id, status)
      else await fb.setAdStatus(id, status)
      await refreshLists()
      setNotice(`${pretty(kind)} set to ${pretty(status)}.`)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  async function loadAccounts(id) {
    setBusinessId(id)
    try {
      const accounts = await fb.adAccounts(id)
      setAdAccounts(accounts.adAccounts || [])
    } catch (e) {
      setError(e.message)
    }
  }

  const connected = Boolean(status?.connected)
  const ready = Boolean(status?.connection?.selectedAdAccountId)
  const scopedPages = useMemo(() => {
    if (isWorkspace || !channelIds.length) return pages
    const assigned = channels.filter((channel) => channelIds.includes(channel.id))
    const internal = new Set(assigned.map((channel) => String(channel.internalId || '')).filter(Boolean))
    const names = new Set(assigned.map((channel) => (channel.name || '').toLowerCase()).filter(Boolean))
    const filtered = pages.filter((page) => internal.has(String(page.id)) || names.has((page.name || '').toLowerCase()))
    return filtered.length ? filtered : pages
  }, [pages, channels, channelIds, isWorkspace])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Facebook Ads</h1>
          <p className="text-muted" style={{ marginTop: 6 }}>
            Create campaigns, ad groups, and ads in Business Manager. Marketing API {catalog?.graphVersion || 'v26.0'} — not organic Page posting.
          </p>
        </div>
        {connected && (
          <span className="badge badge-healthy">Connected as {status.connection?.name}</span>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      <div className="alert alert-info">
        Facebook Ads uses the sidebar Brand/client switcher.
        {isWorkspace ? ' Currently: Workspace (shared).' : ` Currently: ${selectedBrand?.name || 'selected brand'}.`}
        {' '}Each brand has its own Ads connection, ad account, campaigns, and ads.
      </div>
      {!brands.length && (
        <p className="text-muted text-sm ads-hint">No brands yet. Add clients under Brands &amp; Clients, then connect Facebook Ads for each one.</p>
      )}

      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="card">
        <div className="card-head">
          <div>
            <div className="form-actions" style={{ marginBottom: 12 }}><Link className="btn btn-primary btn-sm" to="/facebook-ads/manage">Open Ads Manager</Link></div>
          <div className="card-title">1. Connect Business Manager</div>
            <p className="text-muted text-sm">
              {connected
                ? 'Token is stored for this Admin UI. Reconnect if you switched Business Manager or lost ads permissions.'
                : 'Grant ads_management, ads_read, and business_management. Use an Admin or Developer role on the Meta app while it is in Development.'}
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={connect}>
            {connected ? 'Reconnect' : 'Connect Facebook Ads'}
          </button>
        </div>
      </div>

      {connected && (
        <form
          className="card"
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy('select')
            setError('')
            setNotice('')
            try {
              await fb.select({ businessId, adAccountId })
              await refreshLists()
              setNotice('Ad account selected.')
            } catch (e) {
              setError(e.message)
            } finally {
              setBusy('')
            }
          }}
        >
          <div className="card-title">2. Business Manager and ad account</div>
          <div className="form-grid">
            <Field label="Business Manager">
              <Select value={businessId} onChange={(e) => loadAccounts(e.target.value)}>
                <option value="">All ad accounts I can access</option>
                {businesses.map((biz) => (
                  <option key={biz.id} value={biz.id}>
                    {biz.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ad account">
              <Select value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)} required>
                <option value="">Select an ad account</option>
                {adAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.account_id || account.id})
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy === 'select'}>
            {busy === 'select' ? 'Saving…' : 'Use this ad account'}
          </button>
        </form>
      )}

      {ready && (
        <>
          <form
            className="card"
            onSubmit={async (event) => {
              event.preventDefault()
              setBusy('campaign')
              setError('')
              setNotice('')
              try {
                const created = await fb.createCampaign(campaignForm)
                await refreshLists()
                setAdGroupForm((old) => ({ ...old, campaignId: created.id || old.campaignId }))
                setCampaignForm({ name: '', objective: campaignForm.objective })
                setNotice('Campaign created as paused.')
              } catch (e) {
                setError(e.message)
              } finally {
                setBusy('')
              }
            }}
          >
            <div className="card-title">3. Campaign</div>
            <div className="form-grid">
              <Field label="Campaign name">
                <input
                  className="form-control"
                  required
                  placeholder="Summer traffic"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                />
              </Field>
              <Field label="Objective">
                <Select
                  value={campaignForm.objective}
                  onChange={(e) => setCampaignForm({ ...campaignForm, objective: e.target.value })}
                >
                  {(catalog?.campaignObjectives || []).map((value) => (
                    <option key={value} value={value}>
                      {pretty(value)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={busy === 'campaign'}>
                {busy === 'campaign' ? 'Creating…' : 'Create campaign (paused)'}
              </button>
            </div>
            <ResultTable
              empty="No campaigns yet."
              columns={['Name', 'Objective', 'Status', 'Actions']}
              rows={campaigns.map((campaign) => ({
                id: campaign.id,
                cells: [
                  campaign.name,
                  pretty(campaign.objective),
                  <StatusBadge key="st" status={campaign.status} />,
                  <StatusActions
                    key="act"
                    status={campaign.status}
                    busy={String(busy).startsWith(`campaign:${campaign.id}:`)}
                    onAction={(status) => setObjectStatus('campaign', campaign.id, status)}
                  />,
                ],
              }))}
            />
          </form>

          <form
            className="card"
            onSubmit={async (event) => {
              event.preventDefault()
              setBusy('ad-group')
              setError('')
              setNotice('')
              try {
                if (adGroupForm.autoCreateLeadForm) {
                  const privacy = String(adGroupForm.privacyPolicyUrl || adForm.link || '').trim()
                  if (!/^https?:\/\//i.test(privacy)) {
                    setError('Auto Instant Form needs a real https privacy URL in Step 4, or set Destination URL in Step 5 first. Or uncheck Auto-create Instant Form.')
                    setBusy('')
                    return
                  }
                }
                const created = await fb.createAdGroup({
                  name: adGroupForm.name,
                  campaignId: adGroupForm.campaignId,
                  optimizationGoal: adGroupForm.optimizationGoal,
                  bidStrategy: adGroupForm.bidStrategy,
                  destinationType: adGroupForm.destinationType,
                  billingEvent: adGroupForm.billingEvent,
                  dailyBudgetInr: 100,
                  bidAmountInr: adGroupForm.bidAmountInr,
                  currencyOffset: catalog?.currencyOffset || 100,
                  country: adGroupForm.country,
                  countries: [adGroupForm.country || 'IN'],
                  cities: adGroupForm.cities.map((city) => ({ ...city, radius: clampCityRadius(city.radius || adGroupForm.areaRadius) })),
                  regions: adGroupForm.regions,
                  interests: adGroupForm.interests,
                  customAudiences: adGroupForm.customAudiences,
                  ageMin: adGroupForm.ageMin,
                  ageMax: adGroupForm.ageMax,
                  gender: adGroupForm.gender,
                  areaRadius: adGroupForm.areaRadius,
                  pageId: adGroupForm.pageId,
                  advantageAudience: adGroupForm.advantageAudience,
                  advantagePlacements: adGroupForm.advantagePlacements,
                  leadGenFormId: adGroupForm.autoCreateLeadForm ? '' : adGroupForm.leadGenFormId,
                  autoCreateLeadForm: adGroupForm.autoCreateLeadForm,
                  privacyPolicyUrl: (adGroupForm.privacyPolicyUrl || adForm.link || '').trim(),
                  leadFormName: adGroupForm.leadFormName || (adGroupForm.name ? adGroupForm.name + ' form' : ''),
                })
                await refreshLists()
                const formId = created.lead_gen_form_id || ''
                setAdForm((old) => ({
                  ...old,
                  adGroupId: created.id || old.adGroupId,
                  pageId: created.page_id || adGroupForm.pageId || old.pageId,
                  leadGenFormId: formId || old.leadGenFormId,
                  creativeSource: formId ? 'instant_form' : old.creativeSource,
                }))
                setAdGroupForm((old) => ({
                  ...old,
                  name: '',
                  autoCreateLeadForm: false,
                  leadGenFormId: formId || old.leadGenFormId,
                }))
                if (adGroupForm.pageId) await loadLeadForms(adGroupForm.pageId)
                setNotice(formId
                  ? 'Ad group created as paused. Instant Form ready — create the ad next.'
                  : 'Ad group created as paused.')
              } catch (e) {
                setError(e.message)
              } finally {
                setBusy('')
              }
            }}
          >
            <div className="card-title">4. Ad group</div>
            <p className="text-muted text-sm ads-hint">
              Facebook calls this an ad set. Set targeting here; set INR budget on the Ad step. City radius must be 17–80 km. If you pick multiple cities, leave country as IN but we send cities only (no country conflict). Leads campaigns need Lead Generation, not Link Clicks.
            </p>
            <div className="form-grid">
              <Field label="Ad group name">
                <input
                  className="form-control"
                  required
                  placeholder="India link clicks"
                  value={adGroupForm.name}
                  onChange={(e) => setAdGroupForm({ ...adGroupForm, name: e.target.value })}
                />
              </Field>
              <Field label="Campaign">
                <Select
                  required
                  value={adGroupForm.campaignId}
                  onChange={(e) => onCampaignPicked(e.target.value)}
                >
                  <option value="">Select a campaign</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name} ({pretty(campaign.objective)})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Promoted Facebook Page">
                <Select
                  required
                  value={adGroupForm.pageId}
                  onChange={(e) => {
                    const pageId = e.target.value
                    setAdGroupForm({ ...adGroupForm, pageId, leadGenFormId: '' })
                    setAdForm((old) => ({ ...old, pageId: pageId || old.pageId }))
                    loadLeadForms(pageId)
                  }}
                >
                  <option value="">Select a Page</option>
                  {scopedPages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="form-row two">
                <Field label="Advantage+ audience">
                  <label className="check-line">
                    <input
                      type="checkbox"
                      checked={!!adGroupForm.advantageAudience}
                      onChange={(e) => setAdGroupForm({ ...adGroupForm, advantageAudience: e.target.checked })}
                    />
                    Let Meta expand audience beyond interests/age
                  </label>
                </Field>
                <Field label="Advantage+ placements">
                  <label className="check-line">
                    <input
                      type="checkbox"
                      checked={!!adGroupForm.advantagePlacements}
                      onChange={(e) => setAdGroupForm({ ...adGroupForm, advantagePlacements: e.target.checked })}
                    />
                    Auto placements (Facebook / Instagram / Audience Network)
                  </label>
                </Field>
              </div>
              <Field label="Instant Form (Lead Gen)">
                <select
                  value={adGroupForm.leadGenFormId}
                  disabled={adGroupForm.autoCreateLeadForm}
                  onChange={(e) => {
                    const id = e.target.value
                    setAdGroupForm({ ...adGroupForm, leadGenFormId: id, autoCreateLeadForm: false })
                    setAdForm((old) => ({ ...old, leadGenFormId: id || old.leadGenFormId }))
                  }}
                >
                  <option value="">{adGroupForm.autoCreateLeadForm ? 'Will auto-create on save' : 'Select an Instant Form'}</option>
                  {leadForms.map((form) => (
                    <option key={form.id} value={form.id}>{form.name || form.id}</option>
                  ))}
                </select>
                <label className="check-line" style={{ marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!adGroupForm.autoCreateLeadForm}
                    onChange={(e) => setAdGroupForm({ ...adGroupForm, autoCreateLeadForm: e.target.checked })}
                  />
                  Auto-create Instant Form (name + email + phone)
                </label>
                {loadingLeadForms && <p className="muted">Loading forms...</p>}
              </Field>
              {adGroupForm.autoCreateLeadForm && (
                <div className="form-row two">
                  <Field label="Privacy policy URL (type a real https link — placeholder ignored)">
                    <input
                      value={adGroupForm.privacyPolicyUrl}
                      onChange={(e) => setAdGroupForm({ ...adGroupForm, privacyPolicyUrl: e.target.value })}
                      placeholder="https://yoursite.com/privacy"
                    />
                  </Field>
                  <Field label="New form name">
                    <input
                      value={adGroupForm.leadFormName}
                      onChange={(e) => setAdGroupForm({ ...adGroupForm, leadFormName: e.target.value })}
                      placeholder="Auto from ad group name"
                    />
                  </Field>
                </div>
              )}

              <Field label="Algorithm (optimization goal)">
                <Select
                  value={adGroupForm.optimizationGoal}
                  onChange={(e) => setAdGroupForm({ ...adGroupForm, optimizationGoal: e.target.value })}
                >
                  {goalsForCampaign(adGroupForm.campaignId).map((value) => (
                    <option key={value} value={value}>
                      {pretty(value)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Bid strategy">
                <Select
                  value={adGroupForm.bidStrategy}
                  onChange={(e) => setAdGroupForm({ ...adGroupForm, bidStrategy: e.target.value })}
                >
                  {(catalog?.bidStrategies || []).map((value) => (
                    <option key={value} value={value}>
                      {pretty(value)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Destination">
                <Select
                  value={adGroupForm.destinationType}
                  onChange={(e) => setAdGroupForm({ ...adGroupForm, destinationType: e.target.value })}
                >
                  {(catalog?.destinationTypes || []).map((value) => (
                    <option key={value} value={value}>
                      {pretty(value)}
                    </option>
                  ))}
                </Select>
              </Field>
              {(adGroupForm.bidStrategy === 'LOWEST_COST_WITH_BID_CAP' || adGroupForm.bidStrategy === 'COST_CAP') && (
                <Field label="Bid amount (INR ₹)">
                  <input
                    className="form-control"
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={adGroupForm.bidAmountInr}
                    onChange={(e) => setAdGroupForm({ ...adGroupForm, bidAmountInr: e.target.value })}
                  />
                </Field>
              )}
              <Field label="Country">
                <input
                  className="form-control"
                  required
                  maxLength={2}
                  placeholder="IN"
                  value={adGroupForm.country}
                  onChange={(e) => setAdGroupForm({ ...adGroupForm, country: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Area radius (km)">
                <input
                  className="form-control"
                  type="number"
                  min="17"
                  max="80"
                  value={adGroupForm.areaRadius}
                  onChange={(e) => setAdGroupForm({ ...adGroupForm, areaRadius: String(clampCityRadius(e.target.value)) })}
                />
              </Field>
              <Field label="Age min">
                <input
                  className="form-control"
                  type="number"
                  min="13"
                  max="65"
                  value={adGroupForm.ageMin}
                  onChange={(e) => setAdGroupForm({ ...adGroupForm, ageMin: e.target.value })}
                />
              </Field>
              <Field label="Age max">
                <input
                  className="form-control"
                  type="number"
                  min="13"
                  max="65"
                  value={adGroupForm.ageMax}
                  onChange={(e) => setAdGroupForm({ ...adGroupForm, ageMax: e.target.value })}
                />
              </Field>
              <Field label="Gender">
                <Select
                  value={adGroupForm.gender}
                  onChange={(e) => setAdGroupForm({ ...adGroupForm, gender: e.target.value })}
                >
                  {(catalog?.genders || [
                    { id: 0, label: 'All' },
                    { id: 1, label: 'Male' },
                    { id: 2, label: 'Female' },
                  ]).map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Search area (city / region)" className="span-2">
                <div className="ads-search-row">
                  <input
                    className="form-control"
                    placeholder="e.g. Jaipur, Rajasthan, Deogarh (radius 17–80 km)"
                    value={adGroupForm.areaQuery}
                    onChange={(e) => setAdGroupForm({ ...adGroupForm, areaQuery: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        searchAreas()
                      }
                    }}
                  />
                  <button type="button" className="btn btn-ghost" disabled={searchBusy === 'geo'} onClick={searchAreas}>
                    {searchBusy === 'geo' ? 'Searching…' : 'Search'}
                  </button>
                </div>
                {!!geoResults.length && (
                  <div className="ads-chip-results">
                    {geoResults.map((location) => (
                      <button
                        type="button"
                        key={`${location.type}-${location.key}`}
                        className="btn btn-ghost btn-sm"
                        onClick={() => (location.type === 'region' ? addRegion(location) : addCity(location))}
                      >
                        + {location.name} ({location.type})
                      </button>
                    ))}
                  </div>
                )}
                <div className="ads-chip-list">
                  {adGroupForm.cities.map((city) => (
                    <span className="ads-chip" key={city.key}>
                      City: {city.name || city.key} · {clampCityRadius(city.radius || adGroupForm.areaRadius)}km
                      <button
                        type="button"
                        onClick={() => setAdGroupForm((old) => ({ ...old, cities: old.cities.filter((item) => item.key !== city.key) }))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {adGroupForm.regions.map((region) => (
                    <span className="ads-chip" key={region.key}>
                      Region: {region.name || region.key}
                      <button
                        type="button"
                        onClick={() => setAdGroupForm((old) => ({ ...old, regions: old.regions.filter((item) => item.key !== region.key) }))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </Field>
              <Field label="Interest tags" className="span-2">
                <div className="ads-search-row">
                  <input
                    className="form-control"
                    placeholder="e.g. furniture, electronics, home decor"
                    value={adGroupForm.interestQuery}
                    onChange={(e) => setAdGroupForm({ ...adGroupForm, interestQuery: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        searchTags()
                      }
                    }}
                  />
                  <button type="button" className="btn btn-ghost" disabled={searchBusy === 'interest'} onClick={searchTags}>
                    {searchBusy === 'interest' ? 'Searching…' : 'Search'}
                  </button>
                </div>
                {!!interestResults.length && (
                  <div className="ads-chip-results">
                    {interestResults.map((interest) => (
                      <button type="button" key={interest.id} className="btn btn-ghost btn-sm" onClick={() => addInterest(interest)}>
                        + {interest.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="ads-chip-list">
                  {adGroupForm.interests.map((interest) => (
                    <span className="ads-chip" key={interest.id}>
                      {interest.name}
                      <button
                        type="button"
                        onClick={() => setAdGroupForm((old) => ({ ...old, interests: old.interests.filter((item) => item.id !== interest.id) }))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </Field>
              <Field label="Audience groups (custom audiences)" className="span-2">
                {!audiences.length ? (
                  <p className="text-muted text-sm">No custom audiences on this ad account yet. Create them in Meta Ads Manager, then refresh.</p>
                ) : (
                  <div className="channel-picker">
                    {audiences.map((audience) => (
                      <label className="channel-choice" key={audience.id}>
                        <input
                          type="checkbox"
                          checked={adGroupForm.customAudiences.includes(audience.id)}
                          onChange={() => toggleAudience(audience.id)}
                        />{' '}
                        {audience.name}
                        <small>{audience.subtype || 'audience'}</small>
                      </label>
                    ))}
                  </div>
                )}
              </Field>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={busy === 'ad-group'}>
                {busy === 'ad-group' ? 'Creating…' : 'Create ad group (paused)'}
              </button>
            </div>
            <ResultTable
              empty="No ad groups yet."
              columns={['Name', 'Algorithm', 'Bid', 'Destination', 'Status', 'Actions']}
              rows={adGroups.map((group) => ({
                id: group.id,
                cells: [
                  group.name,
                  pretty(group.optimization_goal),
                  pretty(group.bid_strategy),
                  pretty(group.destination_type),
                  <StatusBadge key="st" status={group.status} />,
                  <StatusActions
                    key="act"
                    status={group.status}
                    busy={String(busy).startsWith(`ad-group:${group.id}:`)}
                    onAction={(status) => setObjectStatus('ad-group', group.id, status)}
                  />,
                ],
              }))}
            />
          </form>

          <form
            className="card"
            onSubmit={async (event) => {
              event.preventDefault()
              setBusy('ad')
              setError('')
              setNotice('')
              try {
                const selectedGroup = adGroups.find((g) => g.id === adForm.adGroupId)
                const goal = String(selectedGroup?.optimization_goal || adGroupForm.optimizationGoal || '').toUpperCase()
                const isLeadGoal = goal === 'LEAD_GENERATION' || goal === 'QUALITY_LEAD'
                const formId = String(adForm.leadGenFormId || adGroupForm.leadGenFormId || '').trim()
                if (adForm.creativeSource === 'instant_form' && !formId) {
                  setError('Choose or create an Instant Form for Instant Form creatives.')
                  setBusy('')
                  return
                }
                if (isLeadGoal && adForm.creativeSource === 'existing_post' && !formId) {
                  setError('Lead ads from an Existing Page post still need an Instant Form selected (Step 4 or Step 5). Pick Devgarh Click form, then create.')
                  setBusy('')
                  return
                }
                await fb.createAd({
                  ...adForm,
                  leadGenFormId: formId,
                  pageId: adForm.pageId || adGroupForm.pageId,
                  dailyBudgetInr: adForm.dailyBudgetInr,
                  currencyOffset: catalog?.currencyOffset || 100,
                })
                await refreshLists()
                setAdForm((old) => ({ ...old, name: '', objectStoryId: '', message: '', link: '', headline: '', imageUrl: '', dailyBudgetInr: old.dailyBudgetInr || '500' }))
                setNotice(adForm.creativeSource === 'existing_post' ? 'Ad created from the selected Page post (paused).' : 'Ad created as paused.')
              } catch (e) {
                setError(e.message)
              } finally {
                setBusy('')
              }
            }}
          >
            <div className="card-title">5. Ad</div>
            <p className="text-muted text-sm ads-hint">
              Set the daily budget here in INR. Meta stores spend on the ad set behind the scenes, so this budget is applied to the selected ad group when the ad is created.
            </p>
            <div className="form-grid">
              <Field label="Ad name">
                <input
                  className="form-control"
                  required
                  placeholder="Website visit ad"
                  value={adForm.name}
                  onChange={(e) => setAdForm({ ...adForm, name: e.target.value })}
                />
              </Field>
              <Field label="Daily budget (INR ₹)">
                <input
                  className="form-control"
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={adForm.dailyBudgetInr}
                  onChange={(e) => setAdForm({ ...adForm, dailyBudgetInr: e.target.value })}
                />
              </Field>
              <Field label="Ad group">
                <Select
                  required
                  value={adForm.adGroupId}
                  onChange={(e) => setAdForm({ ...adForm, adGroupId: e.target.value })}
                >
                  <option value="">Select an ad group</option>
                  {adGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Facebook Page">
                <Select
                  required
                  value={adForm.pageId}
                  onChange={(e) => loadPagePosts(e.target.value)}
                >
                  <option value="">Select a Page</option>
                  {scopedPages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Creative source">
                <Select
                  value={adForm.creativeSource}
                  onChange={(e) => setAdForm({ ...adForm, creativeSource: e.target.value, objectStoryId: '' })}
                >
                  <option value="instant_form">Instant Form (Lead Gen)</option>
                  <option value="existing_post">Existing Page post</option>
                  <option value="new_creative">New creative</option>
                </Select>
              </Field>
              {(adForm.creativeSource === 'instant_form' || adForm.creativeSource === 'existing_post' || adForm.creativeSource === 'new' || adForm.creativeSource === 'new_creative') && (
                <Field label="Instant Form for this ad">
                  <select
                    value={adForm.leadGenFormId || adGroupForm.leadGenFormId}
                    onChange={(e) => setAdForm({ ...adForm, leadGenFormId: e.target.value })}
                  >
                    <option value="">Select Instant Form</option>
                    {leadForms.map((form) => (
                      <option key={form.id} value={form.id}>{form.name || form.id}</option>
                    ))}
                  </select>
                  <p className="muted">Required for Lead ads — also used with Existing Page post. Instant Form creatives need primary text below.</p>
                </Field>
              )}

              {adForm.creativeSource === 'existing_post' ? (
                <Field label="Page post" className="span-2">
                  <div className="form-actions" style={{ marginBottom: 8 }}>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={loadingPosts || !adForm.pageId} onClick={() => loadPagePosts(adForm.pageId)}>{loadingPosts ? 'Loading...' : 'Reload posts'}</button>
                  </div>
                  {loadingPosts ? (
                    <p className="text-muted text-sm">Loading posts…</p>
                  ) : (
                    <Select
                      required
                      value={adForm.objectStoryId}
                      onChange={(e) => setAdForm({ ...adForm, objectStoryId: e.target.value })}
                    >
                      <option value="">Select a published Page post</option>
                      {pagePosts.map((post) => (
                        <option key={post.id} value={post.id}>
                          {(post.message || 'Untitled post').slice(0, 90)}{post.createdTime ? ` · ${new Date(post.createdTime).toLocaleString()}` : ''}
                        </option>
                      ))}
                    </Select>
                  )}
                  {!loadingPosts && adForm.pageId && !pagePosts.length && (
                    <p className="text-muted text-sm" style={{ marginTop: 8, color: '#f87171' }}>
                      No posts found via Meta yet. Click Reload posts, Reconnect Facebook Ads, or paste a Facebook post URL / ID below.
                    </p>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <input
                      className="form-control"
                      placeholder="Or paste post URL / ID (facebook.com/.../posts/... or PAGEID_POSTID)"
                      value={adForm.manualPostRef || ''}
                      onChange={(e) => setAdForm((old) => ({ ...old, manualPostRef: e.target.value }))}
                      onBlur={(e) => {
                        const raw = String(e.target.value || '').trim()
                        if (!raw) return
                        let id = raw
                        const pair = raw.match(/(\d{6,})_(\d{6,})/)
                        const story = raw.match(/story_fbid=(\d+)/i)
                        const posts = raw.match(/\/posts\/(\d+)/i) || raw.match(/facebook\.com\/[^/]+\/(?:posts|videos)\/(\d+)/i)
                        if (pair) id = pair[1] + '_' + pair[2]
                        else if (story && adForm.pageId) id = adForm.pageId + '_' + story[1]
                        else if (posts && adForm.pageId) id = adForm.pageId + '_' + posts[1]
                        else if (/^\d+$/.test(raw) && adForm.pageId) id = adForm.pageId + '_' + raw
                        setAdForm((old) => ({ ...old, objectStoryId: id, manualPostRef: raw }))
                      }}
                    />
                  </div>
                  {adForm.objectStoryId && (
                    <div className="ads-post-preview">
                      {(() => {
                        const selected = pagePosts.find((post) => post.id === adForm.objectStoryId)
                        if (!selected) return null
                        return (
                          <>
                            {selected.picture ? <img src={selected.picture} alt="Selected post" /> : null}
                            <div>
                              <div className="text-sm">{selected.message || 'Selected Page post'}</div>
                              {selected.permalinkUrl ? (
                                <a className="text-sm" href={selected.permalinkUrl} target="_blank" rel="noreferrer">
                                  Open on Facebook
                                </a>
                              ) : null}
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  )}
                </Field>
              ) : (
                <>
                  <Field label="Headline">
                    <input
                      className="form-control"
                      placeholder="Optional headline"
                      value={adForm.headline}
                      onChange={(e) => setAdForm({ ...adForm, headline: e.target.value })}
                    />
                  </Field>
                  <Field label="Primary text" className="span-2">
                    <textarea
                      className="form-control ads-textarea"
                      required
                      rows={4}
                      placeholder="What should people see in the ad?"
                      value={adForm.message}
                      onChange={(e) => setAdForm({ ...adForm, message: e.target.value })}
                    />
                  </Field>
                  <Field label="Destination URL">
                    <input
                      className="form-control"
                      required
                      type="url"
                      placeholder="https://example.com"
                      value={adForm.link}
                      onChange={(e) => setAdForm({ ...adForm, link: e.target.value })}
                    />
                  </Field>
                  <Field label="Image URL">
                    <input
                      className="form-control"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={adForm.imageUrl}
                      onChange={(e) => setAdForm({ ...adForm, imageUrl: e.target.value })}
                    />
                  </Field>
                </>
              )}
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={busy === 'ad'}>
                {busy === 'ad' ? 'Creating…' : 'Create ad (paused)'}
              </button>
            </div>
            <ResultTable
              empty="No ads yet."
              columns={['Name', 'Status', 'Actions']}
              rows={ads.map((ad) => ({
                id: ad.id,
                cells: [
                  ad.name,
                  <StatusBadge key="st" status={ad.status} />,
                  <StatusActions
                    key="act"
                    status={ad.status}
                    busy={String(busy).startsWith(`ad:${ad.id}:`)}
                    onAction={(status) => setObjectStatus('ad', ad.id, status)}
                  />,
                ],
              }))}
            />
          </form>
        </>
      )}
    </div>
  )
}
