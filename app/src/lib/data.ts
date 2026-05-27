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
      created_at: string; image_urls: string[]
    }>(`
      SELECT
        d.id, d.title, d.description,
        dc.name     AS category, d.category_id,
        d.budget_min, d.budget_max, d.currency,
        az.name AS zone, am.name AS municipality,
        d.urgency, d.offer_count,
        CASE WHEN d.is_anonymous THEN 'Anónimo' ELSE u.display_name END AS buyer_name,
        d.is_anonymous,
        d.created_at::text,
        COALESCE(d.image_urls, '{}') AS image_urls
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
        dc.name     AS category_path,
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
      buyer_confirmed_at: string | null; seller_confirmed_at: string | null
      trade_completed_at: string | null; trade_id: string | null
      already_vouched: boolean; fee_status: string | null
    }>(`
      SELECT
        o.id, o.seller_id,
        u.display_name  AS seller_name,
        sp.avg_rating   AS seller_rating,
        sp.verified     AS seller_verified,
        o.price, o.currency, o.description, o.estimated_days,
        o.status, o.created_at::text,
        vt.buyer_confirmed_at::text,
        vt.seller_confirmed_at::text,
        vt.completed_at::text AS trade_completed_at,
        vt.id AS trade_id,
        EXISTS(
          SELECT 1 FROM reputation.vouches v
          WHERE v.trade_id = vt.id AND v.voucher_id = $2
        ) AS already_vouched,
        pf.status AS fee_status
      FROM app.offers o
      JOIN app.users u              ON u.id = o.seller_id
      LEFT JOIN app.seller_profiles sp ON sp.user_id = o.seller_id
      LEFT JOIN reputation.verified_trades vt ON vt.offer_id = o.id
      LEFT JOIN payments.fees pf ON pf.trade_id = vt.id AND pf.payer_id = $2
      WHERE o.demand_id = $1
      ORDER BY o.created_at ASC
    `, [id, viewerUserId]) : Promise.resolve([]),

    // ¿El viewer ya hizo oferta? (include trade state for seller)
    viewerUserId ? queryOne<{
      id: string; status: string; price: number; currency: string
      buyer_confirmed_at: string | null; seller_confirmed_at: string | null
      trade_completed_at: string | null; trade_id: string | null
      buyer_id: string | null; buyer_display_name: string | null
      already_vouched: boolean; fee_status: string | null
    }>(`
      SELECT o.id, o.status, o.price, o.currency,
             vt.buyer_confirmed_at::text,
             vt.seller_confirmed_at::text,
             vt.completed_at::text AS trade_completed_at,
             vt.id AS trade_id,
             d.user_id AS buyer_id,
             CASE WHEN d.is_anonymous THEN NULL ELSE bu.display_name END AS buyer_display_name,
             EXISTS(
               SELECT 1 FROM reputation.vouches v
               WHERE v.trade_id = vt.id AND v.voucher_id = $2
             ) AS already_vouched,
             pf.status AS fee_status
      FROM app.offers o
      JOIN app.demands d ON d.id = o.demand_id
      JOIN app.users bu ON bu.id = d.user_id
      LEFT JOIN reputation.verified_trades vt ON vt.offer_id = o.id
      LEFT JOIN payments.fees pf ON pf.trade_id = vt.id AND pf.payer_id = $2
      WHERE o.demand_id = $1 AND o.seller_id = $2
    `, [id, viewerUserId]) : Promise.resolve(null),
  ])

  // Incrementar view_count (fire-and-forget)
  query('UPDATE app.demands SET view_count = view_count + 1 WHERE id = $1', [id]).catch(() => {})

  // Mark sent offers as viewed when the demand owner visits (clears notification badge)
  if (demand && viewerUserId === demand.buyer_id) {
    query(
      `UPDATE app.offers SET viewed_at = now()
       WHERE demand_id = $1 AND status = 'sent' AND viewed_at IS NULL`,
      [id]
    ).catch(() => {})
  }

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
    buyer_id: string; buyer_name: string; category: string
    price: number; currency: string
    status: string; demand_status: string
    created_at: string
    buyer_confirmed_at: string | null; seller_confirmed_at: string | null
    trade_completed_at: string | null; trade_id: string | null
    already_vouched: boolean; fee_status: string | null
  }>(`
    SELECT
      o.id   AS offer_id,
      d.id   AS demand_id,
      d.title AS demand_title,
      d.user_id AS buyer_id,
      CASE WHEN d.is_anonymous THEN 'Anónimo' ELSE u.display_name END AS buyer_name,
      dc.name AS category,
      o.price, o.currency,
      o.status, d.status AS demand_status,
      o.created_at::text,
      vt.buyer_confirmed_at::text,
      vt.seller_confirmed_at::text,
      vt.completed_at::text AS trade_completed_at,
      vt.id AS trade_id,
      EXISTS(
        SELECT 1 FROM reputation.vouches v
        WHERE v.trade_id = vt.id AND v.voucher_id = $1
      ) AS already_vouched,
      pf.status AS fee_status
    FROM app.offers o
    JOIN app.demands d   ON d.id = o.demand_id
    JOIN app.users u     ON u.id = d.user_id
    JOIN app.categories dc ON dc.id = d.category_id
    LEFT JOIN reputation.verified_trades vt ON vt.offer_id = o.id
    LEFT JOIN payments.fees pf ON pf.trade_id = vt.id AND pf.payer_id = $1
    WHERE o.seller_id = $1
    ORDER BY o.created_at DESC
    LIMIT 50
  `, [userId])
}

// ─── Home: stats + trending ───────────────────────────────────────────────────

export async function getHomeStats() {
  return queryOne<{ total: number; today: number; urgent: number }>(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours')::int AS today,
      COUNT(*) FILTER (WHERE urgency IN ('high','immediate'))::int AS urgent
    FROM app.demands
    WHERE status = 'open'
  `)
}

export async function getMostUrgentDemand() {
  return queryOne<{
    id: string; title: string; category: string
    budget_min: number | null; budget_max: number | null; currency: string
    urgency: string; offer_count: number; zone: string | null
    municipality: string | null; created_at: string
  }>(`
    SELECT
      d.id, d.title,
      dc.name AS category,
      d.budget_min, d.budget_max, d.currency,
      d.urgency, d.offer_count,
      az.name AS zone,
      am.name AS municipality,
      d.created_at::text
    FROM app.demands d
    JOIN app.categories dc ON dc.id = d.category_id
    LEFT JOIN app.zones az ON az.id = d.zone_id
    LEFT JOIN app.municipalities am ON am.id = az.municipality_id
    WHERE d.status = 'open'
      AND d.urgency IN ('immediate', 'high')
    ORDER BY
      CASE d.urgency WHEN 'immediate' THEN 0 ELSE 1 END,
      d.offer_count ASC,
      d.created_at DESC
    LIMIT 1
  `)
}

export async function getTrendingDemands(limit = 8) {
  return query<{
    id: string; title: string; category: string
    budget_min: number | null; budget_max: number | null; currency: string
    urgency: string; offer_count: number; view_count: number; created_at: string
    image_urls: string[]
  }>(`
    SELECT
      d.id, d.title,
      dc.name AS category,
      d.budget_min, d.budget_max, d.currency,
      d.urgency, d.offer_count, d.view_count,
      d.created_at::text,
      COALESCE(d.image_urls, '{}') AS image_urls
    FROM app.demands d
    JOIN app.categories dc ON dc.id = d.category_id
    WHERE d.status = 'open'
    ORDER BY (d.offer_count * 4 + d.view_count) DESC, d.created_at DESC
    LIMIT $1
  `, [limit])
}

export async function getRecentOffers(limit = 8) {
  return query<{
    id: string; demand_id: string; demand_title: string; category: string
    seller_name: string; price: number; currency: string
    description: string | null; estimated_days: number | null
    status: string; created_at: string; image_urls: string[]
  }>(`
    SELECT
      o.id, o.demand_id,
      d.title        AS demand_title,
      dc.name        AS category,
      u.display_name AS seller_name,
      o.price, o.currency,
      o.description, o.estimated_days,
      o.status, o.created_at::text,
      COALESCE(o.image_urls, '{}') AS image_urls
    FROM app.offers o
    JOIN app.demands d  ON d.id = o.demand_id
    JOIN app.categories dc ON dc.id = d.category_id
    JOIN app.users u   ON u.id = o.seller_id
    WHERE o.status = 'sent'
    ORDER BY o.created_at DESC
    LIMIT $1
  `, [limit])
}

// ─── Búsqueda con fallback inteligente ───────────────────────────────────────

type SearchRow = {
  id: string; title: string; description: string
  category: string; category_id: number
  budget_min: number | null; budget_max: number | null; currency: string
  zone: string | null; municipality: string | null
  urgency: string; offer_count: number
  buyer_name: string; is_anonymous: boolean; created_at: string
  image_urls: string[]
}

const DEMAND_SELECT = `
  SELECT
    d.id, d.title, d.description,
    dc.name AS category, d.category_id,
    d.budget_min, d.budget_max, d.currency,
    az.name AS zone, am.name AS municipality,
    d.urgency, d.offer_count,
    CASE WHEN d.is_anonymous THEN 'Anónimo' ELSE u.display_name END AS buyer_name,
    d.is_anonymous, d.created_at::text,
    COALESCE(d.image_urls, '{}') AS image_urls
  FROM app.demands d
  JOIN app.users u             ON u.id = d.user_id
  JOIN app.categories dc       ON dc.id = d.category_id
  LEFT JOIN app.zones az       ON az.id = d.zone_id
  LEFT JOIN app.municipalities am ON am.id = az.municipality_id
`

export async function searchExplore(opts: {
  q?: string
  categoryId?: number
  limit?: number
}): Promise<{ results: SearchRow[]; alternatives: SearchRow[]; isAlternative: boolean }> {
  const q       = (opts.q ?? '').trim()
  const limit   = opts.limit ?? 20
  const catFilter = opts.categoryId
    ? `AND (d.category_id = ${Number(opts.categoryId)} OR d.subcategory_id = ${Number(opts.categoryId)})`
    : ''

  // No query → return trending
  if (!q) {
    const results = await query<SearchRow>(`
      ${DEMAND_SELECT}
      WHERE d.status = 'open' ${catFilter}
      ORDER BY (d.offer_count * 4 + d.view_count) DESC, d.created_at DESC
      LIMIT $1
    `, [limit])
    return { results, alternatives: [], isAlternative: false }
  }

  // Primary: full-phrase match in title, description, or tags
  const primary = await query<SearchRow>(`
    ${DEMAND_SELECT}
    WHERE d.status = 'open' ${catFilter}
    AND (
      d.title       ILIKE $1
      OR d.description ILIKE $1
      OR EXISTS (
        SELECT 1 FROM app.demand_tags dt
        WHERE dt.demand_id = d.id AND dt.tag ILIKE $2
      )
    )
    ORDER BY
      CASE WHEN d.title ILIKE $1 THEN 0 ELSE 1 END,
      d.offer_count DESC, d.created_at DESC
    LIMIT $3
  `, [`%${q}%`, q, limit])

  if (primary.length > 0) {
    return { results: primary, alternatives: [], isAlternative: false }
  }

  // Fallback: split into significant words and search any
  const words = q.split(/\s+/).filter(w => w.length >= 3).slice(0, 5)
  if (words.length === 0) {
    return { results: [], alternatives: [], isAlternative: true }
  }

  const conditions = words.map((_, i) =>
    `(d.title ILIKE $${i + 1} OR d.description ILIKE $${i + 1})`
  ).join(' OR ')
  const wordParams = words.map(w => `%${w}%`)

  const alternatives = await query<SearchRow>(`
    ${DEMAND_SELECT}
    WHERE d.status = 'open' ${catFilter}
    AND (${conditions})
    ORDER BY d.offer_count DESC, d.created_at DESC
    LIMIT $${words.length + 1}
  `, [...wordParams, Math.min(limit, 10)])

  return { results: [], alternatives, isAlternative: true }
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

// ─── Proactive offers (marketplace feed) ─────────────────────────────────────

export async function getLatestProactiveOffers(limit = 6) {
  return query<{
    id: string; title: string; description: string | null
    category: string | null; price: number | null; max_price: number | null
    currency: string; condition: string; tags_json: string
    business_name: string | null; created_at: string
  }>(`
    SELECT o.id, o.title, LEFT(o.description, 100) AS description,
           c.name AS category, o.price, o.max_price, o.currency,
           o.condition, o.tags_json::text,
           COALESCE(p.business_name, u.display_name) AS business_name,
           o.created_at::text
    FROM entrepreneur.proactive_offers o
    JOIN entrepreneur.profiles p ON p.id = o.profile_id
    JOIN app.users u ON u.id = o.user_id
    LEFT JOIN app.categories c ON c.id = o.category_id
    WHERE o.is_active = true
      AND (o.expires_at IS NULL OR o.expires_at > now())
    ORDER BY o.created_at DESC
    LIMIT $1
  `, [limit])
}

// ─── Reputación de un usuario ────────────────────────────────────────────────

export async function getUserReputation(userId: string, viewerUserId?: string) {
  const [stats, vouches, disputesAsRespondent] = await Promise.all([
    queryOne<{
      trade_count: number; vouch_count: number
      disputes_open: number; disputes_resolved: number
      disputes_unresolved: number; disputes_withdrawn: number
    }>(`
      SELECT
        (SELECT COUNT(*)::int FROM reputation.verified_trades
         WHERE completed_at IS NOT NULL
           AND (buyer_id = $1 OR seller_id = $1)) AS trade_count,
        (SELECT COUNT(*)::int FROM reputation.vouches
         WHERE vouchee_id = $1) AS vouch_count,
        (SELECT COUNT(*)::int FROM reputation.disputes
         WHERE respondent_id = $1 AND status = 'open')       AS disputes_open,
        (SELECT COUNT(*)::int FROM reputation.disputes
         WHERE respondent_id = $1 AND status = 'resolved')   AS disputes_resolved,
        (SELECT COUNT(*)::int FROM reputation.disputes
         WHERE respondent_id = $1 AND status = 'unresolved') AS disputes_unresolved,
        (SELECT COUNT(*)::int FROM reputation.disputes
         WHERE respondent_id = $1 AND status = 'withdrawn')  AS disputes_withdrawn
    `, [userId]),

    query<{ voucher_id: string; voucher_name: string; created_at: string }>(`
      SELECT v.voucher_id, u.display_name AS voucher_name, v.created_at::text
      FROM reputation.vouches v
      JOIN app.users u ON u.id = v.voucher_id
      WHERE v.vouchee_id = $1
      ORDER BY v.created_at DESC
    `, [userId]),

    query<{
      id: string; complainant_name: string; description: string
      status: string; opened_at: string; resolved_at: string | null
      respondent_reply: string | null; resolution_note: string | null
    }>(`
      SELECT d.id,
             u.display_name AS complainant_name,
             d.description, d.status,
             d.opened_at::text, d.resolved_at::text,
             d.respondent_reply, d.resolution_note
      FROM reputation.disputes d
      JOIN app.users u ON u.id = d.complainant_id
      WHERE d.respondent_id = $1
        AND d.status != 'withdrawn'
      ORDER BY d.opened_at DESC
    `, [userId]),
  ])

  let canVouch: { tradeId: string } | null = null
  let canDispute: { offerId: string; offerTitle: string } | null = null

  if (viewerUserId && viewerUserId !== userId) {
    const [trade, disputeOffer] = await Promise.all([
      queryOne<{ id: string }>(`
        SELECT id FROM reputation.verified_trades
        WHERE completed_at IS NOT NULL
          AND ((buyer_id = $1 AND seller_id = $2) OR (seller_id = $1 AND buyer_id = $2))
        ORDER BY completed_at DESC LIMIT 1
      `, [viewerUserId, userId]),

      // Most recent accepted offer between viewer and userId that hasn't been disputed by viewer
      queryOne<{ id: string; title: string }>(`
        SELECT o.id,
               COALESCE(d.title, 'Oferta') AS title
        FROM app.offers o
        JOIN app.demands d ON d.id = o.demand_id
        WHERE o.status IN ('accepted','completed')
          AND (
            (o.seller_id = $1 AND d.user_id = $2) OR
            (o.seller_id = $2 AND d.user_id = $1)
          )
          AND NOT EXISTS (
            SELECT 1 FROM reputation.disputes dp
            WHERE dp.complainant_id = $1 AND dp.offer_id = o.id
          )
        ORDER BY o.created_at DESC LIMIT 1
      `, [viewerUserId, userId]),
    ])

    if (trade) {
      const alreadyVouched = await queryOne(
        `SELECT 1 FROM reputation.vouches WHERE voucher_id = $1 AND vouchee_id = $2`,
        [viewerUserId, userId]
      )
      if (!alreadyVouched) canVouch = { tradeId: trade.id }
    }

    if (disputeOffer) {
      canDispute = { offerId: disputeOffer.id, offerTitle: disputeOffer.title }
    }
  }

  return {
    trade_count:         stats?.trade_count         ?? 0,
    vouch_count:         stats?.vouch_count         ?? 0,
    disputes_open:       stats?.disputes_open       ?? 0,
    disputes_resolved:   stats?.disputes_resolved   ?? 0,
    disputes_unresolved: stats?.disputes_unresolved ?? 0,
    vouches,
    disputes: disputesAsRespondent,
    canVouch,
    canDispute,
  }
}

export async function getDisputeDetail(disputeId: string) {
  return queryOne<{
    id: string; status: string; description: string
    respondent_reply: string | null; resolution_note: string | null
    opened_at: string; resolved_at: string | null
    complainant_id: string; complainant_name: string
    respondent_id: string;  respondent_name: string
    offer_id: string; offer_title: string
  }>(`
    SELECT d.id, d.status::text, d.description,
           d.respondent_reply, d.resolution_note,
           d.opened_at::text, d.resolved_at::text,
           d.complainant_id, cu.display_name AS complainant_name,
           d.respondent_id,  ru.display_name AS respondent_name,
           d.offer_id, dem.title AS offer_title
    FROM reputation.disputes d
    JOIN app.users cu ON cu.id = d.complainant_id
    JOIN app.users ru ON ru.id = d.respondent_id
    JOIN app.offers o ON o.id = d.offer_id
    JOIN app.demands dem ON dem.id = o.demand_id
    WHERE d.id = $1
  `, [disputeId])
}

// ─── Notificaciones pendientes ────────────────────────────────────────────────

export async function getNewOfferNotifications(buyerId: string) {
  return query<{
    offer_id: string; demand_id: string; demand_title: string
    seller_name: string; price: number; currency: string; created_at: string
  }>(`
    SELECT o.id AS offer_id, d.id AS demand_id, d.title AS demand_title,
           u.display_name AS seller_name, o.price, o.currency, o.created_at::text
    FROM app.offers o
    JOIN app.demands d ON d.id = o.demand_id
    JOIN app.users u  ON u.id = o.seller_id
    WHERE d.user_id = $1
      AND o.status = 'sent'
      AND o.viewed_at IS NULL
    ORDER BY o.created_at DESC
    LIMIT 10
  `, [buyerId])
}

export async function getPendingTradeNotifications(sellerId: string) {
  return query<{
    offer_id: string; demand_id: string; demand_title: string
    price: number; currency: string; updated_at: string
    buyer_confirmed_at: string | null
  }>(`
    SELECT o.id AS offer_id, d.id AS demand_id, d.title AS demand_title,
           o.price, o.currency, o.updated_at::text,
           vt.buyer_confirmed_at::text
    FROM app.offers o
    JOIN app.demands d ON d.id = o.demand_id
    LEFT JOIN reputation.verified_trades vt ON vt.offer_id = o.id
    WHERE o.seller_id = $1
      AND o.status = 'accepted'
      AND (vt.id IS NULL OR vt.seller_confirmed_at IS NULL)
    ORDER BY o.updated_at DESC
    LIMIT 10
  `, [sellerId])
}
