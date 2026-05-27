'use client'

import { ElementalGradient } from '@/components/ui/elemental-gradient'

const THEMES = [
  { label: 'Lava',         color: '#FF6B35' },
  { label: 'Agua',         color: '#00B4D8' },
  { label: 'Hojas',        color: '#52B788' },
  { label: 'Crepúsculo',   color: '#E040FB' },
]

export default function GradientPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">

      {/* ── The gradient, fills the whole viewport ─────────────────────────── */}
      <div className="absolute inset-0">
        <ElementalGradient />
      </div>

      {/* ── Overlay content (like Stripe's hero text over the mesh) ────────── */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full backdrop-blur-md"
             style={{ backgroundColor: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/70">
            Elemental Gradient
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-[clamp(2.5rem,8vw,7rem)] font-bold leading-[0.95] tracking-[-0.04em] text-white mb-6 max-w-4xl">
          signal
        </h1>

        <p className="text-[clamp(1rem,2vw,1.3rem)] text-white/55 font-medium max-w-md leading-relaxed mb-10">
          Inteligencia de demanda para Guatemala.
        </p>

        {/* Theme labels — show which palettes cycle */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-14">
          {THEMES.map(th => (
            <div key={th.label}
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md"
                 style={{ backgroundColor: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: th.color }} />
              <span className="text-[12px] font-semibold text-white/70">{th.label}</span>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href="/"
             className="px-7 py-3.5 rounded-2xl text-[14px] font-bold backdrop-blur-md transition-all hover:scale-[1.03]"
             style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: '#111' }}>
            Abrir Signal →
          </a>
          <a href="/institutional/login"
             className="px-7 py-3.5 rounded-2xl text-[14px] font-bold backdrop-blur-md transition-all hover:scale-[1.03]"
             style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>
            Institucional
          </a>
        </div>
      </div>

      {/* ── Bottom fade ────────────────────────────────────────────────────── */}
      <div className="absolute bottom-0 inset-x-0 h-32 pointer-events-none"
           style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.4))' }} />

      {/* ── Subtle noise texture overlay for grain/depth ─────────────────── */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
             backgroundSize: '200px 200px',
           }} />
    </div>
  )
}
