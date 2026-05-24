export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/demand/new',
    '/my-demands/:path*',
    '/my-offers/:path*',
    '/messages/:path*',
    '/profile/:path*',
  ],
}
