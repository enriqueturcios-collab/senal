'use client'

import { useState } from 'react'
import { acceptOffer, rejectOffer, confirmTransaction } from '@/actions/offers'
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
}

export function OfferList({
  offers,
  demandId,
  buyerId,
  demandStatus,
}: {
  offers: Offer[]
  demandId: string
  buyerId: string
  demandStatus: string
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900">
        {offers.length} {offers.length === 1 ? 'oferta recibida' : 'ofertas recibidas'}
      </h3>

      {offers.map(o => (
        <OfferCard
          key={o.id}
          offer={o}
          demandId={demandId}
          buyerId={buyerId}
          demandStatus={demandStatus}
        />
      ))}
    </div>
  )
}

function OfferCard({
  offer,
  demandId,
  buyerId,
  demandStatus,
}: {
  offer: Offer
  demandId: string
  buyerId: string
  demandStatus: string
}) {
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [rating, setRating] = useState(5)

  const canAct   = demandStatus === 'open'
  const canConfirm = demandStatus === 'in_progress' && offer.status === 'accepted'

  async function accept() {
    if (!confirm('¿Aceptar esta oferta? Las demás serán rechazadas.')) return
    setLoading(true)
    await acceptOffer(buyerId, offer.id)
  }

  async function reject() {
    setLoading(true)
    await rejectOffer(buyerId, offer.id)
  }

  async function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    fd.set('rating', String(rating))
    await confirmTransaction(buyerId, demandId, offer.id, fd)
  }

  return (
    <div className={cn(
      'border rounded-xl p-4 space-y-3',
      offer.status === 'accepted' ? 'border-brand-300 bg-brand-50' :
      offer.status === 'rejected' ? 'border-gray-100 bg-gray-50 opacity-60' :
      'border-gray-200 bg-white'
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900">{offer.seller_name}</p>
          {offer.seller_rating && (
            <p className="text-xs text-amber-600">★ {offer.seller_rating.toFixed(1)}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{fmtCurrency(offer.price, offer.currency)}</p>
          {offer.estimated_days && (
            <p className="text-xs text-gray-400">{offer.estimated_days} días</p>
          )}
        </div>
      </div>

      {offer.description && (
        <p className="text-sm text-gray-600">{offer.description}</p>
      )}

      <div className="flex items-center justify-between">
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', OFFER_STATUS_COLORS[offer.status])}>
          {OFFER_STATUS_LABELS[offer.status] ?? offer.status}
        </span>

        {canAct && offer.status === 'sent' && (
          <div className="flex gap-2">
            <button
              disabled={loading}
              onClick={reject}
              className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Rechazar
            </button>
            <button
              disabled={loading}
              onClick={accept}
              className="text-sm px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
            >
              Aceptar
            </button>
          </div>
        )}
      </div>

      {canConfirm && !confirming && (
        <button
          onClick={() => setConfirming(true)}
          className="w-full bg-emerald-500 text-white font-medium py-2.5 rounded-lg text-sm hover:bg-emerald-600"
        >
          Confirmar trabajo completado
        </button>
      )}

      {canConfirm && confirming && (
        <form onSubmit={handleConfirm} className="space-y-3 pt-2 border-t border-brand-200">
          <p className="text-sm font-medium text-gray-700">Califica al proveedor</p>

          <div className="flex gap-1">
            {[1,2,3,4,5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={cn('text-2xl', n <= rating ? 'text-amber-400' : 'text-gray-200')}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            name="review"
            rows={2}
            placeholder="Opcional: deja un comentario"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex-1 border border-gray-200 py-2 rounded-lg text-sm text-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-500 text-white font-medium py-2 rounded-lg text-sm hover:bg-emerald-600 disabled:opacity-50"
            >
              {loading ? 'Confirmando…' : 'Confirmar'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
