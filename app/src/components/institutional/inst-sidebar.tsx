'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV = [
  { href: '/institutional/dashboard',           label: 'Dashboard',           icon: GridIcon },
  { href: '/institutional/credit-use-case',     label: 'Análisis crediticio', icon: SearchDocIcon },
  { href: '/institutional/credit-memo/new',     label: 'Credit Memo',         icon: MemoIcon },
  { href: '/institutional/demos',               label: 'Demos',               icon: PlayIcon },
  { href: '/institutional/categories',          label: 'Categorías',          icon: TagIcon },
  { href: '/institutional/price-book',          label: 'Price Book',          icon: PriceIcon },
  { href: '/institutional/locations',           label: 'Zonas',               icon: MapIcon },
  { href: '/institutional/alerts',              label: 'Alertas',             icon: BellIcon },
  { href: '/institutional/exports',             label: 'Exportaciones',       icon: ExportIcon },
  { href: '/institutional/methodology',         label: 'Metodología',         icon: BookIcon },
  { href: '/institutional/access-logs',         label: 'Log de acceso',       icon: ClockIcon },
]

export function InstSidebar({ name, instName, planTier }: {
  name: string; instName: string; planTier: string
}) {
  const path   = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function logout() {
    await fetch('/api/institutional/auth', { method: 'DELETE' })
    router.push('/institutional/login')
  }

  const planLabel: Record<string, string> = {
    basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise', research: 'Research',
  }

  return (
    <>
      {/* Toggle button — always visible top-left */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed top-4 left-4 z-50 w-9 h-9 flex items-center justify-center
                   rounded-xl transition-all duration-150 hover:opacity-80"
        style={{ backgroundColor: open ? '#4D4A43' : '#FFFDF8', border: '1px solid #DED6C8',
                 boxShadow: '0 2px 8px rgba(46,42,36,0.10)' }}
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
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(46,42,36,0.35)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar drawer */}
      <aside
        className="fixed left-0 top-0 bottom-0 w-60 flex flex-col z-40
                   transition-transform duration-200 ease-out"
        style={{
          backgroundColor: '#FFFDF8',
          borderRight: '1px solid #DED6C8',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: open ? '4px 0 24px rgba(46,42,36,0.12)' : 'none',
        }}
      >
        {/* Brand */}
        <div className="px-6 pt-7 pb-5 pl-14">
          <Link href="/" onClick={() => setOpen(false)}>
            <span className="text-[20px] font-bold tracking-[-0.03em] text-signal-text">signal</span>
          </Link>
          <p className="text-[10px] font-semibold uppercase tracking-widest mt-0.5"
             style={{ color: '#5F6F52' }}>
            Demand Intelligence
          </p>
        </div>

        {/* Institution badge */}
        <div className="mx-3 mb-4 px-3 py-2.5 rounded-xl"
             style={{ backgroundColor: '#EEF1EA', border: '1px solid rgba(95,111,82,0.2)' }}>
          <p className="text-[12px] font-semibold text-signal-text truncate">{instName}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5"
             style={{ color: '#5F6F52' }}>
            Plan {planLabel[planTier] ?? planTier}
          </p>
        </div>

        {/* Nav */}
        <nav className="px-3 flex-1">
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

        {/* Back to Signal */}
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
                  style={{ backgroundColor: '#4D4A43' }}>
              {name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-signal-text truncate">{name}</p>
            </div>
            <button onClick={logout}
                    className="text-[11px] text-signal-ash hover:text-signal-text transition-colors shrink-0"
                    title="Cerrar sesión">
              ↩
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4 shrink-0" style={{ color: active ? '#5F6F52' : '#A7A196' }}
         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
function SearchDocIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4 shrink-0" style={{ color: active ? '#5F6F52' : '#A7A196' }}
         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}
function TagIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4 shrink-0" style={{ color: active ? '#5F6F52' : '#A7A196' }}
         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M7 7h.01M3 3h9l9 9a2 2 0 010 2.83l-5.17 5.17a2 2 0 01-2.83 0L3 12V3z" />
    </svg>
  )
}
function MapIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4 shrink-0" style={{ color: active ? '#5F6F52' : '#A7A196' }}
         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <circle cx="12" cy="11" r="3" />
    </svg>
  )
}
function ClockIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4 shrink-0" style={{ color: active ? '#5F6F52' : '#A7A196' }}
         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 7v5l3 3" />
    </svg>
  )
}
function MemoIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4 shrink-0" style={{ color: active ? '#5F6F52' : '#A7A196' }}
         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}
function PlayIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4 shrink-0" style={{ color: active ? '#5F6F52' : '#A7A196' }}
         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function PriceIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4 shrink-0" style={{ color: active ? '#5F6F52' : '#A7A196' }}
         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}
function BellIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4 shrink-0" style={{ color: active ? '#5F6F52' : '#A7A196' }}
         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}
function ExportIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4 shrink-0" style={{ color: active ? '#5F6F52' : '#A7A196' }}
         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}
function BookIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4 shrink-0" style={{ color: active ? '#5F6F52' : '#A7A196' }}
         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
}
