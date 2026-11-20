import { useState } from 'react'

const TONES = {
  dark: {
    box: 'rounded-[15px] border border-[#343934] bg-[#151914] p-5',
    code: 'rounded-[8px] bg-[#20231f] px-3 py-2 text-center font-mono text-[13px] tracking-[0.08em] text-[#e5e4df]',
    warn: 'mb-5 rounded-[10px] border border-amber-900/50 bg-amber-950/30 px-4 py-3 font-mono text-[12px] leading-[1.6] text-amber-200',
    btn: 'flex h-[42px] flex-1 items-center justify-center rounded-[12px] border border-[#2e342f] font-mono text-[11px] uppercase tracking-[0.13em] text-[#8a9185] transition-colors hover:border-[#465045] hover:text-[#b3c2ac]',
    check: 'font-mono text-[11px] leading-[1.6] text-[#a1a79d]',
    primary: 'mt-6 flex h-[57px] w-full items-center justify-center rounded-[15px] bg-[#f0eee9] font-mono text-[12px] uppercase tracking-[0.13em] text-[#171916] transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-40',
    accent: '#9aae91',
  },
  light: {
    box: 'rounded-xl border border-[#e2e2da] bg-[#fafaf8] p-4',
    code: 'rounded-md border border-[#e8e8e0] bg-white px-3 py-2 text-center font-mono text-[13px] tracking-[0.08em] text-[#2a2a20]',
    warn: 'mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] leading-[1.6] text-amber-800',
    btn: 'flex h-9 flex-1 items-center justify-center rounded-lg border border-[#e2e2da] bg-[#f0f0ea] text-xs font-medium text-[#5a5a50] transition-colors hover:bg-[#e8e8e0]',
    check: 'text-xs leading-[1.6] text-[#5a5a50]',
    primary: 'mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-[#3a4535] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40',
    accent: '#3a4535',
  },
}

/**
 * Shows freshly generated MFA recovery codes exactly once. The user must tick
 * "I have saved them" before `onDone` can be triggered.
 */
const RecoveryCodesPanel = ({ codes = [], onDone, doneLabel = 'Continue', tone = 'dark', accountLabel }) => {
  const t = TONES[tone] || TONES.dark
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const text = [
    'SmartERP recovery codes',
    accountLabel ? `Account: ${accountLabel}` : null,
    `Generated: ${new Date().toISOString()}`,
    '',
    'Each code can be used once to sign in if you lose access to your authenticator app.',
    '',
    ...codes,
  ]
    .filter((line) => line !== null)
    .join('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'smarterp-recovery-codes.txt'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className={t.warn}>
        <strong>Save these recovery codes now.</strong> They are shown only once. Each code can be used a single
        time to sign in if you lose your authenticator device. Store them somewhere safe, such as a password manager.
      </div>

      <div className={t.box}>
        <div className="grid grid-cols-2 gap-2">
          {codes.map((code) => (
            <code key={code} className={t.code}>{code}</code>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={copy} className={t.btn}>{copied ? 'Copied' : 'Copy'}</button>
          <button type="button" onClick={download} className={t.btn}>Download .txt</button>
        </div>
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="mt-[3px] h-[14px] w-[14px] flex-shrink-0 cursor-pointer"
          style={{ accentColor: t.accent }}
        />
        <span className={t.check}>I have saved these recovery codes in a safe place.</span>
      </label>

      <button type="button" disabled={!saved} onClick={onDone} className={t.primary}>
        {doneLabel}
      </button>
    </div>
  )
}

export default RecoveryCodesPanel
