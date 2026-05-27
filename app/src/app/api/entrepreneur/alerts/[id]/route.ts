import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireEntrepreneurAccess } from '@/lib/entitlements/feature-gate'
import { hasFeature } from '@/lib/entitlements/entrepreneur-plans'
import { query } from '@/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ent = await requireEntrepreneurAccess(session.user.id)
  if (!hasFeature(ent.plan, 'demand_alerts')) {
    return NextResponse.json({ error: 'Plan no incluye alertas' }, { status: 403 })
  }

  const { is_active } = await req.json()

  await query(
    `UPDATE entrepreneur.alert_rules SET is_active = $1, updated_at = now()
     WHERE id = $2 AND user_id = $3`,
    [is_active, params.id, session.user.id]
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await requireEntrepreneurAccess(session.user.id)

  await query(
    `DELETE FROM entrepreneur.alert_rules WHERE id = $1 AND user_id = $2`,
    [params.id, session.user.id]
  )

  return NextResponse.json({ ok: true })
}
