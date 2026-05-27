'use server'

import { query, queryOne } from '@/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function submitPlanProof(
  toPlan: string,
  fromPlan: string,
  amountCents: number,
  proofUrl: string,
) {
  const session = await getServerSession(authOptions)
  if (!session) return { error: 'No autorizado' }

  // Cancel any previous pending request for this user upgrading to same plan
  await query(`
    DELETE FROM payments.plan_requests
    WHERE user_id = $1 AND to_plan = $2 AND status IN ('pending','review')
  `, [session.user.id, toPlan])

  await query(`
    INSERT INTO payments.plan_requests
      (user_id, from_plan, to_plan, amount_cents, currency, proof_url, submitted_at, status)
    VALUES ($1, $2, $3, $4, 'gtq', $5, now(), 'review')
  `, [session.user.id, fromPlan, toPlan, amountCents, proofUrl])

  revalidatePath('/entrepreneur/subscription')
  return { ok: true }
}

export async function getPendingPlanRequests() {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'admin') return []

  return query<{
    id: string; user_id: string; user_name: string; user_email: string
    from_plan: string; to_plan: string; amount_cents: number; currency: string
    proof_url: string; submitted_at: string; review_note: string | null
  }>(`
    SELECT pr.id, pr.user_id,
           u.display_name AS user_name, u.email AS user_email,
           pr.from_plan, pr.to_plan,
           pr.amount_cents, pr.currency,
           pr.proof_url, pr.submitted_at::text,
           pr.review_note
    FROM payments.plan_requests pr
    JOIN app.users u ON u.id = pr.user_id
    WHERE pr.status = 'review'
    ORDER BY pr.submitted_at ASC
  `)
}

export async function approvePlanRequest(requestId: string) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'admin') return { error: 'No autorizado' }

  const req = await queryOne<{ user_id: string; to_plan: string }>(`
    SELECT user_id, to_plan FROM payments.plan_requests WHERE id = $1
  `, [requestId])
  if (!req) return { error: 'Solicitud no encontrada' }

  // Activate the new plan
  await query(`
    INSERT INTO entrepreneur.subscriptions (user_id, plan, status, current_period_start, current_period_end)
    VALUES ($1, $2, 'active', now(), now() + interval '30 days')
    ON CONFLICT (user_id)
    DO UPDATE SET plan = EXCLUDED.plan,
                  status = 'active',
                  current_period_start = now(),
                  current_period_end = now() + interval '30 days',
                  cancel_at_period_end = false,
                  updated_at = now()
  `, [req.user_id, req.to_plan])

  await query(`
    UPDATE payments.plan_requests
    SET status = 'approved', reviewed_by = $2
    WHERE id = $1
  `, [requestId, session.user.id])

  revalidatePath('/admin/payments')
  return { ok: true }
}

export async function rejectPlanRequest(requestId: string, note: string) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'admin') return { error: 'No autorizado' }

  await query(`
    UPDATE payments.plan_requests
    SET status = 'rejected', reviewed_by = $2, review_note = $3
    WHERE id = $1
  `, [requestId, session.user.id, note])

  revalidatePath('/admin/payments')
  return { ok: true }
}

export async function getMyPlanRequest(userId: string, toPlan: string) {
  return queryOne<{ status: string; review_note: string | null }>(`
    SELECT status, review_note
    FROM payments.plan_requests
    WHERE user_id = $1 AND to_plan = $2
    ORDER BY created_at DESC
    LIMIT 1
  `, [userId, toPlan])
}
