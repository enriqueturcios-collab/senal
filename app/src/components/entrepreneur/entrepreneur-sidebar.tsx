'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { EntrepreneurPlan } from '@/lib/entitlements/entrepreneur-plans'
import { PLAN_DEFINITIONS, hasFeature } from '@/lib/entitlements/entrepreneur-plans'

// ── Icons ─────────────────────────────────────────────────────────────────────
function icon(d: string) {
  return function({ active }: { active: boolean }) {
    return (
      <svg className="w-4 h-4 shrink-0" style={{ color: active ? '#5F6F52' : '#A7A196' }}
           fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      </svg>
    )
  }
}

const DashIcon  = icon('M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z')
const InboxIcon = icon('M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4')
const BoxIcon   = icon('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4')
const BellIcon  = icon('M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9')
const PulseIcon = icon('M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z')
const ChartIcon = icon('M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z')
const StarIcon      = icon('M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z')
const MegaphoneIcon = icon('M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z')

interface NavItem {
  href: string
  label: string
  icon: React.FC<{ active: boolean }>
  requiredFeature?: string
}

const NAV: NavItem[] = [
  { href: '/entrepreneur/dashboard',     label: 'Dashboard',       icon: DashIcon },
  { href: '/entrepreneur/opportunities', label: 'Oportunidades',   icon: InboxIcon },
  { href: '/entrepreneur/offers',        label: 'Mis Ofertas',     icon: MegaphoneIcon },
  { href: '/entrepreneur/inventory',     label: 'Inventario',      icon: BoxIcon },
  { href: '/entrepreneur/alerts',        label: 'Alertas',         icon: BellIcon },
  { href: '/entrepreneur/market-pulse',  label: 'Market Pulse',    icon: PulseIcon },
  { href: '/entrepreneur/analytics',     label: 'Mi Analítica',    icon: ChartIcon },
  { href: '/entrepreneur/subscription',  label: 'Suscripción',     icon: StarIcon },
]

const PLAN_COLORS: Record<EntrepreneurPlan, string> = {
  free:    '#A7A196',
  starter: '#B8946F',
  growth:  '#5F6F52',
  scale:   '#4D4A43',
}

export function EntrepreneurSidebar({
  name, businessName, plan,
}: {
  name: string; businessName: string | null; plan: EntrepreneurPlan
}) {
  const path   = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const planDef   = PLAN_DEFINITIONS[plan]
  const planColor = PLAN_COLORS[plan]

  return (
    <>
      {/* Hamburger */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed top-4 left-4 z-50 w-9 h-9 flex items-center justify-center
                   rounded-xl transition-all duration-150 hover:opacity-80"
        style={{
          backgroundColor: open ? '#4D4A43' : '#FFFDF8',
          border: '1px solid #DED6C8',
          boxShadow: '0 2px 8px rgba(46,42,36,0.10)',
        }}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
      >
        {open ? (
          <svg className="w-4 h-4" style={{ color: '#fff' }} fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-4 h-4" style={{ color: '#4D4A43' }} fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(46,42,36,0.35)' }}
             onClick={() => setOpen(false)} />
      )}

      {/* Drawer */}
      <aside
        className="fixed left-0 top-0 bottom-0 w-60 flex flex-col z-40 transition-transform duration-200 ease-out"
        style={{
          backgroundColor: '#FFFDF8',
          borderRight: '1px solid #DED6C8',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: open ? '4px 0 24px rgba(46,42,36,0.12)' : 'none',
        }}
      >
        {/* Brand */}
        <div className="px-6 pt-7 pb-4 pl-14">
          <Link href="/" onClick={() => setOpen(false)}>
            <span className="text-[20px] font-bold tracking-[-0.03em] text-signal-text">signal</span>
          </Link>
          <p className="text-[10px] font-semibold uppercase tracking-widest mt-0.5"
             style={{ color: planColor }}>
            Entrepreneur
          </p>
        </div>

        {/* Plan badge */}
        <div className="mx-3 mb-4 px-3 py-2.5 rounded-xl"
             style={{ backgroundColor: `${planColor}18`, border: `1px solid ${planColor}33` }}>
          <p className="text-[12px] font-semibold text-signal-text truncate">
            {businessName ?? name}
          </p>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider"
               style={{ color: planColor }}>
              {planDef.name}
            </p>
            {plan === 'free' && (
              <Link href="/entrepreneur/pricing"
                    onClick={() => setOpen(false)}
                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: '#5F6F52', color: '#fff' }}>
                Upgrade
              </Link>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 flex-1 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path === href || path.startsWith(href + '/')
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5
                                text-[13px] font-medium transition-all duration-150 ${
                      active
                        ? 'text-signal-forest'
                        : 'text-signal-text-soft hover:text-signal-text hover:bg-signal-surface-muted'
                    }`}
                    style={active ? { backgroundColor: '#EEF1EA' } : {}}>
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                        style={{ backgroundColor: '#5F6F52' }} />
                )}
                <Icon active={active} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Volver al marketplace */}
        <div className="px-3 pb-2">
          <Link href="/" onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px]
                           text-signal-text-muted hover:text-signal-text hover:bg-signal-surface-muted
                           transition-colors">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Volver a Signal
          </Link>
        </div>

        {/* User footer */}
        <div className="px-3 py-3" style={{ borderTop: '1px solid #DED6C8' }}>
          <div className="flex items-center gap-3 px-3 py-2">
            <span className="w-7 h-7 rounded-full flex items-center justify-center
                             text-[11px] font-bold shrink-0 text-white"
                  style={{ backgroundColor: planColor }}>
              {name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-signal-text truncate">{name}</p>
            </div>
            <Link href="/profile"
                  onClick={() => setOpen(false)}
                  className="text-[11px] text-signal-ash hover:text-signal-text transition-colors shrink-0"
                  title="Mi perfil">
              ⚙
            </Link>
          </div>
        </div>
      </aside>
    </>
  )
}
