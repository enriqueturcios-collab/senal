import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireEntrepreneurAccess, checkUsageLimit } from '@/lib/entitlements/feature-gate'
import { hasFeature } from '@/lib/entitlements/entrepreneur-plans'
import { query, queryOne } from '@/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ent = await requireEntrepreneurAccess(session.user.id)
  if (!hasFeature(ent.plan, 'inventory_manager')) {
    return NextResponse.json({ error: 'Plan no incluye gestión de inventario' }, { status: 403 })
  }

  const { allowed, used, limit } = await checkUsageLimit(session.user.id, ent.plan, 'inventory_items')
  if (!allowed) {
    return NextResponse.json({ error: `Límite de items alcanzado (${used}/${limit})` }, { status: 403 })
  }

  const body = await req.json()
  const { title, description, category_id, price, currency, stock_quantity, condition, tags } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Título requerido' }, { status: 400 })

  const profile = await queryOne<{ id: string }>(
    `SELECT id FROM entrepreneur.profiles WHERE user_id = $1`,
    [session.user.id]
  )
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const item = await queryOne<{ id: string }>(`
    INSERT INTO entrepreneur.inventory_items
      (user_id, profile_id, title, description, category_id, price, currency, stock_quantity, condition, tags_json)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
    RETURNING id
  `, [
    session.user.id,
    profile.id,
    title.trim(),
    description?.trim() ?? null,
    category_id ?? null,
    price ?? null,
    currency ?? 'GTQ',
    stock_quantity ?? 0,
    condition ?? 'new',
    JSON.stringify(tags ?? []),
  ])

  return NextResponse.json({ id: item!.id })
}
