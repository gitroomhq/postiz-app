import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { workspace } from './api'

export const WORKSPACE_TENANT = '_workspace'
export const TENANT_STORAGE_KEY = 'postiz_tenant'
export const ADS_TENANT_STORAGE_KEY = 'postiz_ads_tenant'

const TenantContext = createContext(null)

function readStoredTenant() {
  return localStorage.getItem(TENANT_STORAGE_KEY) || localStorage.getItem(ADS_TENANT_STORAGE_KEY) || WORKSPACE_TENANT
}

function persistTenant(id) {
  localStorage.setItem(TENANT_STORAGE_KEY, id)
  localStorage.setItem(ADS_TENANT_STORAGE_KEY, id)
}

export function TenantProvider({ children }) {
  const [tenantId, setTenantIdState] = useState(readStoredTenant)
  const [brands, setBrands] = useState([])

  async function reloadBrands() {
    try { setBrands(await workspace.brands()) } catch { setBrands([]) }
  }

  useEffect(() => { reloadBrands() }, [])
  useEffect(() => {
    const onChange = () => reloadBrands()
    window.addEventListener('postiz-brands-changed', onChange)
    return () => window.removeEventListener('postiz-brands-changed', onChange)
  }, [])

  useEffect(() => { persistTenant(tenantId) }, [tenantId])

  const selectedBrand = useMemo(() => brands.find((brand) => brand.id === tenantId) || null, [brands, tenantId])
  const isWorkspace = !tenantId || tenantId === WORKSPACE_TENANT
  const channelIds = selectedBrand?.channelIds || []

  function setTenantId(id) {
    const next = id || WORKSPACE_TENANT
    setTenantIdState(next)
    persistTenant(next)
  }

  return (
    <TenantContext.Provider value={{ tenantId, setTenantId, brands, selectedBrand, isWorkspace, channelIds, reloadBrands }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used within TenantProvider')
  return ctx
}

export function scopeChannels(channels, channelIds) {
  if (!channelIds?.length) return channels || []
  const allowed = new Set(channelIds.map(String))
  return (channels || []).filter((channel) => allowed.has(String(channel.id)))
}

export function memberHandlesTenant(member, tenantId, isWorkspace) {
  const ids = Array.isArray(member?.tenantIds) ? member.tenantIds : []
  if (!ids.length) {
    if (member?.role === 'owner') return true
    return isWorkspace
  }
  if (isWorkspace) return ids.includes(WORKSPACE_TENANT)
  return ids.includes(tenantId)
}