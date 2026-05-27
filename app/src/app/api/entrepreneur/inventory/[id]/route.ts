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
  if (!hasFeature(ent.plan, 'inventory_manager')) {
    return NextResponse.json({ error: 'Plan no incluye gestión de inventario' }, { status: 403 })
  }

  const body = await req.json()
  const { is_active, title, description, price, currency, stock_quantity, condition, tags } = body

  const setClauses: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (is_active !== undefined) { setClauses.push(`is_active = $${idx++}`); values.push(is_active) }
  if (title !== undefined)     { setClauses.push(`title = $${idx++}`);     values.push(title) }
  if (description !== undefined){ setClauses.push(`description = $${idx++}`); values.push(description) }
  if (price !== undefined)     { setClauses.push(`price = $${idx++}`);     values.push(price) }
  if (currency !== undefined)  { setClauses.push(`currency = $${idx++}`);  values.push(currency) }
  if (stock_quantity !== undefined){ setClauses.push(`stock_quantity = $${idx++}`); values.push(stock_quantity) }
  if (condition !== undefined) { setClauses.push(`condition = $${idx++}`); values.push(condition) }
  if (tags !== undefined)      { setClauses.push(`tags_json = $${idx++}::jsonb`); values.push(JSON.stringify(tags)) }

  if (setClauses.length === 0) return NextResponse.json({ ok: true })

  setClauses.push(`updated_at = now()`)
  values.push(params.id, session.user.id)

  await query(
    `UPDATE entrepreneur.inventory_items SET ${setClauses.join(', ')}
     WHERE id = $${idx++} AND user_id = $${idx}`,
    values
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ent = await requireEntrepreneurAccess(session.user.id)
  if (!hasFeature(ent.plan, 'inventory_manager')) {
    return NextResponse.json({ error: 'Plan no incluye gestión de inventario' }, { status: 403 })
  }

  await query(
    `DELETE FROM entrepreneur.inventory_items WHERE id = $1 AND user_id = $2`,
    [params.id, session.user.id]
  )

  return NextResponse.json({ ok: true })
}
