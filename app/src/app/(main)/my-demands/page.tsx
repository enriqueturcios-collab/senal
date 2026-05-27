import { ElementalGradient } from '@/components/ui/elemental-gradient'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getMyDemands, getNewOfferNotifications } from '@/lib/data'
import { NotificationStack } from '@/components/notifications/notification-card'
import { fmtCurrency } from '@/lib/utils'
import {
  cn, timeAgo,
  STATUS_LABELS, STATUS_COLORS,
  URGENCY_LABELS, URGENCY_COLORS,
} from '@/lib/utils'

export default async function MyDemandsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [demands, newOffers] = await Promise.all([
    getMyDemands(session.user.id),
    getNewOfferNotifications(session.user.id),
  ])

  const offerNotifs = newOffers.map(n => ({
    id:       n.offer_id,
    href:     `/demand/${n.demand_id}`,
    headline: 'Nueva oferta recibida',
    title:    n.demand_title,
    meta:     `${n.seller_name} · ${fmtCurrency(n.price, n.currency)}`,
    cta:      'Ver →',
    time:     n.created_at,
  }))

  return (
    <main className="min-h-screen bg-signal-bg pb-28 px-5 py-6 md:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="relative rounded-2xl overflow-hidden mb-5 h-24">
          <ElementalGradient />
          <div className="absolute inset-0 bg-black/45 flex items-end justify-between px-5 pb-4">
            <h1 className="text-[22px] font-bold text-white" style={{ letterSpacing: '-0.025em' }}>Mis demandas</h1>
            <Link
              href="/demand/new"
              className="text-[12px] font-bold px-4 py-2 rounded-xl transition-all"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              + Nueva
            </Link>
          </div>
        </div>

        <NotificationStack items={offerNotifs} />

        {demands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                 style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}>
              <svg className="w-6 h-6 text-signal-ash" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2
                         M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-signal-text mb-1">Sin demandas aún</p>
            <p className="text-[13px] text-signal-text-muted mb-6 max-w-xs">
              Publica lo que necesitas y recibe ofertas de proveedores locales.
            </p>
            <Link href="/demand/new"
              className="text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl
                         hover:opacity-90 transition-all shadow-button"
              style={{ backgroundColor: '#4D4A43' }}>
              Publicar primera demanda
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {demands.map(d => (
              <Link key={d.id} href={`/demand/${d.id}`} className="block group">
                <div className="rounded-2xl p-4 shadow-card transition-all duration-200
                                hover:-translate-y-0.5 hover:shadow-card-hover"
                     style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', STATUS_COLORS[d.status])}>
                      {STATUS_LABELS[d.status]}
                    </span>
                    <span className="text-[11px] text-signal-text-muted">{timeAgo(d.created_at)}</span>
                  </div>

                  <h3 className="font-semibold text-signal-text mb-1 line-clamp-1">{d.title}</h3>
                  <p className="text-[12px] text-signal-text-muted mb-3">{d.category}</p>

                  <div className="flex items-center justify-between pt-2.5"
                       style={{ borderTop: '1px solid #EAE3D6' }}>
                    <div className="flex gap-2 items-center">
                      <span className={cn(URGENCY_COLORS[d.urgency],
                        'px-2.5 py-0.5 rounded-full text-[11px] font-medium')}>
                        {URGENCY_LABELS[d.urgency]}
                      </span>
                      {(d.budget_min || d.budget_max) && (
                        <span className="text-[12px] text-signal-text-soft">
                          {fmtCurrency(d.budget_min ?? d.budget_max, d.currency)}
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      'text-[12px] font-medium',
                      d.offer_count > 0 ? 'text-signal-forest' : 'text-signal-ash'
                    )}>
                      {d.offer_count} {d.offer_count === 1 ? 'oferta' : 'ofertas'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
