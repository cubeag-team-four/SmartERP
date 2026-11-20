/** Minimal full-screen placeholder shown while the startup session refresh is in flight. */
const SessionLoader = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex h-screen w-full items-center justify-center gap-3 bg-[#0c100d] font-mono text-[11px] uppercase tracking-[0.16em] text-[#737970]"
  >
    <span className="h-[9px] w-[9px] animate-pulse rounded-full bg-[#849b78]" />
    Restoring your session…
  </div>
)

export default SessionLoader
