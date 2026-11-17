import { useState } from 'react'
import { postizAuth } from '../api'

export default function LoginPage({ onLogin, error: externalError = '' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token } = await postizAuth.login(email, password)
      if (!token) throw new Error('Login succeeded but no token returned. Ensure NOT_SECURED=true in Postiz env.')
      onLogin(token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-title">Postiz <span style={{ color: '#3b82f6' }}>Admin</span></div>
        <div className="login-sub">Sign in with your Postiz account</div>

        {(error || externalError) && <div className="alert alert-error">{error || externalError}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              className="form-control"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              className="form-control"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-full mt-4" style={{ width: '100%', marginTop: 20 }} disabled={loading}>
            {loading && <span className="spinner" />}
            Sign In
          </button>
        </form>

        <hr className="divider" />
        <p className="text-muted text-sm">
          Need an account? Open{' '}
          <a href="http://localhost:4007/auth" target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>
            localhost:4007/auth
          </a>{' '}
          to register via Postiz.
        </p>
      </div>
    </div>
  )
}
