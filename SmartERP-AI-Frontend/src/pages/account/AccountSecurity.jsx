import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import authService from '../../core/services/auth.service'
import { getApiError } from '../../core/utils/apiError'
import { evaluatePassword, usePasswordPolicy } from '../../core/utils/passwordPolicy'
import useAuthStore from '../../store/slices/auth.store'
import PasswordChecklist from '../../components/auth/PasswordChecklist'
import MfaSetupPanel from '../../components/auth/MfaSetupPanel'
import RecoveryCodesPanel from '../../components/auth/RecoveryCodesPanel'

/* ── Small UI pieces in the in-app settings style ───────────────────────── */

const Card = ({ title, subtitle, children }) => (
  <section className="rounded-[20px] border border-[#e4e2dd] bg-white px-6 py-6">
    <h2 className="font-serif text-[20px] text-[#171815]">{title}</h2>
    {subtitle && <p className="mt-1 text-sm text-[#7a7a70]">{subtitle}</p>}
    <div className="mt-5">{children}</div>
  </section>
)

const Field = ({ label, id, children }) => (
  <div>
    <label htmlFor={id} className="mb-[10px] block text-[10px] font-medium uppercase leading-none tracking-[0.16em] text-[#aaa9a3]">
      {label}
    </label>
    {children}
  </div>
)

const inputClass =
  'h-[40px] w-full rounded-[15px] border border-[#e4e2dd] bg-[#f5f4f0] px-4 text-[13.5px] outline-none transition-all duration-200 focus:border-[#bdbbb4] focus:bg-white'

const primaryBtn =
  'inline-flex h-9 items-center justify-center rounded-lg bg-[#3a4535] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
const secondaryBtn =
  'inline-flex h-9 items-center justify-center rounded-lg border border-[#e2e2da] bg-[#f0f0ea] px-4 text-sm font-medium text-[#5a5a50] transition-colors hover:bg-[#e8e8e0] disabled:opacity-50'
const dangerBtn =
  'inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50'

const ErrorText = ({ children }) =>
  children ? (
    <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
      {children}
    </div>
  ) : null

const SuccessText = ({ children }) =>
  children ? (
    <div role="status" className="mb-4 rounded-lg border border-[#cfdcc8] bg-[#f1f6ee] px-3 py-2.5 text-[13px] text-[#3f5a37]">
      {children}
    </div>
  ) : null

const CodeInput = (props) => (
  <input
    {...props}
    onChange={(e) => props.onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
    inputMode="numeric"
    autoComplete="one-time-code"
    placeholder="000000"
    className={`${inputClass} w-40 text-center font-mono tracking-[0.35em]`}
  />
)

/* ── Change password ───────────────────────────────────────────────────── */

const ChangePasswordCard = () => {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const policy = usePasswordPolicy()
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const check = evaluatePassword(form.newPassword, { name: user?.name, email: user?.email }, policy)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!check.valid) return setError('Your new password does not meet the requirements.')
    if (form.newPassword !== form.confirm) return setError('New passwords do not match.')
    setError('')
    setSaving(true)
    try {
      await authService.changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword })
      // The server has revoked every session, including this one.
      navigate('/login', {
        replace: true,
        state: { notice: 'Your password was changed and you were signed out everywhere. Please sign in again.' },
      })
      useAuthStore.getState().clearSession()
    } catch (err) {
      setError(getApiError(err, 'Could not change your password.').message)
      setSaving(false)
    }
  }

  return (
    <Card title="Password" subtitle="Changing your password signs you out of every device, including this one.">
      <ErrorText>{error}</ErrorText>
      <form onSubmit={handleSubmit} className="grid max-w-md gap-4">
        <Field label="Current password" id="oldPassword">
          <input id="oldPassword" type="password" value={form.oldPassword} onChange={set('oldPassword')} required autoComplete="current-password" className={inputClass} />
        </Field>
        <Field label="New password" id="newPassword">
          <input id="newPassword" type="password" value={form.newPassword} onChange={set('newPassword')} required autoComplete="new-password" className={inputClass} />
          <PasswordChecklist checks={check.checks} tone="light" style={{ marginTop: 10 }} />
        </Field>
        <Field label="Confirm new password" id="confirmPassword">
          <input id="confirmPassword" type="password" value={form.confirm} onChange={set('confirm')} required autoComplete="new-password" className={inputClass} />
          {form.confirm && form.confirm !== form.newPassword && (
            <p className="mt-2 text-xs text-red-600">Passwords do not match.</p>
          )}
        </Field>
        <div>
          <button type="submit" disabled={saving} className={primaryBtn}>
            {saving ? 'Changing…' : 'Change password'}
          </button>
        </div>
      </form>
    </Card>
  )
}

/* ── Two-factor authentication ─────────────────────────────────────────── */

const formatDate = (value) => {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const TwoFactorCard = () => {
  const user = useAuthStore((s) => s.user)
  const [status, setStatus] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [mode, setMode] = useState('idle') // idle | setup | codes | regen | disable
  const [setup, setSetup] = useState(null)
  const [codes, setCodes] = useState([])
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  const fetchStatus = useCallback(
    () =>
      authService.mfaStatus().then(
        (data) => {
          setLoadError('')
          setStatus(data)
        },
        (err) => setLoadError(getApiError(err, 'Could not load two-factor status.').message)
      ),
    []
  )

  const loadStatus = () => {
    setLoadError('')
    return fetchStatus()
  }

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const reset = (nextMode = 'idle') => {
    setMode(nextMode)
    setCode('')
    setPassword('')
    setError('')
    setSetup(null)
  }

  const startSetup = async () => {
    reset('setup')
    setSuccess('')
    setBusy(true)
    try {
      setSetup(await authService.setupMfa())
    } catch (err) {
      setError(getApiError(err, 'Could not start two-factor setup.').message)
    } finally {
      setBusy(false)
    }
  }

  const enable = async (totp) => {
    setError('')
    setBusy(true)
    try {
      const data = await authService.enableMfa({ code: totp })
      setCodes(data?.recoveryCodes || [])
      setMode('codes')
      setSetup(null)
    } catch (err) {
      setError(getApiError(err, 'That code did not work. Please try again.').message)
    } finally {
      setBusy(false)
    }
  }

  const regenerate = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await authService.regenerateRecoveryCodes(code)
      setCodes(data?.recoveryCodes || [])
      setCode('')
      setMode('codes')
    } catch (err) {
      setError(getApiError(err, 'Could not generate new recovery codes.').message)
    } finally {
      setBusy(false)
    }
  }

  const disable = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await authService.disableMfa({ password, code })
      reset()
      setSuccess('Two-factor authentication has been turned off.')
      await loadStatus()
    } catch (err) {
      setError(getApiError(err, 'Could not turn off two-factor authentication.').message)
    } finally {
      setBusy(false)
    }
  }

  const finishCodes = async () => {
    setCodes([])
    reset()
    setSuccess('Your recovery codes are saved. Two-factor authentication is on.')
    await loadStatus()
  }

  let body
  if (loadError) {
    body = (
      <>
        <ErrorText>{loadError}</ErrorText>
        <button type="button" className={secondaryBtn} onClick={loadStatus}>Retry</button>
      </>
    )
  } else if (!status) {
    body = <p className="text-sm text-[#8a8a80]">Loading…</p>
  } else if (mode === 'codes') {
    body = (
      <div className="max-w-md">
        <RecoveryCodesPanel codes={codes} tone="light" accountLabel={user?.email} doneLabel="Done" onDone={finishCodes} />
      </div>
    )
  } else if (mode === 'setup') {
    body = (
      <div className="max-w-md">
        <ErrorText>{error}</ErrorText>
        {setup ? (
          <MfaSetupPanel setup={setup} tone="light" onSubmit={enable} submitting={busy} />
        ) : (
          <p className="text-sm text-[#8a8a80]">{busy ? 'Preparing your setup key…' : ''}</p>
        )}
        <button type="button" className={`${secondaryBtn} mt-3`} onClick={() => reset()}>Cancel</button>
      </div>
    )
  } else {
    body = (
      <>
        <SuccessText>{success}</SuccessText>
        <dl className="grid max-w-md grid-cols-2 gap-y-2 text-sm">
          <dt className="text-[#8a8a80]">Status</dt>
          <dd className={status.enabled ? 'font-medium text-[#3f7a3a]' : 'font-medium text-[#a23b3b]'}>
            {status.enabled ? 'On' : 'Off'}
          </dd>
          <dt className="text-[#8a8a80]">Required for your role</dt>
          <dd className="text-[#2a2a20]">{status.required ? 'Yes' : 'No'}</dd>
          {status.enabled && formatDate(status.enrolledAt) && (
            <>
              <dt className="text-[#8a8a80]">Enabled on</dt>
              <dd className="text-[#2a2a20]">{formatDate(status.enrolledAt)}</dd>
            </>
          )}
          {status.enabled && (
            <>
              <dt className="text-[#8a8a80]">Recovery codes left</dt>
              <dd className={status.recoveryCodesRemaining <= 2 ? 'font-medium text-[#a23b3b]' : 'text-[#2a2a20]'}>
                {status.recoveryCodesRemaining ?? '—'}
              </dd>
            </>
          )}
        </dl>

        {!status.enabled && (
          <div className="mt-5">
            {status.required && (
              <p className="mb-3 text-sm text-[#a23b3b]">Your role requires two-factor authentication. Set it up now.</p>
            )}
            <button type="button" className={primaryBtn} onClick={startSetup}>Set up two-factor</button>
          </div>
        )}

        {status.enabled && mode === 'idle' && (
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className={secondaryBtn} onClick={() => { reset('regen'); setSuccess('') }}>
              Regenerate recovery codes
            </button>
            {!status.required && (
              <button type="button" className={dangerBtn} onClick={() => { reset('disable'); setSuccess('') }}>
                Turn off two-factor
              </button>
            )}
          </div>
        )}

        {mode === 'regen' && (
          <form onSubmit={regenerate} className="mt-5 max-w-md">
            <ErrorText>{error}</ErrorText>
            <p className="mb-3 text-sm text-[#5a5a50]">
              New codes replace all of your existing recovery codes. Enter a current code from your authenticator app.
            </p>
            <Field label="Authenticator code" id="regenCode">
              <CodeInput id="regenCode" value={code} onChange={setCode} required />
            </Field>
            <div className="mt-4 flex gap-3">
              <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>
                {busy ? 'Generating…' : 'Generate new codes'}
              </button>
              <button type="button" className={secondaryBtn} onClick={() => reset()}>Cancel</button>
            </div>
          </form>
        )}

        {mode === 'disable' && (
          <form onSubmit={disable} className="mt-5 grid max-w-md gap-4">
            <ErrorText>{error}</ErrorText>
            <Field label="Current password" id="disablePassword">
              <input id="disablePassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className={inputClass} />
            </Field>
            <Field label="Authenticator code" id="disableCode">
              <CodeInput id="disableCode" value={code} onChange={setCode} required />
            </Field>
            <div className="flex gap-3">
              <button type="submit" disabled={busy || code.length !== 6 || !password} className={dangerBtn}>
                {busy ? 'Turning off…' : 'Turn off two-factor'}
              </button>
              <button type="button" className={secondaryBtn} onClick={() => reset()}>Cancel</button>
            </div>
          </form>
        )}
      </>
    )
  }

  return (
    <Card
      title="Two-factor authentication"
      subtitle="Require a code from an authenticator app in addition to your password when you sign in."
    >
      {body}
    </Card>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────── */

const AccountSecurity = () => {
  const user = useAuthStore((s) => s.user)
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <div>
        <h1 className="font-serif text-[28px] leading-none tracking-[-0.02em] text-[#171815]">Account security</h1>
        <p className="mt-2 text-sm text-[#7a7a70]">
          {user?.email}
          {user?.tenantCode ? ` · ${user.tenantCode}` : ''}
        </p>
      </div>
      <ChangePasswordCard />
      <TwoFactorCard />
    </div>
  )
}

export default AccountSecurity
