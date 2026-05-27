import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getNewOfferNotifications, getPendingTradeNotifications } from '@/lib/data'
import { fmtCurrency } from '@/lib/utils'
import { NotificationBellClient } from './bell-client'

export async function NotificationBell({ align = 'right' }: { align?: 'left' | 'right' } = {}) {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const [newOffers, pendingTrades] = await Promise.all([
    getNewOfferNotifications(session.user.id),
    getPendingTradeNotifications(session.user.id),
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

  const tradeNotifs = pendingTrades.map(n => ({
    id:         n.offer_id,
    href:       `/demand/${n.demand_id}`,
    headline:   n.buyer_confirmed_at ? 'Comprador confirmó — confirmá tu parte' : 'Tu oferta fue aceptada',
    title:      n.demand_title,
    meta:       fmtCurrency(n.price, n.currency),
    cta:        'Confirmar →',
    time:       n.updated_at,
    buyerReady: !!n.buyer_confirmed_at,
  }))

  // Trade confirmations first (higher urgency), then new offers
  const items = [...tradeNotifs, ...offerNotifs]

  return <NotificationBellClient items={items} align={align} />
}
