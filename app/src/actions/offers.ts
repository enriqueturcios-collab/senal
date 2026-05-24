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

  const o = parsed.data
  const offer = await queryOne<{ id: string }>(`
    INSERT INTO app.offers (demand_id, seller_id, price, currency, description, estimated_days)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING id
  `, [demandId, sellerId, o.price, o.currency, o.description ?? null, o.estimated_days ?? null])

  if (!offer) return { error: 'Error al enviar la oferta.' }

  revalidatePath(`/demand/${demandId}`)
  revalidatePath('/my-offers')
  return { success: true, offerId: offer.id }
}

export async function acceptOffer(buyerId: string, offerId: string) {
  const offer = await queryOne<{
    id: string; demand_id: string; seller_id: string; demand_user_id: string; demand_status: string
  }>(`
    SELECT o.id, o.demand_id, o.seller_id,
           d.user_id AS demand_user_id, d.status AS demand_status
    FROM app.offers o
    JOIN app.demands d ON d.id = o.demand_id
    WHERE o.id = $1
  `, [offerId])

  if (!offer) return { error: 'Oferta no encontrada.' }
  if (offer.demand_user_id !== buyerId) return { error: 'No autorizado.' }
  if (offer.demand_status !== 'open') return { error: 'La demanda ya no está abierta.' }

  // Accept this offer, reject all others
  await queryOne(
    "UPDATE app.offers SET status = 'accepted' WHERE id = $1",
    [offerId]
  )
  await queryOne(
    "UPDATE app.offers SET status = 'rejected' WHERE demand_id = $1 AND id != $2",
    [offer.demand_id, offerId]
  )
  await queryOne(
    "UPDATE app.demands SET status = 'in_progress' WHERE id = $1",
    [offer.demand_id]
  )

  revalidatePath(`/demand/${offer.demand_id}`)
  revalidatePath('/my-demands')
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

export async function confirmTransaction(
  userId: string,
  demandId: string,
  offerId: string,
  formData: FormData
) {
  const rating    = Number(formData.get('rating'))
  const reviewText = String(formData.get('review') ?? '').trim() || null

  const offer = await queryOne<{
    demand_user_id: string; seller_id: string
    price: number; currency: string; demand_status: string
    offer_status: string
  }>(`
    SELECT d.user_id AS demand_user_id, o.seller_id,
           o.price, o.currency, d.status AS demand_status, o.status AS offer_status
    FROM app.offers o
    JOIN app.demands d ON d.id = o.demand_id
    WHERE o.id = $1 AND o.demand_id = $2
  `, [offerId, demandId])

  if (!offer) return { error: 'Oferta no encontrada.' }
  if (offer.demand_user_id !== userId) return { error: 'No autorizado.' }
  if (offer.demand_status !== 'in_progress') return { error: 'La demanda no está en proceso.' }
  if (offer.offer_status !== 'accepted') return { error: 'La oferta no está aceptada.' }

  const tx = await queryOne<{ id: string }>(`
    INSERT INTO app.transactions
      (demand_id, offer_id, buyer_id, seller_id, final_price, currency, status)
    VALUES ($1,$2,$3,$4,$5,$6,'confirmed')
    RETURNING id
  `, [demandId, offerId, userId, offer.seller_id, offer.price, offer.currency])

  if (!tx) return { error: 'Error al confirmar la transacción.' }

  await queryOne("UPDATE app.demands SET status = 'closed' WHERE id = $1", [demandId])
  await queryOne("UPDATE app.offers  SET status = 'completed' WHERE id = $1", [offerId])

  if (rating >= 1 && rating <= 5) {
    await queryOne(`
      INSERT INTO app.ratings
        (transaction_id, rater_id, rated_user_id, rating, review, role_of_rated)
      VALUES ($1,$2,$3,$4,$5,'seller')
    `, [tx.id, userId, offer.seller_id, rating, reviewText])
  }

  revalidatePath(`/demand/${demandId}`)
  revalidatePath('/my-demands')
  return { success: true }
}
