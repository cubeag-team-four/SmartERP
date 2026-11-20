import { useState } from 'react'
import { Link } from 'react-router-dom'
import authService from '../../core/services/auth.service'
import { getApiError } from '../../core/utils/apiError'
import AuthShell from '../../components/auth/AuthShell'
import { AuthError, AuthHeading, AuthInput, AuthLabel, AuthNotice, AuthPrimaryButton } from '../../components/auth/AuthUi'

const SENT_MESSAGE =
  "If an account exists for that email, we've sent a link to reset your password. The link expires soon, so check your inbox (and spam folder) now."

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.forgotPassword(email.trim().toLowerCase())
      setSent(true)
    } catch (err) {
      const apiError = getApiError(err)
      // Only surface errors that don't reveal whether the account exists.
      if (apiError.status === 429 || apiError.status === 0) setError(apiError.message)
      else setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <AuthHeading
        title="Reset password"
        subtitle="Enter your work email and we'll send you a link to choose a new password."
      />

      {sent ? (
        <>
          <AuthNotice>{SENT_MESSAGE}</AuthNotice>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="font-mono text-[11px] text-[#87957f] transition-colors hover:text-[#a8b5a1]"
          >
            Use a different email
          </button>
        </>
      ) : (
        <>
          <AuthError>{error}</AuthError>
          <form onSubmit={handleSubmit}>
            <AuthLabel htmlFor="email">Work email</AuthLabel>
            <AuthInput
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
            <AuthPrimaryButton loading={loading} loadingText="Sending...">Send reset link</AuthPrimaryButton>
          </form>
        </>
      )}

      <p className="mt-8 text-center font-mono text-[11px] text-[#737970]">
        Remembered it?{' '}
        <Link to="/login" className="text-[#9aae91] transition-colors hover:text-[#b3c2ac]">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  )
}

export default ForgotPassword
