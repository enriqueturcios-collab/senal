import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query, queryOne } from '@/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    business_name,
    business_type,
    category_ids,
    municipality_ids,
    description,
  } = body

  await query(`
    UPDATE entrepreneur.profiles SET
      business_name        = COALESCE($2, business_name),
      business_type        = COALESCE($3, business_type),
      primary_category_ids = CASE WHEN $4::int[] IS NOT NULL THEN $4::int[] ELSE primary_category_ids END,
      description          = COALESCE($5, description),
      service_zones_json   = CASE WHEN $6::jsonb IS NOT NULL THEN $6::jsonb ELSE service_zones_json END,
      updated_at           = now()
    WHERE user_id = $1
  `, [
    session.user.id,
    business_name?.trim() || null,
    business_type || null,
    category_ids?.length ? category_ids : null,
    description?.trim() || null,
    municipality_ids?.length ? JSON.stringify(municipality_ids) : null,
  ])

  return NextResponse.json({ ok: true })
}
