import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDemandDetail } from '@/lib/data'
import {
  cn, fmtCurrency, timeAgo,
  URGENCY_LABELS, URGENCY_COLORS,
  STATUS_LABELS, STATUS_COLORS,
  OFFER_STATUS_LABELS, OFFER_STATUS_COLORS,
} from '@/lib/utils'
import { OfferForm } from '@/components/demand/offer-form'
import { OfferList } from '@/components/demand/offer-actions'
import { CancelDemandButton } from '@/components/demand/cancel-button'
import { TradeConfirmWidget } from '@/components/reputation/trade-confirm'

interface PageProps { params: { id: string } }

export default async function DemandDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  const { demand, offers, myOffer } = await getDemandDetail(
    params.id,
    session?.user.id
  )

  if (!demand) notFound()

  const isBuyer   = session?.user.id === demand.buyer_id
  const isSeller  = session && !isBuyer
  const canOffer  = isSeller && demand.status === 'open' && !myOffer
  const canCancel = isBuyer && ['open', 'in_progress'].includes(demand.status)

  const budget =
    demand.budget_min || demand.budget_max
      ? demand.budget_min && demand.budget_max
        ? `${fmtCurrency(demand.budget_min, demand.currency)} – ${fmtCurrency(demand.budget_max, demand.currency)}`
        : fmtCurrency(demand.budget_min ?? demand.budget_max, demand.currency)
      : null

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-8 pb-32 md:pb-10 bg-signal-bg min-h-screen">
      {/* Back nav */}
      <div className="pt-6 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-signal-text-muted
                     hover:text-signal-text transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Explorar
        </Link>
      </div>

      <div className="space-y-5">
        {/* Status + urgency badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_COLORS[demand.status])}>
            {STATUS_LABELS[demand.status]}
          </span>
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', URGENCY_COLORS[demand.urgency])}>
            {URGENCY_LABELS[demand.urgency]}
          </span>
          <span className="text-xs text-signal-text-muted ml-auto">{timeAgo(demand.created_at)}</span>
        </div>

        {/* Title & description */}
        <div>
          <h1 className="text-2xl font-bold text-signal-text mb-3 text-balance"
              style={{ letterSpacing: '-0.02em' }}>
            {demand.title}
          </h1>
          <p className="text-signal-text-soft leading-relaxed">{demand.description}</p>
        </div>

        {/* Tags */}
        {demand.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {demand.tags.map(tag => (
              <span key={tag}
                    className="text-xs text-signal-text-soft px-3 py-1 rounded-full font-medium"
                    style={{ backgroundColor: '#F1ECE2', border: '1px solid #EAE3D6' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Metadata */}
        <div className="rounded-2xl overflow-hidden shadow-card"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <InfoRow label="Categoría" value={demand.category_path || demand.category} />
          {(demand.zone || demand.municipality) && (
            <InfoRow
              label="Zona"
              value={[demand.zone, demand.municipality, demand.department].filter(Boolean).join(', ')}
            />
          )}
          {budget && <InfoRow label="Presupuesto" value={budget} highlight />}
          <InfoRow label="Publicado por" value={demand.buyer_name} />
          <InfoRow label="Ofertas" value={String(demand.offer_count)} />
          <InfoRow label="Vistas" value={String(demand.view_count)} />
        </div>

        {/* My offer status (seller view) */}
        {myOffer && (
          <div className="space-y-3">
            <div className={cn('rounded-2xl p-5 border-2', OFFER_STATUS_COLORS[myOffer.status])}>
              <p className="font-semibold text-signal-text">
                Tu oferta: {fmtCurrency(myOffer.price, demand.currency)}
              </p>
              <p className="text-sm mt-1 text-signal-text-soft">
                {OFFER_STATUS_LABELS[myOffer.status] ?? myOffer.status}
              </p>
            </div>
            {myOffer.status === 'accepted' && session && (
              <TradeConfirmWidget
                offerId={myOffer.id}
                userId={session.user.id}
                role="seller"
                buyerConfirmed={!!myOffer.buyer_confirmed_at}
                sellerConfirmed={!!myOffer.seller_confirmed_at}
                completed={!!myOffer.trade_completed_at}
                offerPrice={myOffer.price}
                offerCurrency={myOffer.currency}
                feeStatus={myOffer.fee_status}
                tradeId={myOffer.trade_id ?? undefined}
                counterpartyId={myOffer.buyer_id ?? undefined}
                counterpartyName={myOffer.buyer_display_name}
                alreadyVouched={myOffer.already_vouched}
              />
            )}
          </div>
        )}

        {/* Offer form */}
        {canOffer && <OfferForm demandId={demand.id} categoryId={demand.category_id} />}

        {!session && demand.status === 'open' && (
          <div className="rounded-2xl p-6 text-center shadow-card"
               style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
            <p className="text-sm text-signal-text-soft mb-4">
              Inicia sesión para enviar una oferta
            </p>
            <Link
              href="/login"
              className="inline-block text-white text-sm font-semibold
                         px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-button"
              style={{ backgroundColor: '#4D4A43' }}
            >
              Entrar
            </Link>
          </div>
        )}

        {/* Offers list (buyer only) */}
        {isBuyer && offers.length > 0 && (
          <OfferList
            offers={offers}
            demandId={demand.id}
            buyerId={demand.buyer_id}
            demandStatus={demand.status}
          />
        )}

        {/* Cancel demand */}
        {canCancel && (
          <CancelDemandButton userId={session!.user.id} demandId={demand.id} />
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5"
         style={{ borderBottom: '1px solid #EAE3D6' }}>
      <span className="text-sm text-signal-text-muted">{label}</span>
      <span className="text-sm font-semibold text-right max-w-[60%]"
            style={{ color: highlight ? '#5F6F52' : '#171714' }}>
        {value}
      </span>
    </div>
  )
}
