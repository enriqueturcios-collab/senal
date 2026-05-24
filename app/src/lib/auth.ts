import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { queryOne } from '@/db'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 días

  providers: [
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email:    { label: 'Email',      type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null

        const user = await queryOne<{
          id: string; email: string; display_name: string
          password_hash: string; role: string; status: string
          default_zone_id: number | null
          consent_analytics: string; consent_b2b_aggregate: string
        }>(`
          SELECT id, email, display_name, password_hash, role, status,
                 default_zone_id, consent_analytics, consent_b2b_aggregate
          FROM app.users
          WHERE email = $1 AND status = 'active' AND deleted_at IS NULL
        `, [creds.email.toLowerCase()])

        if (!user) return null

        const ok = await bcrypt.compare(creds.password, user.password_hash)
        if (!ok) return null

        queryOne('UPDATE app.users SET last_active_at = now() WHERE id = $1', [user.id]).catch(() => {})

        return {
          id:              user.id,
          email:           user.email,
          name:            user.display_name,
          role:            user.role,
          defaultZoneId:   user.default_zone_id,
        }
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role          = (user as any).role
        token.defaultZoneId = (user as any).defaultZoneId
      }
      return token
    },
    session({ session, token }) {
      session.user.id           = token.sub!
      session.user.role         = token.role as string
      session.user.defaultZoneId = token.defaultZoneId as number | null
      return session
    },
  },

  pages: { signIn: '/login', error: '/login' },
}

declare module 'next-auth' {
  interface User { role: string; defaultZoneId: number | null }
  interface Session {
    user: { id: string; email: string; name: string; role: string; defaultZoneId: number | null }
  }
}
declare module 'next-auth/jwt' {
  interface JWT { role: string; defaultZoneId: number | null }
}
