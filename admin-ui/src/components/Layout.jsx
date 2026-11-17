import { NavLink, useLocation } from 'react-router-dom'
import { useTenant, WORKSPACE_TENANT } from '../tenant'

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/create-post', label: 'Create Post' },
  { to: '/civic-desk', label: 'Civic Desk' },
  { to: '/credentials', label: 'Credentials', permission: 'credentials.manage' },
  { to: '/providers', label: 'Channels' },
  { to: '/brands', label: 'Brands & Clients', permission: 'brands.view' },
  { to: '/posts', label: 'Posts' },
  { to: '/approvals', label: 'Approvals', permission: 'approvals.view' },
  { to: '/analytics', label: 'Analytics', permission: 'analytics.view' },
  { to: '/growth', label: 'Growth Agent', permission: 'growth.view' },
  { to: '/facebook-ads', label: 'Facebook Ads' },
  { to: '/facebook-ads/manage', label: 'Ads Manager' },
  { to: '/team', label: 'Team & Access', permission: 'team.view' },
]

const EMBED_PATHS = ['/calendar', '/create-post', '/civic-desk']

export default function Layout({ children, onLogout, workspace }) {
  const permissions = workspace?.permissions || []
  const can = (permission) => !permission || permissions.includes('*') || permissions.includes(permission)
  const { tenantId, setTenantId, brands, selectedBrand, isWorkspace } = useTenant()
  const location = useLocation()
  const embed = EMBED_PATHS.includes(location.pathname)

  return (
    <div className={'layout' + (embed ? ' layout-embed' : '')}>
      <nav className="sidebar">
        <div className="sidebar-logo">Postiz <span>Admin</span></div>
        <div className="form-group tenant-switcher">
          <label>Brand / client</label>
          <select className="form-control ads-select" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
            <option value={WORKSPACE_TENANT}>Workspace (shared)</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
          <p className="text-muted text-sm tenant-switcher-hint">
            {isWorkspace ? 'Shared workspace view' : `Scoped to ${selectedBrand?.name || 'this brand'}`}
          </p>
        </div>
        {NAV.filter((item) => can(item.permission)).map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            {item.label}
          </NavLink>
        ))}
        <div className="sidebar-spacer" />
        <div className="workspace-user">
          <strong>{workspace?.member?.name}</strong>
          <span>{workspace?.member?.roleLabel}</span>
        </div>
        <a href="http://localhost:4007" target="_blank" rel="noreferrer" className="nav-link secondary">
          Open Postiz ↗
        </a>
        <button className="nav-link" onClick={onLogout}>Sign Out</button>
      </nav>
      <main className={'content' + (embed ? ' embed' : '')}>{children}</main>
    </div>
  )
}