import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

const TONES = {
  dark: {
    step: 'font-mono text-[11px] uppercase tracking-[0.16em] text-[#777d75]',
    body: 'font-mono text-[12px] leading-[1.7] text-[#a1a79d]',
    secret: 'flex-1 break-all rounded-[10px] bg-[#20231f] px-4 py-3 font-mono text-[13px] tracking-[0.12em] text-[#e5e4df]',
    copy: 'rounded-[10px] border border-[#2e342f] px-3 font-mono text-[10px] uppercase tracking-[0.13em] text-[#8a9185] hover:text-[#b3c2ac]',
    input: 'h-[50px] w-full rounded-[15px] border border-[#343934] bg-[#20231f] px-5 text-center font-mono text-[18px] tracking-[0.5em] text-[#e5e4df] outline-none focus:border-[#596355]',
    qrWrap: 'inline-block rounded-[12px] bg-white p-3',
    submit: 'mt-6 flex h-[57px] w-full items-center justify-center rounded-[15px] bg-[#f0eee9] font-mono text-[12px] uppercase tracking-[0.13em] text-[#171916] transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-60',
    uri: 'mt-2 break-all font-mono text-[10px] text-[#5f665e]',
  },
  light: {
    step: 'text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a8a80]',
    body: 'text-sm leading-[1.6] text-[#5a5a50]',
    secret: 'flex-1 break-all rounded-lg border border-[#e8e8e0] bg-[#fafaf8] px-3 py-2 font-mono text-[13px] tracking-[0.12em] text-[#2a2a20]',
    copy: 'rounded-lg border border-[#e2e2da] bg-[#f0f0ea] px-3 text-xs font-medium text-[#5a5a50] hover:bg-[#e8e8e0]',
    input: 'h-10 w-48 rounded-lg border border-[#e2e2da] bg-white px-3 text-center font-mono text-[16px] tracking-[0.4em] text-[#2a2a20] outline-none focus:border-[#3a4535]',
    qrWrap: 'inline-block rounded-lg border border-[#e8e8e0] bg-white p-3',
    submit: 'mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-[#3a4535] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
    uri: 'mt-2 break-all text-[10px] text-[#a0a09a]',
  },
}

const groupSecret = (secret = '') => secret.replace(/(.{4})/g, '$1 ').trim()

/**
 * Authenticator-app enrollment: QR code of the otpauth:// URI, the secret for
 * manual entry, and a 6-digit confirmation code field. `onSubmit(code)` is
 * called with the digits; the parent performs POST /auth/mfa/enable.
 */
const MfaSetupPanel = ({ setup, onSubmit, submitting, tone = 'dark', submitLabel = 'Turn on two-factor' }) => {
  const t = TONES[tone] || TONES.dark
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(setup.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (code.length === 6) onSubmit(code)
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className={t.step}>1 · Scan with your authenticator app</p>
      <p className={`mt-2 ${t.body}`}>
        Use Google Authenticator, Microsoft Authenticator, 1Password, Authy or any TOTP app.
      </p>
      <div className="mt-4">
        <div className={t.qrWrap}>
          <QRCodeSVG value={setup.otpauthUri} size={168} level="M" marginSize={0} title="Two-factor authentication QR code" />
        </div>
      </div>

      <p className={`mt-6 ${t.step}`}>Can’t scan? Enter this key manually</p>
      <div className="mt-2 flex gap-2">
        <code className={t.secret}>{groupSecret(setup.secret)}</code>
        <button type="button" onClick={copySecret} className={t.copy}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      {(setup.issuer || setup.accountName) && (
        <p className={t.uri}>
          {setup.issuer}{setup.issuer && setup.accountName ? ' · ' : ''}{setup.accountName} · time-based, 6 digits
        </p>
      )}

      <p className={`mt-6 ${t.step}`}>2 · Enter the 6-digit code from the app</p>
      <div className="mt-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label="6-digit verification code"
          placeholder="000000"
          required
          className={t.input}
        />
      </div>

      <button type="submit" disabled={submitting || code.length !== 6} className={t.submit}>
        {submitting ? 'Verifying…' : submitLabel}
      </button>
    </form>
  )
}

export default MfaSetupPanel
