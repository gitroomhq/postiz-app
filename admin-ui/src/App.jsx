import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CredentialsPage from './pages/CredentialsPage'
import ProvidersPage from './pages/ProvidersPage'
import PostsPage from './pages/PostsPage'
import TeamPage from './pages/TeamPage'
import BrandsPage from './pages/BrandsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ApprovalsPage from './pages/ApprovalsPage'
import GrowthPage from './pages/GrowthPage'
import FacebookAdsPage from './pages/FacebookAdsPage'
import FacebookAdsManagePage from './pages/FacebookAdsManagePage'
import PostizEmbedPage from './pages/PostizEmbedPage'
import { TenantProvider } from './tenant'
import { access } from './api'

function setAuthCookie(token) {
  if (!token) {
    document.cookie = 'auth=; path=/; max-age=0'
    return
  }
  document.cookie = `auth=${encodeURIComponent(token)}; path=/; SameSite=Lax`
}

export default function App() {
  const [auth, setAuth] = useState(() => localStorage.getItem('postiz_auth'))
  const [workspace, setWorkspace] = useState(null)
  const [workspaceError, setWorkspaceError] = useState('')

  useEffect(() => {
    if (!auth) { setWorkspace(null); setAuthCookie(''); return }
    setAuthCookie(auth)
    setWorkspaceError('')
    access.me().then(setWorkspace).catch((error) => setWorkspaceError(error.message))
  }, [auth])

  function login(token) {
    localStorage.setItem('postiz_auth', token)
    setAuthCookie(token)
    setAuth(token)
  }

  function logout() {
    localStorage.removeItem('postiz_auth')
    setAuthCookie('')
    setAuth(null)
  }

  if (!auth) return <LoginPage onLogin={login} />
  if (workspaceError) return <LoginPage onLogin={login} error={workspaceError} />
  if (!workspace) return <div className="login-wrap"><div className="login-card"><span className="spinner" /> Loading workspace…</div></div>

  return (
    <TenantProvider>
      <Layout onLogout={logout} workspace={workspace}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"   element={<DashboardPage />} />
          <Route path="/calendar"    element={<PostizEmbedPage title="Calendar" postizPath="/launches" hint="Create, schedule, and review posts without leaving Admin." />} />
          <Route path="/create-post" element={<PostizEmbedPage title="Create Post" postizPath="/launches" hint="Open the composer with the + control on the calendar." />} />
          <Route path="/civic-desk"  element={<PostizEmbedPage title="Civic Desk" postizPath="/civic-desk" hint="Civic Desk stays available inside this workspace." />} />
          <Route path="/credentials" element={<CredentialsPage />} />
          <Route path="/providers"   element={<ProvidersPage />} />
          <Route path="/posts"       element={<PostsPage />} />
          <Route path="/team"        element={<TeamPage workspace={workspace} />} />
          <Route path="/brands"      element={<BrandsPage workspace={workspace} />} />
          <Route path="/analytics"   element={<AnalyticsPage />} />
          <Route path="/approvals"   element={<ApprovalsPage workspace={workspace} />} />
          <Route path="/growth"      element={<GrowthPage />} />
          <Route path="/facebook-ads" element={<FacebookAdsPage />} />
        <Route path="/facebook-ads/manage" element={<FacebookAdsManagePage />} />
        </Routes>
      </Layout>
    </TenantProvider>
  )
}