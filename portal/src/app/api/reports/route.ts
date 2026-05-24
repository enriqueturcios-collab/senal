import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/db'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { report_type, file_format = 'pdf' } = body

  if (!report_type) return NextResponse.json({ error: 'report_type required' }, { status: 400 })

  const title = `${report_type.replace(/_/g, ' ')} — ${new Date().toISOString().slice(0, 10)}`

  const rows = await query<{ id: string }>(`
    INSERT INTO b2b.reports (institution_id, report_type, title, file_format, status, expires_at)
    VALUES ($1, $2, $3, $4, 'queued', now() + INTERVAL '30 days')
    RETURNING id
  `, [session.user.institutionId, report_type, title, file_format])

  return NextResponse.json({ id: rows[0]?.id }, { status: 202 })
}
