import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { queryOne } from '@/db'
import { SidebarNav } from './sidebar-nav'
import { NotificationBell } from '@/components/notifications/bell'
import { ElementalGradient } from '@/components/ui/elemental-gradient'

export async function Sidebar() {
  const session = await getServerSession(authOptions)
  const name     = session?.user.name ?? ''
  const email    = session?.user.email ?? ''
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  let badges = { demands: 0, offers: 0 }
  if (session?.user.id) {
    const [d, o] = await Promise.all([
      queryOne<{ n: number }>(`
        SELECT COUNT(*)::int AS n FROM app.offers o
        JOIN app.demands d ON d.id = o.demand_id
        WHERE d.user_id = $1 AND o.status = 'sent'
      `, [session.user.id]),
      queryOne<{ n: number }>(`
        SELECT COUNT(*)::int AS n FROM app.offers o
        LEFT JOIN reputation.verified_trades vt ON vt.offer_id = o.id
        WHERE o.seller_id = $1
          AND o.status = 'accepted'
          AND (vt.id IS NULL OR vt.seller_confirmed_at IS NULL)
      `, [session.user.id]),
    ])
    badges = { demands: d?.n ?? 0, offers: o?.n ?? 0 }
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 flex flex-col z-30"
           style={{ backgroundColor: '#FFFDF8', borderRight: '1px solid #DED6C8' }}>

      {/* Logo + actions — gradient header */}
      <div className="relative h-20 overflow-hidden shrink-0">
        <ElementalGradient />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative h-full flex items-center justify-between px-4">
          <Link href="/">
            <span className="text-[22px] font-bold tracking-[-0.03em] text-white
                             hover:opacity-80 transition-opacity duration-150">
              signal
            </span>
          </Link>
          <NotificationBell align="left" />
        </div>
      </div>

      {/* Navigation */}
      <SidebarNav badges={badges} />

      <div className="flex-1" />

      {/* Portal access cards */}
      <div className="px-3 pb-3 space-y-2">

        {/* Entrepreneur */}
        <Link href="/entrepreneur/dashboard" className="block group">
          <div className="interactive-card relative overflow-hidden rounded-xl px-3.5 py-3"
               style={{
                 background: 'linear-gradient(135deg, #4D4A43 0%, #2E2A24 100%)',
               }}>
            {/* shine sweep */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                 style={{
                   background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%)',
                 }} />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest"
                   style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Entrepreneur
                </p>
                <p className="text-[13px] font-bold text-white leading-tight mt-0.5">
                  Mi negocio
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ backgroundColor: 'rgba(95,111,82,0.5)' }}>
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>
        </Link>

        {/* Institutional */}
        <Link href="/institutional/dashboard" className="block group">
          <div className="interactive-card relative overflow-hidden rounded-xl px-3.5 py-3"
               style={{
                 background: 'linear-gradient(135deg, #1C2B1A 0%, #0F1A0E 100%)',
               }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                 style={{
                   background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)',
                 }} />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest"
                   style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Institucional
                </p>
                <p className="text-[13px] font-bold text-white leading-tight mt-0.5">
                  Demand Intel
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <svg className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.7)' }}
                     fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </Link>

        {/* CTAs */}
        <div className="grid grid-cols-2 gap-2">
          <Link href="/demand/new"
                className="btn-primary flex items-center justify-center gap-1.5
                           text-[12px] font-semibold text-white py-2.5 rounded-xl shadow-button"
                style={{ backgroundColor: '#4D4A43' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Demanda
          </Link>
          <Link href="/offer/new"
                className="btn-primary flex items-center justify-center gap-1.5
                           text-[12px] font-semibold text-white py-2.5 rounded-xl shadow-button"
                style={{ backgroundColor: '#5F6F52' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            Oferta
          </Link>
        </div>
      </div>

      {/* Admin link */}
      {session?.user.role === 'admin' && (
        <div className="px-3 pb-2">
          <Link href="/admin/payments"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold
                           hover:bg-signal-surface-muted transition-colors"
                style={{ color: '#B8795B' }}>
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955
                       11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29
                       9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Admin · Pagos
          </Link>
        </div>
      )}

      {/* User */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid #DED6C8' }}>
        {session ? (
          <Link
            href="/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                       hover:bg-signal-surface-muted transition-colors duration-150"
          >
            <span className="w-7 h-7 rounded-full flex items-center justify-center
                             text-[11px] font-bold shrink-0 text-white"
                  style={{ backgroundColor: '#5F6F52' }}>
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-signal-text truncate leading-tight">{name}</p>
              <p className="text-[11px] text-signal-text-muted truncate leading-tight mt-0.5">{email}</p>
            </div>
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                       text-[13px] font-medium text-signal-text-muted
                       hover:bg-signal-surface-muted hover:text-signal-text
                       transition-colors duration-150"
          >
            Iniciar sesión
          </Link>
        )}
      </div>

    </aside>
  )
}
