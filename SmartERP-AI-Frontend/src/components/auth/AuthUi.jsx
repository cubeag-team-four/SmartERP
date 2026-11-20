import { useState } from 'react'

/* Form primitives in the sign-in page's visual language (classes copied from Login.jsx). */

export const AuthHeading = ({ title, subtitle }) => (
  <div className="mb-11">
    <h2 className="font-serif text-[40px] leading-none tracking-[-0.035em] text-[#efeee9] sm:text-[43px]">
      {title}
    </h2>
    {subtitle && (
      <p className="mt-5 font-mono text-[12px] leading-[1.7] tracking-[0.08em] text-[#737970]">{subtitle}</p>
    )}
  </div>
)

export const AuthError = ({ children }) =>
  children ? (
    <div role="alert" className="mb-6 rounded-[10px] border border-red-900/50 bg-red-950/30 px-4 py-3 font-mono text-[12px] leading-[1.6] text-red-300">
      {children}
    </div>
  ) : null

export const AuthNotice = ({ children }) =>
  children ? (
    <div role="status" className="mb-6 rounded-[10px] border border-[#3d4a37] bg-[#1a2218] px-4 py-3 font-mono text-[12px] leading-[1.6] text-[#b6c7ab]">
      {children}
    </div>
  ) : null

export const AuthLabel = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="mb-3 block font-mono text-[11px] uppercase tracking-[0.16em] text-[#777d75]">
    {children}
  </label>
)

const inputClass =
  'h-[50px] w-full rounded-[15px] border border-[#343934] bg-[#20231f] px-5 font-mono text-[13px] tracking-[0.04em] text-[#e5e4df] outline-none transition-all placeholder:text-[#565c56] focus:border-[#596355] focus:bg-[#232722]'

export const AuthInput = ({ className = '', ...props }) => (
  <input {...props} className={`${inputClass} ${className}`} />
)

export const AuthPasswordInput = ({ className = '', ...props }) => {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className={`${inputClass} pr-20 tracking-[0.12em] ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[#777d75] transition-colors hover:text-[#a1ab9b]"
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

export const AuthPrimaryButton = ({ loading, loadingText, children, className = '', ...props }) => (
  <button
    type="submit"
    disabled={loading}
    {...props}
    className={`mt-6 flex h-[57px] w-full items-center justify-center rounded-[15px] bg-[#f0eee9] font-mono text-[12px] uppercase tracking-[0.13em] text-[#171916] transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
  >
    {loading ? (
      loadingText
    ) : (
      <>
        {children}
        <span className="ml-3 text-[16px]">→</span>
      </>
    )}
  </button>
)

export const AuthSecondaryButton = ({ children, className = '', ...props }) => (
  <button
    type="button"
    {...props}
    className={`flex h-[50px] w-full items-center justify-center rounded-[15px] border border-[#2e342f] bg-transparent font-mono text-[11px] uppercase tracking-[0.13em] text-[#8a9185] transition-colors hover:border-[#465045] hover:text-[#b3c2ac] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
)

export const AuthTextButton = ({ children, className = '', ...props }) => (
  <button
    type="button"
    {...props}
    className={`font-mono text-[11px] text-[#87957f] transition-colors hover:text-[#a8b5a1] ${className}`}
  >
    {children}
  </button>
)
