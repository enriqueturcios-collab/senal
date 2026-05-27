import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // ── Institutional routes ──────────────────────────────────────────────────
  if (path.startsWith('/institutional')) {
    // Login page is public
    if (path.startsWith('/institutional/login')) return NextResponse.next()

    // Everything else needs the inst-session cookie
    const hasCookie = !!req.cookies.get('inst-session')?.value
    if (!hasCookie) {
      const url = req.nextUrl.clone()
      url.pathname = '/institutional/login'
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // ── App routes — require NextAuth JWT ────────────────────────────────────
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('callbackUrl', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/demand/new',
    '/my-demands/:path*',
    '/my-offers/:path*',
    '/messages/:path*',
    '/profile/:path*',
    '/institutional/:path*',
    '/entrepreneur/dashboard/:path*',
    '/entrepreneur/opportunities/:path*',
    '/entrepreneur/inventory/:path*',
    '/entrepreneur/alerts/:path*',
    '/entrepreneur/matches/:path*',
    '/entrepreneur/fulfillment/:path*',
    '/entrepreneur/analytics/:path*',
    '/entrepreneur/market-pulse/:path*',
    '/entrepreneur/subscription/:path*',
    '/entrepreneur/settings/:path*',
    '/entrepreneur/billing/:path*',
  ],
}
