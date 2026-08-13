import { Link } from 'react-router-dom'

const INDUSTRIES = ['Manufacturing', 'Retail', 'Services', 'Construction']

const FloatingCard = ({ className, children }) => (
  <div
    className={`absolute bg-white rounded-xl shadow-md border border-[#e8e8e0] px-4 py-3 ${className}`}
  >
    {children}
  </div>
)

const Hero = () => {
  return (
    <section
      className="w-full bg-[#f0ede6] relative overflow-hidden"
      style={{ minHeight: 'calc(100vh - 64px)' }}
    >
      {/* ── Subtle noise / grain texture overlay ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-6 w-full">

        {/* ── Top breadcrumb bar ── */}
        <div className="flex items-center justify-between pt-8 pb-2">
          <div className="flex items-center gap-2 text-[10px] text-[#999] tracking-[0.18em] uppercase font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5a7a4a] inline-block" />
            AI-Powered Enterprise Resource Planning
          </div>
          <div className="text-[10px] text-[#bbb] tracking-[0.15em] hidden sm:block">
            Est. 2026 &nbsp;·&nbsp; v2.0
          </div>
        </div>

        {/* ── Main two-column layout ── */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-0 pt-10 pb-16">

          {/* ── LEFT: Copy ── */}
          <div className="flex-[1.1] flex flex-col gap-7 pr-0 lg:pr-12">

            {/* Headline */}
            <h1
              className="text-[#1a1a14] leading-[1.02] tracking-[-0.02em] font-bold"
              style={{ fontSize: 'clamp(3.2rem, 6.5vw, 6rem)' }}
            >
              Run Your<br />
              Entire<br />
              Business.<br />
              <span style={{ color: '#4a6741' }}>Intelligently.</span>
            </h1>

            {/* Sub-copy — left-bordered */}
            <div className="border-l-2 border-[#c8c4b8] pl-4 max-w-[340px]">
              <p className="text-[#666] text-[15px] leading-[1.7]">
                One intelligent ERP platform for finance, sales,
                operations, people and projects — with AI built into
                every layer, not bolted on after.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <Link
                to="/request-demo"
                className="inline-flex items-center gap-2 bg-[#1a1a14] text-white text-sm font-medium px-6 py-3 rounded-xl hover:bg-[#2d2d20] transition-colors duration-150"
              >
                Request a Demo →
              </Link>
              <Link
                to="/platform"
                className="inline-flex items-center gap-2 text-[#444] text-sm font-medium px-6 py-3 rounded-xl border border-[#ccc8be] hover:bg-[#e8e4dc] transition-colors duration-150"
              >
                Explore Platform
              </Link>
            </div>

            {/* Industry tags */}
            <div className="flex flex-wrap items-center gap-0 mt-3">
              {INDUSTRIES.map((ind, i) => (
                <span key={ind} className="flex items-center">
                  <span className="text-[10px] text-[#999] tracking-[0.16em] uppercase">
                    {ind}
                  </span>
                  {i < INDUSTRIES.length - 1 && (
                    <span className="mx-3 text-[#ccc]">·</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Floating visual panel ── */}
          <div className="flex-1 relative min-h-[380px] lg:min-h-[460px]">

            {/* Dot grid */}
            <div
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage: 'radial-gradient(circle, #a0a090 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
              aria-hidden="true"
            />

            {/* ── Central logo orb ── */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="w-36 h-36 bg-[#1a1a14] rounded-full flex flex-col items-center justify-center shadow-2xl">
                <div className="grid grid-cols-2 gap-[5px] mb-2" aria-hidden="true">
                  <span className="w-[18px] h-[18px] rounded-[4px]" style={{ background: '#5a7a4a' }} />
                  <span className="w-[18px] h-[18px] rounded-[4px]" style={{ background: '#4a6638', opacity: 0.75 }} />
                  <span className="w-[18px] h-[18px] rounded-[4px]" style={{ background: '#3a5228', opacity: 0.5 }} />
                  <span className="w-[18px] h-[18px] rounded-[4px]" style={{ background: '#6a8a5a', opacity: 0.35 }} />
                </div>
                <span className="text-white text-[11px] font-semibold tracking-wide">SmartERP</span>
                <span className="text-[#888] text-[9px] tracking-widest">AI</span>
              </div>
            </div>

            {/* ── Floating card: AI Confidence 87% (top-right) ── */}
            <FloatingCard className="top-8 right-0 lg:right-4 min-w-[110px]">
              <p className="text-[#aaa] text-[9px] uppercase tracking-[0.14em] mb-1">AI Confidence</p>
              <p className="text-[#1a1a14] text-3xl font-bold leading-none">87%</p>
            </FloatingCard>

            {/* ── Floating card: 10 Modules Live (middle-right) ── */}
            <FloatingCard className="top-1/2 -translate-y-1/2 right-0 lg:-right-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#5a7a4a] shrink-0" />
              <span className="text-[#1a1a14] text-[12px] font-semibold whitespace-nowrap tracking-wide">
                10 Modules Live
              </span>
            </FloatingCard>

            {/* ── Floating card: Fraud Alerts Zero (bottom-center) ── */}
            <div className="absolute bottom-10 left-[42%] -translate-x-1/2 bg-[#1a1a14] text-white rounded-xl px-5 py-3 shadow-xl z-10">
              <p className="text-[#888] text-[9px] uppercase tracking-[0.14em] mb-1">Fraud Alerts</p>
              <p className="text-white text-2xl font-bold leading-none">Zero</p>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
