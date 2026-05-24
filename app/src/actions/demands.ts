'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { query, queryOne } from '@/db'

const DemandSchema = z.object({
  title:          z.string().min(5).max(120),
  description:    z.string().min(20).max(2000),
  category_id:    z.coerce.number().int().positive(),
  subcategory_id: z.coerce.number().int().positive().optional().nullable(),
  zone_id:        z.coerce.number().int().positive().optional().nullable(),
  budget_min:     z.coerce.number().positive().optional().nullable(),
  budget_max:     z.coerce.number().positive().optional().nullable(),
  currency:       z.enum(['GTQ', 'USD']).default('GTQ'),
  urgency:        z.enum(['low', 'medium', 'high', 'immediate']),
  is_anonymous:   z.boolean().default(false),
  tags:           z.array(z.string().max(30)).max(5).default([]),
})

export async function createDemand(userId: string, formData: FormData) {
  const tagsRaw = formData.get('tags')
  const tags = tagsRaw
    ? String(tagsRaw).split(',').map(t => t.trim()).filter(Boolean)
    : []

  const parsed = DemandSchema.safeParse({
    title:          formData.get('title'),
    description:    formData.get('description'),
    category_id:    formData.get('category_id'),
    subcategory_id: formData.get('subcategory_id') || null,
    zone_id:        formData.get('zone_id')         || null,
    budget_min:     formData.get('budget_min')      || null,
    budget_max:     formData.get('budget_max')      || null,
    currency:       formData.get('currency')        || 'GTQ',
    urgency:        formData.get('urgency'),
    is_anonymous:   formData.get('is_anonymous') === 'true',
    tags,
  })

  if (!parsed.success) {
    return { error: 'Datos inválidos. Revisa los campos requeridos.' }
  }

  const d = parsed.data

  if (d.budget_min && d.budget_max && d.budget_min > d.budget_max) {
    return { error: 'El presupuesto mínimo no puede ser mayor al máximo.' }
  }

  const demand = await queryOne<{ id: string }>(`
    INSERT INTO app.demands
      (user_id, title, description,
       category_id, subcategory_id, zone_id,
       budget_min, budget_max, currency,
       urgency, is_anonymous)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING id
  `, [
    userId, d.title, d.description,
    d.category_id, d.subcategory_id ?? null, d.zone_id ?? null,
    d.budget_min ?? null, d.budget_max ?? null, d.currency,
    d.urgency, d.is_anonymous,
  ])

  if (!demand) return { error: 'Error al publicar la demanda.' }

  if (d.tags.length) {
    await query(`
      INSERT INTO app.demand_tags (demand_id, tag)
      SELECT $1, unnest($2::text[])
    `, [demand.id, d.tags])
  }

  revalidatePath('/')
  revalidatePath('/my-demands')

  redirect(`/demand/${demand.id}`)
}

export async function cancelDemand(userId: string, demandId: string) {
  const demand = await queryOne<{ user_id: string; status: string }>(
    'SELECT user_id, status FROM app.demands WHERE id = $1',
    [demandId]
  )

  if (!demand) return { error: 'Demanda no encontrada.' }
  if (demand.user_id !== userId) return { error: 'No autorizado.' }
  if (!['open', 'in_progress'].includes(demand.status)) {
    return { error: 'Esta demanda no puede cancelarse.' }
  }

  await queryOne(
    "UPDATE app.demands SET status = 'cancelled' WHERE id = $1",
    [demandId]
  )

  revalidatePath('/my-demands')
  revalidatePath(`/demand/${demandId}`)
  return { success: true }
}
