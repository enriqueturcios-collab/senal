import { query, queryOne } from '@/db'

// ─── Feed público ────────────────────────────────────────────────────────────

export async function getFeedDemands(opts: {
  categoryId?: number
  zoneId?: number
  search?: string
  page?: number
}) {
  const conditions = [`d.status = 'open'`]
  const params: unknown[] = []
  let p = 1

  if (opts.categoryId) {
    conditions.push(`(d.category_id = $${p} OR d.subcategory_id = $${p})`)
    params.push(opts.categoryId); p++
  }
  if (opts.zoneId) {
    conditions.push(`d.zone_id = $${p}`)
    params.push(opts.zoneId); p++
  }
  if (opts.search) {
    conditions.push(`(d.title ILIKE $${p} OR d.description ILIKE $${p})`)
    params.push(`%${opts.search}%`); p++
  }

  const limit  = 20
  const offset = ((opts.page ?? 1) - 1) * limit
  const where  = `WHERE ${conditions.join(' AND ')}`

  const [rows, countRow] = await Promise.all([
    query<{
      id: string; title: string; description: string
      category: string; category_id: number
      budget_min: number | null; budget_max: number | null; currency: string
      zone: string | null; municipality: string | null
      urgency: string; offer_count: number
      buyer_name: string; is_anonymous: boolean
      created_at: string
    }>(`
      SELECT
        d.id, d.title, d.description,
        dc.name     AS category, d.category_id,
        d.budget_min, d.budget_max, d.currency,
        az.name AS zone, am.name AS municipality,
        d.urgency, d.offer_count,
        CASE WHEN d.is_anonymous THEN 'Anónimo' ELSE u.display_name END AS buyer_name,
        d.is_anonymous,
        d.created_at::text
      FROM app.demands d
      JOIN app.users u              ON u.id = d.user_id
      JOIN app.categories dc        ON dc.id = d.category_id
      LEFT JOIN app.zones az        ON az.id = d.zone_id
      LEFT JOIN app.municipalities am ON am.id = az.municipality_id
      ${where}
      ORDER BY
        CASE d.urgency WHEN 'immediate' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        d.created_at DESC
      LIMIT $${p} OFFSET $${p+1}
    `, [...params, limit, offset]),

    queryOne<{ total: string }>(`
      SELECT COUNT(*) AS total FROM app.demands d ${where}
    `, params),
  ])

  return { rows, total: parseInt(countRow?.total ?? '0', 10) }
}

// ─── Detalle de una demanda ───────────────────────────────────────────────────

export async function getDemandDetail(id: string, viewerUserId?: string) {
  const [demand, offers, myOffer] = await Promise.all([
    queryOne<{
      id: string; title: string; description: string
      category: string; category_path: string; category_id: number
      budget_min: number | null; budget_max: number | null; currency: string
      zone: string | null; municipality: string | null; department: string | null
      urgency: string; status: string; offer_count: number; view_count: number
      buyer_id: string; buyer_name: string; buyer_rating: number | null
      is_anonymous: boolean; created_at: string; expires_at: string | null
      tags: string[]
    }>(`
      SELECT
        d.id, d.title, d.description,
        dc.name     AS category,
        dc.full_path AS category_path,
        d.category_id,
        d.budget_min, d.budget_max, d.currency,
        az.name       AS zone,
        am.name       AS municipality,
        dep.name      AS department,
        d.urgency, d.status, d.offer_count, d.view_count,
        d.user_id     AS buyer_id,
        CASE WHEN d.is_anonymous THEN 'Anónimo' ELSE u.display_name END AS buyer_name,
        sp.avg_rating  AS buyer_rating,
        d.is_anonymous,
        d.created_at::text,
        d.expires_at::text,
        COALESCE(ARRAY(
          SELECT tag FROM app.demand_tags WHERE demand_id = d.id
        ), '{}') AS tags
      FROM app.demands d
      JOIN app.users u                 ON u.id = d.user_id
      JOIN app.categories dc           ON dc.id = d.category_id
      LEFT JOIN app.zones az           ON az.id = d.zone_id
      LEFT JOIN app.municipalities am  ON am.id = az.municipality_id
      LEFT JOIN app.departments dep    ON dep.id = am.department_id
      LEFT JOIN app.seller_profiles sp ON sp.user_id = d.user_id
      WHERE d.id = $1
    `, [id]),

    // Ofertas recibidas (solo visible para el dueño de la demanda)
    viewerUserId ? query<{
      id: string; seller_id: string; seller_name: string
      seller_rating: number | null; seller_verified: boolean | null
      price: number; currency: string; description: string | null
      estimated_days: number | null; status: string; created_at: string
    }>(`
      SELECT
        o.id, o.seller_id,
        u.display_name  AS seller_name,
        sp.avg_rating   AS seller_rating,
        sp.verified     AS seller_verified,
        o.price, o.currency, o.description, o.estimated_days,
        o.status, o.created_at::text
      FROM app.offers o
      JOIN app.users u              ON u.id = o.seller_id
      LEFT JOIN app.seller_profiles sp ON sp.user_id = o.seller_id
      WHERE o.demand_id = $1
      ORDER BY o.created_at ASC
    `, [id]) : Promise.resolve([]),

    // ¿El viewer ya hizo oferta?
    viewerUserId ? queryOne<{ id: string; status: string; price: number }>(`
      SELECT id, status, price FROM app.offers
      WHERE demand_id = $1 AND seller_id = $2
    `, [id, viewerUserId]) : Promise.resolve(null),
  ])

  // Incrementar view_count (fire-and-forget)
  query('UPDATE app.demands SET view_count = view_count + 1 WHERE id = $1', [id]).catch(() => {})

  return { demand, offers, myOffer }
}

// ─── Demandas del usuario ─────────────────────────────────────────────────────

export async function getMyDemands(userId: string) {
  return query<{
    id: string; title: string; category: string
    status: string; urgency: string
    offer_count: number; view_count: number
    budget_min: number | null; budget_max: number | null; currency: string
    created_at: string
  }>(`
    SELECT
      d.id, d.title, dc.name AS category,
      d.status, d.urgency, d.offer_count, d.view_count,
      d.budget_min, d.budget_max, d.currency,
      d.created_at::text
    FROM app.demands d
    JOIN app.categories dc ON dc.id = d.category_id
    WHERE d.user_id = $1
    ORDER BY d.created_at DESC
    LIMIT 50
  `, [userId])
}

// ─── Ofertas del usuario ──────────────────────────────────────────────────────

export async function getMyOffers(userId: string) {
  return query<{
    offer_id: string; demand_id: string; demand_title: string
    buyer_name: string; category: string
    price: number; currency: string
    status: string; demand_status: string
    created_at: string
  }>(`
    SELECT
      o.id   AS offer_id,
      d.id   AS demand_id,
      d.title AS demand_title,
      CASE WHEN d.is_anonymous THEN 'Anónimo' ELSE u.display_name END AS buyer_name,
      dc.name AS category,
      o.price, o.currency,
      o.status, d.status AS demand_status,
      o.created_at::text
    FROM app.offers o
    JOIN app.demands d   ON d.id = o.demand_id
    JOIN app.users u     ON u.id = d.user_id
    JOIN app.categories dc ON dc.id = d.category_id
    WHERE o.seller_id = $1
    ORDER BY o.created_at DESC
    LIMIT 50
  `, [userId])
}

// ─── Datos de referencia ──────────────────────────────────────────────────────

export async function getCategories() {
  return query<{ id: number; parent_id: number | null; name: string; level: number }>(`
    SELECT id, parent_id, name,
           CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END AS level
    FROM app.categories
    WHERE is_active = true
    ORDER BY CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END, name
  `)
}

export async function getZones() {
  return query<{ id: number; name: string; municipality: string; department: string }>(`
    SELECT z.id, z.name, m.name AS municipality, d.name AS department
    FROM app.zones z
    JOIN app.municipalities m ON m.id = z.municipality_id
    JOIN app.departments d    ON d.id = m.department_id
    WHERE z.is_active = true
    ORDER BY d.name, m.name, z.name
  `)
}

// ─── Perfil de vendedor ───────────────────────────────────────────────────────

export async function getSellerProfile(userId: string) {
  return queryOne<{
    id: string; display_name: string; bio: string | null
    role: string; verified: boolean | null
    avg_rating: number | null; total_ratings: number; total_transactions: number
    response_rate: number | null; avg_response_time_hours: number | null
    member_since: string; last_active: string | null
  }>(`
    SELECT
      u.id, u.display_name, u.bio, u.role,
      sp.verified, sp.avg_rating, sp.total_ratings, sp.total_transactions,
      sp.response_rate, sp.avg_response_time_hours,
      u.created_at::text  AS member_since,
      u.last_active_at::text AS last_active
    FROM app.users u
    LEFT JOIN app.seller_profiles sp ON sp.user_id = u.id
    WHERE u.id = $1 AND u.status = 'active'
  `, [userId])
}
