import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ensureEntrepreneurProfile } from '@/lib/entitlements/feature-gate'
import { query, queryOne } from '@/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Auto-create free profile if user doesn't have one — no plan required
  const ent = await ensureEntrepreneurProfile(session.user.id, session.user.name ?? session.user.email)

  const profile = await queryOne<{ id: string }>(
    `SELECT id FROM entrepreneur.profiles WHERE user_id = $1`,
    [session.user.id]
  )
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const body = await req.json()
  const { title, description, category_id, price, max_price, currency, condition, tags, municipality_ids, expires_days, images } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Título requerido' }, { status: 400 })

  const expires_at = expires_days
    ? new Date(Date.now() + expires_days * 86400_000).toISOString()
    : null

  const offer = await queryOne<{ id: string }>(`
    INSERT INTO entrepreneur.proactive_offers
      (user_id, profile_id, title, description, category_id,
       price, max_price, currency, condition, tags_json, images_json, municipality_ids, expires_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13)
    RETURNING id
  `, [
    session.user.id, profile.id,
    title.trim(),
    description?.trim() || null,
    category_id || null,
    price || null, max_price || null,
    currency || 'GTQ',
    condition || 'service',
    JSON.stringify(tags || []),
    JSON.stringify(images || []),
    JSON.stringify(municipality_ids || []),
    expires_at,
  ])

  return NextResponse.json({ id: offer!.id })
}
