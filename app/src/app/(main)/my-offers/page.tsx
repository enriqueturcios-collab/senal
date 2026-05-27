import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getMyOffers, getPendingTradeNotifications } from '@/lib/data'
import { query } from '@/db'
import {
  cn, fmtCurrency, timeAgo,
  OFFER_STATUS_LABELS, OFFER_STATUS_COLORS,
  STATUS_LABELS, STATUS_COLORS,
} from '@/lib/utils'
import { TradeConfirmWidget } from '@/components/reputation/trade-confirm'
import { NotificationStack } from '@/components/notifications/notification-card'

export default async function MyOffersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [offers, proactiveOffers, pendingTrades] = await Promise.all([
    getMyOffers(session.user.id),
    query<{
      id: string; title: string; category: string | null
      price: number | null; max_price: number | null; currency: string
      is_active: boolean; view_count: number; created_at: string
    }>(`
      SELECT o.id, o.title, c.name AS category,
             o.price, o.max_price, o.currency,
             o.is_active, o.view_count, o.created_at::text
      FROM entrepreneur.proactive_offers o
      LEFT JOIN app.categories c ON c.id = o.category_id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
    `, [session.user.id]),
    getPendingTradeNotifications(session.user.id),
  ])

  const tradeNotifs = pendingTrades.map(n => ({
    id:         n.offer_id,
    href:       `/demand/${n.demand_id}`,
    headline:   n.buyer_confirmed_at ? 'Comprador confirmó — confirmá tu parte' : 'Tu oferta fue aceptada',
    title:      n.demand_title,
    meta:       fmtCurrency(n.price, n.currency),
    cta:        'Confirmar trato →',
    time:       n.updated_at,
    buyerReady: !!n.buyer_confirmed_at,
  }))

  return (
    <main className="min-h-screen bg-signal-bg pb-28 px-5 py-6 md:px-8">
      <div className="max-w-2xl mx-auto">

        <NotificationStack items={tradeNotifs} />

        {/* Header */}
        <div className="flex items-center gap-3 mb-7">
          <h1 className="text-[24px] font-bold text-signal-text flex-1"
              style={{ letterSpacing: '-0.02em' }}>
            Mis ofertas
          </h1>
          <Link href="/offer/new"
                className="btn-primary flex items-center gap-1.5 text-[12px] font-semibold
                           text-white px-4 py-2 rounded-xl"
                style={{ backgroundColor: '#5F6F52' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nueva oferta
          </Link>
          <Link href="/profile"
                className="text-[12px] font-medium text-signal-text-muted hover:text-signal-text
                           transition-colors px-3 py-2 rounded-xl"
                style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}>
            Perfil
          </Link>
        </div>

        {/* ── Mis ofertas proactivas ───────────────────────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#A7A196' }}>
              Publicaciones en el marketplace
            </p>
            {proactiveOffers.length > 0 && (
              <Link href="/entrepreneur/offers"
                    className="text-[11px] font-semibold" style={{ color: '#5F6F52' }}>
                Gestionar →
              </Link>
            )}
          </div>

          {proactiveOffers.length === 0 ? (
            <Link href="/offer/new" className="block group">
              <div className="interactive-card rounded-2xl p-5 text-center"
                   style={{ backgroundColor: '#FFFDF8', border: '1.5px dashed #DED6C8' }}>
                <p className="text-[22px] mb-2">📣</p>
                <p className="text-[13px] font-semibold text-signal-text mb-1">
                  Publicá lo que ofrecés
                </p>
                <p className="text-[11px] text-signal-text-muted">
                  Aparecé en el marketplace sin esperar una demanda. Los compradores te encuentran.
                </p>
                <p className="text-[12px] font-semibold mt-3" style={{ color: '#5F6F52' }}>
                  + Crear primera oferta
                </p>
              </div>
            </Link>
          ) : (
            <div className="space-y-2 stagger">
              {proactiveOffers.map(o => {
                const price = o.price && o.max_price
                  ? `${fmtCurrency(o.price, o.currency)} – ${fmtCurrency(o.max_price, o.currency)}`
                  : o.price     ? fmtCurrency(o.price, o.currency)
                  : o.max_price ? `hasta ${fmtCurrency(o.max_price, o.currency)}`
                  : 'A convenir'

                return (
                  <Link key={o.id} href={`/offers/${o.id}`} className="block group">
                    <div className="interactive-card rounded-2xl px-4 py-3.5"
                         style={{
                           backgroundColor: '#FFFDF8', border: '1px solid #DED6C8',
                           opacity: o.is_active ? 1 : 0.6,
                         }}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {o.category && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                    style={{ backgroundColor: '#EEF1EA', color: '#5F6F52' }}>
                                {o.category}
                              </span>
                            )}
                            {!o.is_active && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                    style={{ backgroundColor: '#EAE3D6', color: '#A7A196' }}>
                                Pausada
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] font-semibold text-signal-text truncate">{o.title}</p>
                          <p className="text-[11px] text-signal-ash mt-0.5">
                            {o.view_count} vistas · {timeAgo(o.created_at)}
                          </p>
                        </div>
                        <p className="text-[13px] font-bold text-signal-text shrink-0">{price}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Respuestas a demandas ────────────────────────────────────────── */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#A7A196' }}>
            Respuestas a demandas
          </p>

          {offers.length === 0 ? (
            <div className="rounded-2xl p-8 text-center"
                 style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
              <p className="text-[14px] font-semibold text-signal-text mb-1">Sin respuestas aún</p>
              <p className="text-[12px] text-signal-text-muted mb-5">
                Explorá demandas activas y enviá tu primera oferta.
              </p>
              <Link href="/"
                    className="btn-primary inline-block text-white text-[12px] font-semibold
                               px-4 py-2 rounded-xl"
                    style={{ backgroundColor: '#4D4A43' }}>
                Explorar demandas
              </Link>
            </div>
          ) : (
            <div className="space-y-3 stagger">
              {offers.map(o => {
                const needsConfirm = o.status === 'accepted' && !o.trade_completed_at
                return (
                  <div key={o.offer_id} className="space-y-2">
                    <Link href={`/demand/${o.demand_id}`} className="block group">
                      <div className="interactive-card rounded-2xl p-4"
                           style={{
                             backgroundColor: o.trade_completed_at ? '#EEF1EA'
                               : needsConfirm ? '#F7F9F5'
                               : '#FFFDF8',
                             border: o.trade_completed_at ? '1px solid rgba(95,111,82,0.25)'
                               : needsConfirm ? '1px solid rgba(95,111,82,0.2)'
                               : '1px solid #DED6C8',
                           }}>
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full',
                            OFFER_STATUS_COLORS[o.status])}>
                            {OFFER_STATUS_LABELS[o.status] ?? o.status}
                          </span>
                          <span className="text-[11px] text-signal-text-muted">{timeAgo(o.created_at)}</span>
                        </div>
                        <h3 className="font-semibold text-signal-text mb-0.5 line-clamp-2">{o.demand_title}</h3>
                        <p className="text-[12px] text-signal-text-muted mb-3">{o.category}</p>
                        <div className="flex items-center justify-between pt-2.5"
                             style={{ borderTop: '1px solid #EAE3D6' }}>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-signal-text-muted">Demanda:</span>
                            <span className={cn('font-medium px-2 py-0.5 rounded-full text-[11px]',
                              STATUS_COLORS[o.demand_status])}>
                              {STATUS_LABELS[o.demand_status]}
                            </span>
                          </div>
                          <span className="font-bold text-signal-text text-[14px]">
                            {fmtCurrency(o.price, o.currency)}
                          </span>
                        </div>
                      </div>
                    </Link>

                    {/* Seller-side trade confirm — shown inline below the card */}
                    {(needsConfirm || o.trade_completed_at) && (
                      <TradeConfirmWidget
                        offerId={o.offer_id}
                        userId={session.user.id}
                        role="seller"
                        buyerConfirmed={!!o.buyer_confirmed_at}
                        sellerConfirmed={!!o.seller_confirmed_at}
                        completed={!!o.trade_completed_at}
                        offerPrice={o.price}
                        offerCurrency={o.currency}
                        feeStatus={o.fee_status}
                        tradeId={o.trade_id ?? undefined}
                        counterpartyId={o.buyer_name !== 'Anónimo' ? o.buyer_id : undefined}
                        counterpartyName={o.buyer_name !== 'Anónimo' ? o.buyer_name : null}
                        alreadyVouched={o.already_vouched}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </main>
  )
}
