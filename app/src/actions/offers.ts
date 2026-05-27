'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { queryOne } from '@/db'

const OfferSchema = z.object({
  price:          z.coerce.number().positive(),
  currency:       z.enum(['GTQ', 'USD']).default('GTQ'),
  description:    z.string().min(10).max(1000).optional(),
  estimated_days: z.coerce.number().int().min(1).max(365).optional().nullable(),
})

export async function submitOffer(
  sellerId: string,
  demandId: string,
  formData: FormData
) {
  const parsed = OfferSchema.safeParse({
    price:          formData.get('price'),
    currency:       formData.get('currency') || 'GTQ',
    description:    formData.get('description') || undefined,
    estimated_days: formData.get('estimated_days') || null,
  })

  if (!parsed.success) return { error: 'Datos inválidos. Revisa precio y descripción.' }

  const demand = await queryOne<{ user_id: string; status: string }>(
    "SELECT user_id, status FROM app.demands WHERE id = $1",
    [demandId]
  )
  if (!demand) return { error: 'Demanda no encontrada.' }
  if (demand.status !== 'open') return { error: 'Esta demanda ya no acepta ofertas.' }
  if (demand.user_id === sellerId) return { error: 'No puedes ofertar en tu propia demanda.' }

  const existing = await queryOne(
    'SELECT id FROM app.offers WHERE demand_id = $1 AND seller_id = $2',
    [demandId, sellerId]
  )
  if (existing) return { error: 'Ya enviaste una oferta a esta demanda.' }

  const imageUrlsRaw = formData.get('image_urls')
  const imageUrls = imageUrlsRaw
    ? String(imageUrlsRaw).split(',').map(u => u.trim()).filter(Boolean)
    : []

  const o = parsed.data
  const offer = await queryOne<{ id: string }>(`
    INSERT INTO app.offers (demand_id, seller_id, price, currency, description, estimated_days, image_urls)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING id
  `, [demandId, sellerId, o.price, o.currency, o.description ?? null, o.estimated_days ?? null, imageUrls])

  if (!offer) return { error: 'Error al enviar la oferta.' }

  revalidatePath(`/demand/${demandId}`)
  revalidatePath('/my-offers')
  return { success: true, offerId: offer.id }
}

export async function acceptOffer(buyerId: string, offerId: string) {
  const offer = await queryOne<{
    id: string; demand_id: string; seller_id: string
    demand_user_id: string; demand_status: string
    price: number; currency: string
  }>(`
    SELECT o.id, o.demand_id, o.seller_id,
           d.user_id AS demand_user_id, d.status AS demand_status,
           o.price, o.currency
    FROM app.offers o
    JOIN app.demands d ON d.id = o.demand_id
    WHERE o.id = $1
  `, [offerId])

  if (!offer) return { error: 'Oferta no encontrada.' }
  if (offer.demand_user_id !== buyerId) return { error: 'No autorizado.' }
  if (offer.demand_status !== 'open') return { error: 'La demanda ya no está abierta.' }

  await queryOne("UPDATE app.offers SET status = 'accepted' WHERE id = $1", [offerId])
  await queryOne(
    "UPDATE app.offers SET status = 'rejected' WHERE demand_id = $1 AND id != $2",
    [offer.demand_id, offerId]
  )
  await queryOne(
    "UPDATE app.demands SET status = 'in_progress' WHERE id = $1",
    [offer.demand_id]
  )

  // Create the reputation trade record — both parties will confirm against this
  await queryOne(`
    INSERT INTO reputation.verified_trades
      (offer_id, demand_id, buyer_id, seller_id, amount, currency)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (offer_id) DO NOTHING
  `, [offerId, offer.demand_id, buyerId, offer.seller_id, offer.price, offer.currency])

  revalidatePath(`/demand/${offer.demand_id}`)
  revalidatePath('/my-demands')
  revalidatePath('/my-offers')
  return { success: true }
}

export async function rejectOffer(buyerId: string, offerId: string) {
  const offer = await queryOne<{ demand_user_id: string }>(
    `SELECT d.user_id AS demand_user_id
     FROM app.offers o JOIN app.demands d ON d.id = o.demand_id
     WHERE o.id = $1`,
    [offerId]
  )

  if (!offer) return { error: 'Oferta no encontrada.' }
  if (offer.demand_user_id !== buyerId) return { error: 'No autorizado.' }

  await queryOne("UPDATE app.offers SET status = 'rejected' WHERE id = $1", [offerId])

  return { success: true }
}

export async function confirmTrade(userId: string, offerId: string) {
  const trade = await queryOne<{
    id: string; demand_id: string
    buyer_id: string; seller_id: string
    buyer_confirmed_at: string | null
    seller_confirmed_at: string | null
  }>(`
    SELECT id, demand_id, buyer_id, seller_id,
           buyer_confirmed_at::text, seller_confirmed_at::text
    FROM reputation.verified_trades
    WHERE offer_id = $1
  `, [offerId])

  if (!trade) return { error: 'Trato no encontrado.' }

  const isBuyer  = trade.buyer_id  === userId
  const isSeller = trade.seller_id === userId
  if (!isBuyer && !isSeller) return { error: 'No autorizado.' }
  if (isBuyer  && trade.buyer_confirmed_at)  return { error: 'Ya confirmaste este trato.' }
  if (isSeller && trade.seller_confirmed_at) return { error: 'Ya confirmaste este trato.' }

  const col = isBuyer ? 'buyer_confirmed_at' : 'seller_confirmed_at'
  const updated = await queryOne<{
    buyer_confirmed_at: string | null
    seller_confirmed_at: string | null
  }>(
    `UPDATE reputation.verified_trades SET ${col} = now()
     WHERE id = $1
     RETURNING buyer_confirmed_at::text, seller_confirmed_at::text`,
    [trade.id]
  )

  // Both sides confirmed → seal the trade
  if (updated?.buyer_confirmed_at && updated?.seller_confirmed_at) {
    await queryOne(
      `UPDATE reputation.verified_trades SET completed_at = now() WHERE id = $1`,
      [trade.id]
    )
    await queryOne(
      `UPDATE app.offers  SET status = 'completed' WHERE id = $1`, [offerId]
    )
    await queryOne(
      `UPDATE app.demands SET status = 'closed', closed_at = now() WHERE id = $1`,
      [trade.demand_id]
    )
  }

  revalidatePath(`/demand/${trade.demand_id}`)
  revalidatePath('/my-demands')
  revalidatePath('/my-offers')
  return { success: true, completed: !!(updated?.buyer_confirmed_at && updated?.seller_confirmed_at) }
}
