import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import authService from '../../core/services/auth.service'

const Signup = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', companyName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.signup(form)
      navigate('/login')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to create your account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="signup-form">
      <h1>Create your SmartERP AI account</h1>
      {error && <p className="form-error">{error}</p>}
      <label htmlFor="name">Full name</label>
      <input id="name" name="name" value={form.name} onChange={handleChange} required />
      <label htmlFor="companyName">Company name</label>
      <input id="companyName" name="companyName" value={form.companyName} onChange={handleChange} required />
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" value={form.password} onChange={handleChange} required minLength={8} />
      <button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button>
      <p>Already have an account? <Link to="/login">Sign in</Link></p>
    </form>
  )
}

export default Signup
