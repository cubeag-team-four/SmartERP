import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import authService from '../../core/services/auth.service'
import { getApiError } from '../../core/utils/apiError'
import { evaluatePassword, usePasswordPolicy } from '../../core/utils/passwordPolicy'
import AuthShell from '../../components/auth/AuthShell'
import PasswordChecklist from '../../components/auth/PasswordChecklist'
import {
  AuthError,
  AuthHeading,
  AuthLabel,
  AuthPasswordInput,
  AuthPrimaryButton,
} from '../../components/auth/AuthUi'

const ResetPassword = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const policy = usePasswordPolicy()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [tokenInvalid, setTokenInvalid] = useState(!token)
  const [loading, setLoading] = useState(false)

  const check = evaluatePassword(password, {}, policy)
  const mismatch = confirm.length > 0 && confirm !== password

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!check.valid) {
      setError('Your new password does not meet the requirements below.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await authService.resetPassword({ token, newPassword: password })
      navigate('/login', {
        replace: true,
        state: { notice: 'Your password has been reset. Sign in with your new password.' },
      })
    } catch (err) {
      const apiError = getApiError(err, 'Unable to reset your password. Please try again.')
      if (apiError.code === 'INVALID_RESET_TOKEN') setTokenInvalid(true)
      setError(apiError.message)
    } finally {
      setLoading(false)
    }
  }

  if (tokenInvalid) {
    return (
      <AuthShell>
        <AuthHeading title="Link expired" subtitle="This password reset link is invalid, expired or has already been used." />
        <AuthError>{token ? error : ''}</AuthError>
        <Link
          to="/forgot-password"
          className="flex h-[57px] w-full items-center justify-center rounded-[15px] bg-[#f0eee9] font-mono text-[12px] uppercase tracking-[0.13em] text-[#171916] transition-all hover:bg-white"
        >
          Request a new link <span className="ml-3 text-[16px]">→</span>
        </Link>
        <p className="mt-8 text-center font-mono text-[11px] text-[#737970]">
          <Link to="/login" className="text-[#9aae91] transition-colors hover:text-[#b3c2ac]">Back to sign in</Link>
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <AuthHeading title="Choose a new password" subtitle={`Pick a password you haven't used recently${policy.historySize ? ` (your last ${policy.historySize} can't be reused)` : ''}.`} />
      <AuthError>{error}</AuthError>

      <form onSubmit={handleSubmit}>
        <div>
          <AuthLabel htmlFor="newPassword">New password</AuthLabel>
          <AuthPasswordInput
            id="newPassword"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            autoFocus
          />
          <PasswordChecklist checks={check.checks} tone="dark" style={{ marginTop: 12 }} />
        </div>

        <div className="mt-5">
          <AuthLabel htmlFor="confirmPassword">Confirm new password</AuthLabel>
          <AuthPasswordInput
            id="confirmPassword"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
          {mismatch && <p className="mt-2 font-mono text-[11px] text-red-300">Passwords do not match.</p>}
        </div>

        <AuthPrimaryButton loading={loading} loadingText="Saving...">Reset password</AuthPrimaryButton>
      </form>

      <p className="mt-8 text-center font-mono text-[11px] text-[#737970]">
        <Link to="/login" className="text-[#9aae91] transition-colors hover:text-[#b3c2ac]">Back to sign in</Link>
      </p>
    </AuthShell>
  )
}

export default ResetPassword
