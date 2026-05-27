'use server'

import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { query, queryOne } from '@/db'

const RegisterSchema = z.object({
  email:                  z.string().email(),
  password:               z.string().min(8),
  display_name:           z.string().min(2).max(60),
  role:                   z.enum(['buyer', 'seller', 'both']),
  consent_analytics:      z.boolean(),
  consent_b2b_aggregate:  z.boolean(),
})

export async function registerUser(formData: FormData) {
  const raw = {
    email:                 formData.get('email'),
    password:              formData.get('password'),
    display_name:          formData.get('display_name'),
    role:                  formData.get('role'),
    consent_analytics:     formData.get('consent_analytics') === 'true',
    consent_b2b_aggregate: formData.get('consent_b2b_aggregate') === 'true',
  }

  const parsed = RegisterSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: 'Datos inválidos. Revisa los campos.' }
  }

  const { email, password, display_name, role,
          consent_analytics, consent_b2b_aggregate } = parsed.data

  const existing = await queryOne(
    'SELECT id FROM app.users WHERE email = $1',
    [email.toLowerCase()]
  )
  if (existing) return { error: 'Ya existe una cuenta con ese email.' }

  const password_hash = await bcrypt.hash(password, 12)

  const consentAnalytics    = consent_analytics    ? 'granted' : 'denied'
  const consentB2bAggregate = consent_b2b_aggregate ? 'granted' : 'denied'

  const user = await queryOne<{ id: string }>(`
    INSERT INTO app.users
      (email, password_hash, display_name, role,
       consent_analytics, consent_b2b_aggregate, consent_individual)
    VALUES ($1,$2,$3,$4,$5,$6,'denied')
    RETURNING id
  `, [email.toLowerCase(), password_hash, display_name, role,
      consentAnalytics, consentB2bAggregate])

  if (!user) return { error: 'Error al crear la cuenta.' }

  // Audit log for consents
  const consents = [
    ['consent_analytics',    consentAnalytics],
    ['consent_b2b_aggregate', consentB2bAggregate],
    ['consent_individual',   'denied'],
  ]
  await query(`
    INSERT INTO app.user_consent_log (user_id, consent_type, new_status)
    SELECT $1, unnest($2::text[]), unnest($3::app.consent_status[])
  `, [user.id, consents.map(c => c[0]), consents.map(c => c[1])])

  // Auto-create seller profile if applicable
  if (role === 'seller' || role === 'both') {
    await queryOne(
      'INSERT INTO app.seller_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [user.id]
    )
  }

  return { success: true, userId: user.id }
}

const ProfileSchema = z.object({
  display_name:  z.string().min(2).max(60).optional(),
  bio:           z.string().max(500).optional(),
  default_zone_id: z.coerce.number().int().positive().optional().nullable(),
})

export async function updateProfile(userId: string, formData: FormData) {
  const parsed = ProfileSchema.safeParse({
    display_name:    formData.get('display_name') || undefined,
    bio:             formData.get('bio')           || undefined,
    default_zone_id: formData.get('default_zone_id') || undefined,
  })
  if (!parsed.success) return { error: 'Datos inválidos.' }

  const fields: string[] = []
  const params: unknown[] = []
  let p = 1

  if (parsed.data.display_name) { fields.push(`display_name = $${p++}`); params.push(parsed.data.display_name) }
  if (parsed.data.bio !== undefined) { fields.push(`bio = $${p++}`); params.push(parsed.data.bio) }
  if (parsed.data.default_zone_id !== undefined) { fields.push(`default_zone_id = $${p++}`); params.push(parsed.data.default_zone_id) }

  if (!fields.length) return { error: 'Nada que actualizar.' }

  params.push(userId)
  await queryOne(`UPDATE app.users SET ${fields.join(', ')} WHERE id = $${p}`, params)

  revalidatePath('/profile')
  return { success: true }
}

export async function updateConsent(
  userId: string,
  consentType: 'consent_analytics' | 'consent_b2b_aggregate',
  value: 'granted' | 'denied'
) {
  const allowed = ['consent_analytics', 'consent_b2b_aggregate']
  if (!allowed.includes(consentType)) return { error: 'Tipo de consentimiento inválido.' }

  await queryOne(
    `UPDATE app.users SET ${consentType} = $1 WHERE id = $2`,
    [value, userId]
  )

  await queryOne(`
    INSERT INTO app.user_consent_log (user_id, consent_type, new_status)
    VALUES ($1, $2, $3)
  `, [userId, consentType, value])

  revalidatePath('/profile')
  return { success: true }
}
