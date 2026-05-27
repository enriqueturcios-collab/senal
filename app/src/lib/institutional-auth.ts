import { createHmac, randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { queryOne } from '@/db'

const SECRET = process.env.NEXTAUTH_SECRET ?? 'dev-secret-app-change-in-prod'
const COOKIE  = 'inst-session'
const TTL_H   = 8

interface InstitutionalToken {
  uid:  string  // b2b.institution_users.id
  iid:  string  // b2b.institutions.id
  role: string
  name: string
  exp:  number
}

function sign(payload: InstitutionalToken): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig  = createHmac('sha256', SECRET).update(data).digest('base64url')
  return `${data}.${sig}`
}

function verify(token: string): InstitutionalToken | null {
  try {
    const [data, sig] = token.split('.')
    if (!data || !sig) return null
    const expected = createHmac('sha256', SECRET).update(data).digest('base64url')
    if (sig !== expected) return null
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as InstitutionalToken
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export async function loginInstitutional(email: string, password: string) {
  const bcrypt = await import('bcryptjs')
  const user = await queryOne<{
    id: string; institution_id: string; name: string; role: string
    password_hash: string; is_active: boolean
    inst_name: string; inst_status: string; plan_tier: string
  }>(`
    SELECT iu.id, iu.institution_id, iu.name, iu.role,
           iu.password_hash, iu.is_active,
           i.name AS inst_name, i.status AS inst_status,
           p.tier AS plan_tier
    FROM b2b.institution_users iu
    JOIN b2b.institutions i ON i.id = iu.institution_id
    JOIN b2b.plans p        ON p.id = i.plan_id
    WHERE iu.email = $1
  `, [email.toLowerCase()])

  if (!user || !user.is_active)              return { error: 'Credenciales incorrectas.' }
  if (user.inst_status !== 'active')         return { error: 'La institución no está activa.' }
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok)                                   return { error: 'Credenciales incorrectas.' }

  const token = sign({
    uid:  user.id,
    iid:  user.institution_id,
    role: user.role,
    name: user.name,
    exp:  Date.now() + TTL_H * 3600 * 1000,
  })

  queryOne('UPDATE b2b.institution_users SET last_login_at = now() WHERE id = $1', [user.id]).catch(() => {})

  return {
    token,
    user: {
      id:          user.id,
      name:        user.name,
      role:        user.role,
      instName:    user.inst_name,
      instId:      user.institution_id,
      planTier:    user.plan_tier,
    },
  }
}

// Server-component helper — reads cookie and returns the session
export async function getInstitutionalSession(): Promise<InstitutionalToken | null> {
  const jar = cookies()
  const raw = jar.get(COOKIE)?.value
  if (!raw) return null
  return verify(raw)
}

// Middleware / route helper — reads from NextRequest
export function getInstitutionalSessionFromRequest(req: NextRequest): InstitutionalToken | null {
  const raw = req.cookies.get(COOKIE)?.value
  if (!raw) return null
  return verify(raw)
}

export { COOKIE }
