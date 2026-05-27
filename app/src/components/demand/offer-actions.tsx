'use client'

import { useState } from 'react'
import Link from 'next/link'
import { acceptOffer, rejectOffer } from '@/actions/offers'
import { TradeConfirmWidget } from '@/components/reputation/trade-confirm'
import { cn, fmtCurrency, OFFER_STATUS_LABELS, OFFER_STATUS_COLORS } from '@/lib/utils'

interface Offer {
  id: string
  seller_id: string
  seller_name: string
  seller_rating: number | null
  seller_verified: boolean | null
  price: number
  currency: string
  description: string | null
  estimated_days: number | null
  status: string
  created_at: string
  buyer_confirmed_at: string | null
  seller_confirmed_at: string | null
  trade_completed_at: string | null
  trade_id: string | null
  already_vouched: boolean
  fee_status: string | null
}

export function OfferList({
  offers, demandId, buyerId, demandStatus,
}: {
  offers: Offer[]
  demandId: string
  buyerId: string
  demandStatus: string
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-signal-text">
        {offers.length} {offers.length === 1 ? 'oferta recibida' : 'ofertas recibidas'}
      </h3>
      {offers.map(o => (
        <OfferCard key={o.id} offer={o} demandId={demandId}
                   buyerId={buyerId} demandStatus={demandStatus} />
      ))}
    </div>
  )
}

function OfferCard({
  offer, demandId, buyerId, demandStatus,
}: {
  offer: Offer
  demandId: string
  buyerId: string
  demandStatus: string
}) {
  const [loading, setLoading] = useState(false)

  const canAct     = demandStatus === 'open'
  const canConfirm = (demandStatus === 'in_progress' || offer.trade_completed_at)
                     && offer.status === 'accepted'

  async function accept() {
    if (!confirm('¿Aceptar esta oferta? Las demás serán rechazadas.')) return
    setLoading(true)
    await acceptOffer(buyerId, offer.id)
  }

  async function reject() {
    setLoading(true)
    await rejectOffer(buyerId, offer.id)
  }

  const cardBg =
    offer.trade_completed_at
      ? { backgroundColor: '#EEF1EA', border: '1px solid rgba(95,111,82,0.25)' }
    : offer.status === 'accepted'
      ? { backgroundColor: '#F7F9F5', border: '1px solid rgba(95,111,82,0.2)' }
    : offer.status === 'rejected'
      ? { backgroundColor: '#F5F2EE', border: '1px solid #EAE3D6', opacity: 0.6 }
    : { backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }

  return (
    <div className="rounded-2xl p-4 space-y-3 shadow-card" style={cardBg}>
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/users/${offer.seller_id}`}
                className="font-medium text-signal-text hover:underline">
            {offer.seller_name}
          </Link>
          {offer.seller_rating && (
            <p className="text-[12px] mt-0.5" style={{ color: '#B8946F' }}>
              ★ {offer.seller_rating.toFixed(1)}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-signal-text">
            {fmtCurrency(offer.price, offer.currency)}
          </p>
          {offer.estimated_days && (
            <p className="text-[12px] text-signal-text-muted">{offer.estimated_days} días</p>
          )}
        </div>
      </div>

      {offer.description && (
        <p className="text-[13px] text-signal-text-soft">{offer.description}</p>
      )}

      <div className="flex items-center justify-between">
        <span className={cn('text-[11px] font-medium px-2.5 py-1 rounded-full',
          OFFER_STATUS_COLORS[offer.status])}>
          {OFFER_STATUS_LABELS[offer.status] ?? offer.status}
        </span>

        {canAct && offer.status === 'sent' && (
          <div className="flex gap-2">
            <button disabled={loading} onClick={reject}
              className="text-[13px] px-3 py-1.5 rounded-xl text-signal-text-soft
                         hover:bg-signal-surface-muted disabled:opacity-50 transition-colors"
              style={{ border: '1px solid #DED6C8' }}>
              Rechazar
            </button>
            <button disabled={loading} onClick={accept}
              className="text-[13px] px-3 py-1.5 rounded-xl text-white
                         hover:opacity-90 disabled:opacity-50 transition-all shadow-button"
              style={{ backgroundColor: '#5F6F52' }}>
              Aceptar
            </button>
          </div>
        )}
      </div>

      {canConfirm && (
        <div style={{ borderTop: '1px solid rgba(95,111,82,0.15)', paddingTop: '0.75rem' }}>
          <TradeConfirmWidget
            offerId={offer.id}
            userId={buyerId}
            role="buyer"
            buyerConfirmed={!!offer.buyer_confirmed_at}
            sellerConfirmed={!!offer.seller_confirmed_at}
            completed={!!offer.trade_completed_at}
            offerPrice={offer.price}
            offerCurrency={offer.currency}
            feeStatus={offer.fee_status}
            tradeId={offer.trade_id ?? undefined}
            counterpartyId={offer.seller_id}
            counterpartyName={offer.seller_name}
            alreadyVouched={offer.already_vouched}
          />
        </div>
      )}
    </div>
  )
}
