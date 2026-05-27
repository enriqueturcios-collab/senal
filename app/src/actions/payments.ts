'use server'

import { query, queryOne } from '@/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { FEE_RATE, computeFeeCents } from '@/lib/payments'

// ── User: submit payment proof ────────────────────────────────────────────────

export async function submitProof(tradeId: string, role: 'buyer' | 'seller', proofUrl: string) {
  const session = await getServerSession(authOptions)
  if (!session) return { error: 'No autorizado' }

  // Upsert the fee record and attach proof
  await query(`
    INSERT INTO payments.fees (trade_id, payer_id, role, amount_cents, currency, proof_url, submitted_at, status)
    SELECT vt.id, $2, $3,
           GREATEST(ROUND((o.price * $4 * 100)::numeric, 0)::int, $5),
           o.currency,
           $6, now(), 'review'
    FROM reputation.verified_trades vt
    JOIN app.offers o ON o.id = vt.offer_id
    WHERE vt.id = $1
    ON CONFLICT (trade_id, payer_id)
    DO UPDATE SET proof_url    = EXCLUDED.proof_url,
                  submitted_at = now(),
                  status       = 'review'
  `, [tradeId, session.user.id, role, FEE_RATE, 200, proofUrl])

  revalidatePath('/my-offers')
  revalidatePath('/demand/[id]', 'page')
  return { ok: true }
}

// ── Admin: approve / reject ───────────────────────────────────────────────────

export async function approvePayment(feeId: string) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'admin') return { error: 'No autorizado' }

  await query(`
    UPDATE payments.fees
    SET status = 'paid', paid_at = now(), reviewed_by = $2
    WHERE id = $1
  `, [feeId, session.user.id])

  revalidatePath('/admin/payments')
  return { ok: true }
}

export async function rejectPayment(feeId: string, note: string) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'admin') return { error: 'No autorizado' }

  await query(`
    UPDATE payments.fees
    SET status = 'pending', proof_url = NULL, submitted_at = NULL,
        reviewed_by = $2, review_note = $3
    WHERE id = $1
  `, [feeId, session.user.id, note])

  revalidatePath('/admin/payments')
  return { ok: true }
}

// ── Admin: list pending reviews ───────────────────────────────────────────────

export async function getPendingFees() {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'admin') return []

  return query<{
    id: string
    payer_name: string; payer_email: string
    role: string; amount_cents: number; currency: string
    proof_url: string; submitted_at: string
    demand_title: string; demand_id: string
    review_note: string | null
  }>(`
    SELECT
      f.id, u.display_name AS payer_name, u.email AS payer_email,
      f.role, f.amount_cents, f.currency,
      f.proof_url, f.submitted_at::text,
      d.title AS demand_title, d.id AS demand_id,
      f.review_note
    FROM payments.fees f
    JOIN app.users u ON u.id = f.payer_id
    JOIN reputation.verified_trades vt ON vt.id = f.trade_id
    JOIN app.offers o ON o.id = vt.offer_id
    JOIN app.demands d ON d.id = o.demand_id
    WHERE f.status = 'review'
    ORDER BY f.submitted_at ASC
  `)
}
