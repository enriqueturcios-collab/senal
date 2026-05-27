import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/db'
import { verifyWebhookSignature } from '@/lib/dlocal'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('x-signature') ?? ''

  if (process.env.DLOCAL_SECRET_KEY && sig) {
    if (!verifyWebhookSignature(body, sig)) {
      return new NextResponse('Invalid signature', { status: 400 })
    }
  }

  let payload: { id?: string; status?: string; order_id?: string }
  try { payload = JSON.parse(body) }
  catch { return new NextResponse('Bad JSON', { status: 400 }) }

  // dLocal sends status PAID when the payment clears
  if (payload.status === 'PAID' && payload.id) {
    await query(
      `UPDATE payments.fees SET status = 'paid', paid_at = now()
       WHERE stripe_session_id = $1`,
      [payload.id],
    )
  }

  return new NextResponse('ok', { status: 200 })
}
