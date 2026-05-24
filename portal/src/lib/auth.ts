import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { queryOne } from '@/db'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8 horas

  providers: [
    CredentialsProvider({
      name: 'Credenciales institucionales',
      credentials: {
        email:    { label: 'Correo',     type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await queryOne<{
          id: string
          institution_id: string
          institution_name: string
          email: string
          name: string
          role: string
          password_hash: string
          plan_tier: string
          allowed_api_scopes: string[]
          historical_months_access: number
          institution_status: string
          is_active: boolean
        }>(`
          SELECT
            iu.id,
            iu.institution_id,
            i.name       AS institution_name,
            iu.email,
            iu.name,
            iu.role,
            iu.password_hash,
            iu.is_active,
            p.tier       AS plan_tier,
            p.allowed_api_scopes,
            p.historical_months_access,
            i.status     AS institution_status
          FROM b2b.institution_users iu
          JOIN b2b.institutions i ON i.id = iu.institution_id
          JOIN b2b.plans p        ON p.id = i.plan_id
          WHERE iu.email = $1
            AND iu.is_active = true
            AND i.status = 'active'
        `, [credentials.email.toLowerCase()])

        if (!user || !user.password_hash) return null

        const valid = await bcrypt.compare(credentials.password, user.password_hash)
        if (!valid) return null

        // Actualizar last_login_at (fire-and-forget)
        import('@/db').then(({ query }) =>
          query('UPDATE b2b.institution_users SET last_login_at = now() WHERE id = $1', [user.id])
        ).catch(() => {})

        return {
          id:                      user.id,
          email:                   user.email,
          name:                    user.name,
          institutionId:           user.institution_id,
          institutionName:         user.institution_name,
          role:                    user.role,
          plan:                    user.plan_tier,
          allowedScopes:           user.allowed_api_scopes,
          historicalMonthsAccess:  user.historical_months_access,
        }
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.institutionId          = (user as any).institutionId
        token.institutionName        = (user as any).institutionName
        token.role                   = (user as any).role
        token.plan                   = (user as any).plan
        token.allowedScopes          = (user as any).allowedScopes
        token.historicalMonthsAccess = (user as any).historicalMonthsAccess
      }
      return token
    },
    session({ session, token }) {
      session.user.institutionId          = token.institutionId as string
      session.user.institutionName        = token.institutionName as string
      session.user.role                   = token.role as string
      session.user.plan                   = token.plan as string
      session.user.allowedScopes          = token.allowedScopes as string[]
      session.user.historicalMonthsAccess = token.historicalMonthsAccess as number
      return session
    },
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },
}

// Extensión de tipos
declare module 'next-auth' {
  interface User {
    institutionId: string
    institutionName: string
    role: string
    plan: string
    allowedScopes: string[]
    historicalMonthsAccess: number
  }
  interface Session {
    user: User & {
      institutionId: string
      institutionName: string
      role: string
      plan: string
      allowedScopes: string[]
      historicalMonthsAccess: number
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    institutionId: string
    institutionName: string
    role: string
    plan: string
    allowedScopes: string[]
    historicalMonthsAccess: number
  }
}
