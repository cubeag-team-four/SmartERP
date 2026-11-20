import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import authService from '../../core/services/auth.service'
import { applyAuthResponse } from '../../core/services/session.service'
import { getApiError } from '../../core/utils/apiError'
import useAuthStore from '../../store/slices/auth.store'
import AuthShell from '../../components/auth/AuthShell'
import MfaSetupPanel from '../../components/auth/MfaSetupPanel'
import RecoveryCodesPanel from '../../components/auth/RecoveryCodesPanel'
import {
  AuthError,
  AuthHeading,
  AuthInput,
  AuthLabel,
  AuthNotice,
  AuthPasswordInput,
  AuthPrimaryButton,
  AuthSecondaryButton,
  AuthTextButton,
} from '../../components/auth/AuthUi'

/**
 * Sign-in flow:
 *   password ─┬─> AUTHENTICATED ───────────────────────────────> role dashboard
 *             ├─> 409 TENANT_SELECTION_REQUIRED -> tenant picker -> (re-submit with tenantCode)
 *             ├─> MFA_REQUIRED -> 6-digit code / recovery code -> role dashboard
 *             └─> MFA_ENROLLMENT_REQUIRED -> QR + secret + code -> recovery codes -> role dashboard
 */
const MFA_TOKEN_ERRORS = ['MFA_SESSION_EXPIRED', 'INVALID_MFA_TOKEN', 'MFA_TOKEN_EXPIRED']

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const [step, setStep] = useState('password') // password | tenant | mfa | enroll | recovery
  const [form, setForm] = useState({ email: '', password: '' })
  const [tenants, setTenants] = useState([])
  const [mfaToken, setMfaToken] = useState(null)
  const [useRecovery, setUseRecovery] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [setup, setSetup] = useState(null)
  const [pendingAuth, setPendingAuth] = useState(null)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState(() => location.state?.notice || useAuthStore.getState().notice || '')
  const [loading, setLoading] = useState(false)

  // The store notice (e.g. "session expired") is shown once.
  useEffect(() => {
    useAuthStore.getState().consumeNotice()
  }, [])

  const redirectTarget = location.state?.from || '/app'

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const resetToPassword = (message) => {
    setStep('password')
    setMfaToken(null)
    setSetup(null)
    setMfaCode('')
    setRecoveryCode('')
    setUseRecovery(false)
    setPendingAuth(null)
    setError(message || '')
  }

  const finishLogin = (data) => {
    applyAuthResponse(data)
    setForm({ email: form.email, password: '' })
    // RoleRedirect (mounted at /app) sends the user to their own role dashboard.
    navigate(redirectTarget, { replace: true })
  }

  const startEnrollment = async (token) => {
    setStep('enroll')
    setSetup(null)
    setLoading(true)
    try {
      setSetup(await authService.setupMfa(token))
    } catch (err) {
      const e = getApiError(err, 'Could not start two-factor setup. Please sign in again.')
      if (e.status === 401) resetToPassword(e.message)
      else setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLoginResponse = (data) => {
    setError('')
    setNotice('')
    switch (data?.status) {
      case 'AUTHENTICATED':
        finishLogin(data)
        break
      case 'MFA_REQUIRED':
        setMfaToken(data.mfaToken)
        setStep('mfa')
        break
      case 'MFA_ENROLLMENT_REQUIRED':
        setMfaToken(data.mfaToken)
        startEnrollment(data.mfaToken)
        break
      default:
        setError('Unexpected response from the server. Please try again.')
    }
  }

  const signIn = async (tenantCode) => {
    setError('')
    setLoading(true)
    try {
      const data = await authService.login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        tenantCode,
      })
      handleLoginResponse(data)
    } catch (err) {
      const e = getApiError(err, 'Unable to sign in. Please try again.')
      if (e.status === 409 && e.code === 'TENANT_SELECTION_REQUIRED') {
        setTenants(Array.isArray(e.data?.tenants) ? e.data.tenants : [])
        setStep('tenant')
      } else if (e.code === 'INVALID_CREDENTIALS' || (e.status === 401 && !e.code)) {
        setStep('password')
        setError('Incorrect email or password.')
      } else {
        setStep('password')
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    setNotice('')
    signIn()
  }

  const handleMfaSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authService.verifyMfa(
        useRecovery ? { mfaToken, recoveryCode: recoveryCode.trim() } : { mfaToken, code: mfaCode }
      )
      handleLoginResponse(data)
    } catch (err) {
      const e = getApiError(err, 'Verification failed. Please try again.')
      if (MFA_TOKEN_ERRORS.includes(e.code)) {
        resetToPassword(e.message || 'Your sign-in session expired. Please sign in again.')
      } else {
        setError(e.message)
        setMfaCode('')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEnable = async (code) => {
    setError('')
    setLoading(true)
    try {
      const data = await authService.enableMfa({ mfaToken, code })
      if (data?.status === 'AUTHENTICATED' && Array.isArray(data.recoveryCodes) && data.recoveryCodes.length) {
        // Hold the session until the user confirms they saved the codes.
        setPendingAuth(data)
        setStep('recovery')
      } else {
        handleLoginResponse(data)
      }
    } catch (err) {
      const e = getApiError(err, 'That code did not work. Please try again.')
      if (MFA_TOKEN_ERRORS.includes(e.code)) resetToPassword(e.message)
      else setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  /* ── Step views ─────────────────────────────────────────────────────────── */

  const renderPassword = () => (
    <>
      <AuthHeading title="Welcome back" subtitle="Sign in to your SmartERP workspace." />
      <AuthNotice>{notice}</AuthNotice>
      <AuthError>{error}</AuthError>

      <form onSubmit={handlePasswordSubmit}>
        <div>
          <AuthLabel htmlFor="email">Work email</AuthLabel>
          <AuthInput id="email" name="email" type="email" value={form.email} onChange={handleChange} required autoComplete="email" />
        </div>

        <div className="mt-5">
          <AuthLabel htmlFor="password">Password</AuthLabel>
          <AuthPasswordInput
            id="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
          />
        </div>

        <div className="mt-5 flex items-center justify-end">
          <Link to="/forgot-password" className="font-mono text-[11px] text-[#87957f] transition-colors hover:text-[#a8b5a1]">
            Forgot password?
          </Link>
        </div>

        <AuthPrimaryButton loading={loading} loadingText="Signing in...">Sign in</AuthPrimaryButton>
      </form>

      <p className="mt-8 text-center font-mono text-[11px] text-[#737970]">
        Don't have an account?{' '}
        <Link to="/signup" className="text-[#9aae91] transition-colors hover:text-[#b3c2ac]">
          Sign up
        </Link>
      </p>
    </>
  )

  const renderTenantPicker = () => (
    <>
      <AuthHeading title="Choose a company" subtitle={`${form.email} belongs to more than one SmartERP workspace.`} />
      <AuthError>{error}</AuthError>
      <div className="grid gap-3">
        {tenants.map((t) => (
          <button
            key={t.code}
            type="button"
            disabled={loading}
            onClick={() => signIn(t.code)}
            className="flex w-full items-center justify-between rounded-[15px] border border-[#343934] bg-[#20231f] px-5 py-4 text-left transition-all hover:border-[#596355] hover:bg-[#232722] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>
              <span className="block font-serif text-[18px] text-[#efeee9]">{t.name || t.code}</span>
              <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#777d75]">{t.code}</span>
            </span>
            <span className="text-[16px] text-[#9aae91]">→</span>
          </button>
        ))}
        {!tenants.length && (
          <p className="font-mono text-[12px] text-[#737970]">No companies are available for this account.</p>
        )}
      </div>
      <AuthSecondaryButton className="mt-6" onClick={() => resetToPassword()}>Back</AuthSecondaryButton>
    </>
  )

  const renderMfa = () => (
    <>
      <AuthHeading
        title="Two-factor check"
        subtitle={
          useRecovery
            ? 'Enter one of your saved recovery codes. Each code works only once.'
            : 'Enter the 6-digit code from your authenticator app.'
        }
      />
      <AuthError>{error}</AuthError>
      <form onSubmit={handleMfaSubmit}>
        {useRecovery ? (
          <div>
            <AuthLabel htmlFor="recoveryCode">Recovery code</AuthLabel>
            <AuthInput
              id="recoveryCode"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              autoComplete="off"
              autoFocus
              required
            />
          </div>
        ) : (
          <div>
            <AuthLabel htmlFor="mfaCode">Authentication code</AuthLabel>
            <AuthInput
              id="mfaCode"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              autoFocus
              required
              className="text-center text-[18px] tracking-[0.5em]"
            />
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <AuthTextButton
            onClick={() => {
              setUseRecovery(!useRecovery)
              setError('')
            }}
          >
            {useRecovery ? 'Use authenticator code instead' : 'Use a recovery code instead'}
          </AuthTextButton>
          <AuthTextButton onClick={() => resetToPassword()}>Back to sign in</AuthTextButton>
        </div>

        <AuthPrimaryButton
          loading={loading}
          loadingText="Verifying..."
          disabled={loading || (useRecovery ? !recoveryCode.trim() : mfaCode.length !== 6)}
        >
          Verify
        </AuthPrimaryButton>
      </form>
    </>
  )

  const renderEnroll = () => (
    <>
      <AuthHeading
        title="Set up two-factor"
        subtitle="Your role requires two-factor authentication. Link an authenticator app to finish signing in."
      />
      <AuthError>{error}</AuthError>
      {setup ? (
        <MfaSetupPanel setup={setup} onSubmit={handleEnable} submitting={loading} tone="dark" submitLabel="Verify and continue" />
      ) : (
        <p className="font-mono text-[12px] text-[#737970]">
          {loading ? 'Preparing your setup key…' : ''}
        </p>
      )}
      {!setup && !loading && error && (
        <AuthSecondaryButton className="mt-4" onClick={() => startEnrollment(mfaToken)}>Try again</AuthSecondaryButton>
      )}
      <div className="mt-5 text-center">
        <AuthTextButton onClick={() => resetToPassword()}>Cancel and go back</AuthTextButton>
      </div>
    </>
  )

  const renderRecovery = () => (
    <>
      <AuthHeading title="Two-factor is on" subtitle="One last step: keep a copy of your recovery codes." />
      <RecoveryCodesPanel
        codes={pendingAuth?.recoveryCodes || []}
        accountLabel={pendingAuth?.email}
        doneLabel="Continue to SmartERP →"
        tone="dark"
        onDone={() => finishLogin(pendingAuth)}
      />
    </>
  )

  return (
    <AuthShell>
      {step === 'password' && renderPassword()}
      {step === 'tenant' && renderTenantPicker()}
      {step === 'mfa' && renderMfa()}
      {step === 'enroll' && renderEnroll()}
      {step === 'recovery' && renderRecovery()}
    </AuthShell>
  )
}

export default Login
