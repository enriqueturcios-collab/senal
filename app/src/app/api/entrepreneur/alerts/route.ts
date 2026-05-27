import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireEntrepreneurAccess } from '@/lib/entitlements/feature-gate'
import { hasFeature, PLAN_DEFINITIONS } from '@/lib/entitlements/entrepreneur-plans'
import { query, queryOne } from '@/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ent = await requireEntrepreneurAccess(session.user.id)
  if (!hasFeature(ent.plan, 'alert_rules')) {
    return NextResponse.json({ error: 'Plan no incluye reglas de alerta personalizadas' }, { status: 403 })
  }

  const ruleLimit = PLAN_DEFINITIONS[ent.plan].limits.alert_rules
  if (ruleLimit > 0) {
    const count = await queryOne<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM entrepreneur.alert_rules WHERE user_id = $1`,
      [session.user.id]
    )
    if ((count?.n ?? 0) >= ruleLimit) {
      return NextResponse.json({ error: `Límite de reglas alcanzado (${ruleLimit})` }, { status: 403 })
    }
  }

  const body = await req.json()
  const { name, keywords, category_ids, urgency_filter, budget_min } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const profile = await queryOne<{ id: string }>(
    `SELECT id FROM entrepreneur.profiles WHERE user_id = $1`,
    [session.user.id]
  )
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const rule = await queryOne<{ id: string }>(`
    INSERT INTO entrepreneur.alert_rules
      (user_id, profile_id, name, keywords, category_ids, urgency_levels, min_budget)
    VALUES ($1, $2, $3, $4::text[], $5::int[], $6::text[], $7)
    RETURNING id
  `, [
    session.user.id,
    profile.id,
    name.trim(),
    keywords ?? [],
    category_ids ?? [],
    urgency_filter ?? [],
    budget_min ?? null,
  ])

  return NextResponse.json({ id: rule!.id })
}
