import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import authService from '../../core/services/auth.service'
import useAuthStore from '../../store/slices/auth.store'
import storageService from '../../core/services/storage.service'

const Login = () => {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const setToken = useAuthStore((state) => state.setToken)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authService.login(form)
      storageService.setToken(data.token)
      storageService.setUser(data.user)
      setToken(data.token)
      setUser(data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to log in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <h1>Sign in to SmartERP AI</h1>
      {error && <p className="form-error">{error}</p>}
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" value={form.password} onChange={handleChange} required />
      <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
      <p><Link to="/forgot-password">Forgot password?</Link></p>
      <p>No account? <Link to="/signup">Create one</Link></p>
    </form>
  )
}

export default Login
