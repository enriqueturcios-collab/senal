'use server'

import { revalidatePath } from 'next/cache'
import { queryOne } from '@/db'

// ─── Avales ───────────────────────────────────────────────────────────────────

export async function giveVouch(voucherId: string, voucheeId: string, tradeId: string) {
  if (voucherId === voucheeId) return { error: 'No podés avalarte a vos mismo.' }

  // Trade must be completed and the voucher must have been a party to it
  const trade = await queryOne<{
    buyer_id: string; seller_id: string; completed_at: string | null
  }>(
    `SELECT buyer_id, seller_id, completed_at FROM reputation.verified_trades WHERE id = $1`,
    [tradeId]
  )

  if (!trade)              return { error: 'Trato no encontrado.' }
  if (!trade.completed_at) return { error: 'El trato todavía no está completado.' }

  const wasParty = trade.buyer_id === voucherId || trade.seller_id === voucherId
  if (!wasParty) return { error: 'No participaste en este trato.' }

  const isVoucheeOtherParty =
    (trade.buyer_id === voucherId && trade.seller_id === voucheeId) ||
    (trade.seller_id === voucherId && trade.buyer_id === voucheeId)
  if (!isVoucheeOtherParty) return { error: 'Solo podés avalar a la otra parte del trato.' }

  try {
    await queryOne(`
      INSERT INTO reputation.vouches (voucher_id, vouchee_id, trade_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (voucher_id, vouchee_id) DO NOTHING
    `, [voucherId, voucheeId, tradeId])
  } catch {
    return { error: 'Error al registrar el aval.' }
  }

  revalidatePath(`/users/${voucheeId}`)
  revalidatePath('/profile')
  return { success: true }
}

// ─── Disputas ─────────────────────────────────────────────────────────────────

export async function openDispute(
  complainantId: string,
  respondentId: string,
  offerId: string,
  description: string
) {
  if (!description.trim()) return { error: 'La descripción es obligatoria.' }
  if (complainantId === respondentId) return { error: 'No podés abrir una disputa contra vos mismo.' }

  const offer = await queryOne<{
    seller_id: string; buyer_id: string; status: string
  }>(`
    SELECT o.seller_id, d.user_id AS buyer_id, o.status
    FROM app.offers o JOIN app.demands d ON d.id = o.demand_id
    WHERE o.id = $1
  `, [offerId])

  if (!offer) return { error: 'Oferta no encontrada.' }
  if (!['accepted', 'completed'].includes(offer.status))
    return { error: 'Solo se pueden abrir disputas sobre ofertas aceptadas.' }

  const isParty =
    (complainantId === offer.seller_id && respondentId === offer.buyer_id) ||
    (complainantId === offer.buyer_id  && respondentId === offer.seller_id)
  if (!isParty) return { error: 'Solo las partes del trato pueden abrir una disputa.' }

  try {
    const dispute = await queryOne<{ id: string }>(`
      INSERT INTO reputation.disputes (complainant_id, respondent_id, offer_id, description)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [complainantId, respondentId, offerId, description.trim()])

    revalidatePath(`/users/${respondentId}`)
    revalidatePath('/profile')
    return { success: true, disputeId: dispute!.id }
  } catch {
    return { error: 'Ya existe una disputa para esta oferta.' }
  }
}

export async function replyToDispute(respondentId: string, disputeId: string, reply: string) {
  if (!reply.trim()) return { error: 'La respuesta no puede estar vacía.' }

  const dispute = await queryOne<{ respondent_id: string; status: string }>(
    `SELECT respondent_id, status FROM reputation.disputes WHERE id = $1`, [disputeId]
  )
  if (!dispute) return { error: 'Disputa no encontrada.' }
  if (dispute.respondent_id !== respondentId) return { error: 'No autorizado.' }
  if (dispute.status !== 'open') return { error: 'La disputa ya no está abierta.' }

  await queryOne(
    `UPDATE reputation.disputes SET respondent_reply = $1 WHERE id = $2`,
    [reply.trim(), disputeId]
  )
  revalidatePath(`/disputes/${disputeId}`)
  return { success: true }
}

export async function resolveDispute(complainantId: string, disputeId: string, note?: string) {
  const dispute = await queryOne<{ complainant_id: string; status: string; respondent_id: string }>(
    `SELECT complainant_id, status, respondent_id FROM reputation.disputes WHERE id = $1`, [disputeId]
  )
  if (!dispute) return { error: 'Disputa no encontrada.' }
  if (dispute.complainant_id !== complainantId) return { error: 'Solo el denunciante puede resolver.' }
  if (dispute.status !== 'open') return { error: 'La disputa ya está cerrada.' }

  await queryOne(`
    UPDATE reputation.disputes
    SET status = 'resolved', resolved_at = now(), resolution_note = $1
    WHERE id = $2
  `, [note?.trim() || null, disputeId])

  revalidatePath(`/disputes/${disputeId}`)
  revalidatePath(`/users/${dispute.respondent_id}`)
  return { success: true }
}

export async function markUnresolved(userId: string, disputeId: string) {
  const dispute = await queryOne<{
    complainant_id: string; respondent_id: string; status: string
  }>(
    `SELECT complainant_id, respondent_id, status FROM reputation.disputes WHERE id = $1`, [disputeId]
  )
  if (!dispute) return { error: 'Disputa no encontrada.' }
  const isParty = dispute.complainant_id === userId || dispute.respondent_id === userId
  if (!isParty) return { error: 'No autorizado.' }
  if (dispute.status !== 'open') return { error: 'La disputa ya está cerrada.' }

  await queryOne(
    `UPDATE reputation.disputes SET status = 'unresolved', resolved_at = now() WHERE id = $1`,
    [disputeId]
  )
  revalidatePath(`/disputes/${disputeId}`)
  revalidatePath(`/users/${dispute.respondent_id}`)
  return { success: true }
}

export async function withdrawDispute(complainantId: string, disputeId: string) {
  const dispute = await queryOne<{ complainant_id: string; status: string; respondent_id: string }>(
    `SELECT complainant_id, status, respondent_id FROM reputation.disputes WHERE id = $1`, [disputeId]
  )
  if (!dispute) return { error: 'Disputa no encontrada.' }
  if (dispute.complainant_id !== complainantId) return { error: 'Solo el denunciante puede retirar.' }
  if (dispute.status !== 'open') return { error: 'La disputa ya está cerrada.' }

  await queryOne(
    `UPDATE reputation.disputes SET status = 'withdrawn', resolved_at = now() WHERE id = $1`,
    [disputeId]
  )
  revalidatePath(`/disputes/${disputeId}`)
  revalidatePath(`/users/${dispute.respondent_id}`)
  return { success: true }
}
