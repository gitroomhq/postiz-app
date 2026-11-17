import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { health, docker } from '../api'

const BADGE = { healthy: 'badge-healthy', unhealthy: 'badge-unhealthy', starting: 'badge-starting' }

export default function DashboardPage() {
  const [containers, setContainers] = useState([])
  const [logs, setLogs] = useState('')
  const [showLogs, setShowLogs] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [msg, setMsg] = useState(null)
  const [error, setError] = useState(null)

  async function loadHealth() {
    try { setContainers(await health.get()) } catch (e) { setError(e.message) }
  }

  useEffect(() => { loadHealth(); const t = setInterval(loadHealth, 10000); return () => clearInterval(t) }, [])

  async function restart() {
    setRestarting(true); setMsg(null); setError(null)
    try {
      const r = await docker.restartPostiz()
      setMsg(r.message)
      setTimeout(loadHealth, 4000)
    } catch (e) { setError(e.message) } finally { setRestarting(false) }
  }

  async function fetchLogs() {
    try { setLogs(await docker.postizLogs()); setShowLogs(true) } catch (e) { setError(e.message) }
  }

  const healthy = containers.filter(c => c.health === 'healthy').length

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={fetchLogs}>View Logs</button>
          <button className="btn btn-danger btn-sm" onClick={restart} disabled={restarting}>
            {restarting && <span className="spinner" />} Restart Postiz
          </button>
          <Link className="btn btn-primary btn-sm" to="/calendar">
            Open Calendar
          </Link>
          <a className="btn btn-ghost btn-sm" href="http://localhost:4007" target="_blank" rel="noreferrer">
            Open Postiz ↗
          </a>
        </div>
      </div>

      {msg   && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid-5">
        <div className="stat-card">
          <div className="stat-label">Services</div>
          <div className="stat-value">{containers.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Healthy</div>
          <div className="stat-value" style={{ color: '#86efac' }}>{healthy}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Unhealthy</div>
          <div className="stat-value" style={{ color: '#fca5a5' }}>
            {containers.filter(c => c.health === 'unhealthy').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Postiz UI</div>
          <div className="stat-value" style={{ fontSize: 14, color: '#93c5fd', paddingTop: 6 }}>
            <Link to="/calendar" style={{ color: '#3b82f6' }}>Calendar in Admin</Link>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Temporal UI</div>
          <div className="stat-value" style={{ fontSize: 14, paddingTop: 6 }}>
            <a href="http://localhost:8082" target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>localhost:8082</a>
          </div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Container</th>
              <th>Image</th>
              <th>Status</th>
              <th>Health</th>
            </tr>
          </thead>
          <tbody>
            {containers.map(c => (
              <tr key={c.name}>
                <td><span className="mono">{c.name}</span></td>
                <td className="text-muted">{c.image}</td>
                <td className="text-muted">{c.status}</td>
                <td><span className={`badge ${BADGE[c.health] || 'badge-starting'}`}>{c.health}</span></td>
              </tr>
            ))}
            {containers.length === 0 && (
              <tr><td colSpan={4} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>Loading...</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showLogs && (
        <div className="card">
          <div className="page-header mb-2">
            <span className="card-title">Postiz Container Logs (last 100 lines)</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowLogs(false)}>Close</button>
          </div>
          <div className="log-box">{logs || 'No logs.'}</div>
        </div>
      )}
    </div>
  )
}
