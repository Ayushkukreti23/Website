import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Link, useNavigate, useLocation } from 'react-router-dom'

export default function ForgotPassword() {
  const nav = useNavigate()
  const loc = useLocation()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const qs = new URLSearchParams(loc.search)
    const e = qs.get('email')
    const t = qs.get('token')
    if (e && t) {
      setEmail(e)
      setToken(t)
      setStep(2)
    }
  }, [loc.search])

  async function requestReset(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!email) { setError('Email is required'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/forgot', { email })
      setMessage(`Use this code to reset: ${data.token}`)
      setStep(2)
    } catch (err) {
      setError(err?.response?.data?.message || 'Request failed')
    } finally { setLoading(false) }
  }

  async function performReset(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!email || !token || !password) { setError('All fields are required'); return }
    setLoading(true)
    try {
      await api.post('/api/auth/reset', { email, token, password })
      nav('/login')
    } catch (err) {
      setError(err?.response?.data?.message || 'Reset failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="auth">
      {step === 1 && (
        <>
          <h2>Forgot password</h2>
          <form onSubmit={requestReset} className="form">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <div className="error">{error}</div>}
            {message && <div>{message}</div>}
            <button disabled={loading}>{loading ? 'Sending...' : 'Send reset code'}</button>
          </form>
          <p><Link to="/login">Back to login</Link></p>
        </>
      )}
      {step === 2 && (
        <>
          <h2>Reset password</h2>
          <form onSubmit={performReset} className="form">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input placeholder="Reset code" value={token} onChange={(e) => setToken(e.target.value)} />
            <input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <div className="error">{error}</div>}
            <button disabled={loading}>{loading ? 'Resetting...' : 'Reset password'}</button>
          </form>
        </>
      )}
    </div>
  )
}
