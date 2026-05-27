import { NextRequest, NextResponse } from 'next/server'
import { loginInstitutional, COOKIE } from '@/lib/institutional-auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña requeridos.' }, { status: 400 })
  }

  const result = await loginInstitutional(email, password)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true, user: result.user })
  res.cookies.set(COOKIE, result.token, {
    httpOnly: true,
    sameSite: 'lax',
    path:     '/',
    maxAge:   8 * 3600,
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(COOKIE)
  return res
}
