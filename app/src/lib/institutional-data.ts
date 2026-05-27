import { query, queryOne } from '@/db'

// ─── Overview / KPIs ─────────────────────────────────────────────────────────

export async function getInstitutionalOverview() {
  const [kpis, topCats, topZones] = await Promise.all([
    queryOne<{
      total_demands: number; active_demands: number; closed_demands: number
      total_offers: number; total_transactions: number
      overall_response_rate: number | null; overall_close_rate: number | null
      avg_budget: number | null; median_budget: number | null
      unmet_demands: number
    }>(`
      SELECT
        COUNT(*)::int                                                                AS total_demands,
        COUNT(*) FILTER (WHERE status = 'open')::int                                AS active_demands,
        COUNT(*) FILTER (WHERE status = 'closed')::int                              AS closed_demands,
        (SELECT COUNT(*)::int FROM app.offers)                                      AS total_offers,
        (SELECT COUNT(*)::int FROM app.transactions WHERE status = 'completed')     AS total_transactions,
        AVG(CASE WHEN offer_count > 0 THEN 1.0 ELSE 0.0 END)                       AS overall_response_rate,
        (SELECT AVG(CASE WHEN t.status = 'completed' THEN 1.0 ELSE 0.0 END)
         FROM app.offers o LEFT JOIN app.transactions t ON t.offer_id = o.id)      AS overall_close_rate,
        AVG(budget_max)                                                             AS avg_budget,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY budget_max)
          FILTER (WHERE budget_max IS NOT NULL)                                     AS median_budget,
        COUNT(*) FILTER (WHERE offer_count = 0 AND status = 'open')::int           AS unmet_demands
      FROM app.demands
      WHERE status NOT IN ('draft','cancelled')
    `),

    query<{ category: string; count: number; growth_pct: number | null }>(`
      SELECT dc.name AS category,
             COUNT(*)::int AS count,
             NULL::numeric AS growth_pct
      FROM app.demands d
      JOIN app.categories dc ON dc.id = d.category_id
      WHERE d.status NOT IN ('draft','cancelled')
      GROUP BY dc.name
      ORDER BY count DESC
      LIMIT 6
    `),

    query<{ zone: string; municipality: string; count: number; unmet: number }>(`
      SELECT az.name AS zone, am.name AS municipality,
             COUNT(*)::int AS count,
             COUNT(*) FILTER (WHERE d.offer_count = 0)::int AS unmet
      FROM app.demands d
      JOIN app.zones az ON az.id = d.zone_id
      JOIN app.municipalities am ON am.id = az.municipality_id
      WHERE d.status NOT IN ('draft','cancelled') AND d.zone_id IS NOT NULL
      GROUP BY az.name, am.name
      ORDER BY count DESC
      LIMIT 8
    `),
  ])

  return { kpis, topCats, topZones }
}

// ─── Market indices from analytics schema ────────────────────────────────────

export async function getMarketIndices(opts: {
  categoryId?: number
  zoneId?: number
  periodType?: string
} = {}) {
  const conditions = [`mi.data_confidence IN ('medium','high')`]
  const params: unknown[] = []
  let p = 1

  if (opts.categoryId) { conditions.push(`mi.category_id = $${p}`); params.push(opts.categoryId); p++ }
  if (opts.zoneId)     { conditions.push(`mi.zone_id = $${p}`);     params.push(opts.zoneId);     p++ }

  const pt = opts.periodType ?? 'month'
  conditions.push(`mi.period_type = $${p}`)
  params.push(pt); p++

  return query<{
    category: string; category_id: number
    zone: string; zone_id: number
    demand_activity_index: number | null
    unmet_demand_index: number | null
    market_opportunity_score: number | null
    category_growth_score: number | null
    price_acceptance_p50: number | null
    price_acceptance_p10: number | null
    price_acceptance_p90: number | null
    offer_response_rate: number | null
    transaction_confirmation_rate: number | null
    data_confidence: string
    sample_size: number | null
    period_value: string
  }>(`
    SELECT
      dc.name AS category, mi.category_id,
      dz.zone_name AS zone, mi.zone_id,
      mi.demand_activity_index,
      mi.unmet_demand_index,
      mi.market_opportunity_score,
      mi.category_growth_score,
      mi.price_acceptance_p50,
      mi.price_acceptance_p10,
      mi.price_acceptance_p90,
      mi.offer_response_rate,
      mi.transaction_confirmation_rate,
      mi.data_confidence,
      mi.sample_size,
      mi.period_value
    FROM analytics.market_indices mi
    JOIN analytics.dim_categories dc ON dc.id = mi.category_id
    JOIN analytics.dim_zones dz      ON dz.id = mi.zone_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY mi.market_opportunity_score DESC NULLS LAST
    LIMIT 50
  `, params)
}

// ─── Demand aggregates ────────────────────────────────────────────────────────

export async function getDemandAggregates(opts: {
  categoryId?: number
  zoneId?: number
  minSample?: number
} = {}) {
  const conditions: string[] = []
  const params: unknown[] = []
  let p = 1

  if (opts.categoryId) { conditions.push(`agg.category_id = $${p}`); params.push(opts.categoryId); p++ }
  if (opts.zoneId)     { conditions.push(`agg.zone_id = $${p}`);     params.push(opts.zoneId);     p++ }
  const minS = opts.minSample ?? 1
  conditions.push(`agg.demand_count >= $${p}`)
  params.push(minS); p++

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  return query<{
    category: string; zone: string; municipality: string
    demand_count: number | null
    budget_p25: number | null; budget_p50: number | null; budget_p75: number | null
    transaction_rate: number | null; unmet_demand_rate: number | null
    avg_offers_per_demand: number | null
    period_value: string
  }>(`
    SELECT
      dc.name AS category,
      dz.zone_name AS zone,
      dz.municipality,
      agg.demand_count,
      agg.budget_p25, agg.budget_p50, agg.budget_p75,
      agg.transaction_rate, agg.unmet_demand_rate,
      agg.avg_offers_per_demand,
      agg.period_value
    FROM analytics.agg_demand_by_zone_category agg
    JOIN analytics.dim_categories dc ON dc.id = agg.category_id
    JOIN analytics.dim_zones dz      ON dz.id = agg.zone_id
    ${where}
    ORDER BY agg.demand_count DESC NULLS LAST
    LIMIT 40
  `, params)
}

// ─── Credit use case: map query → categories → signals ───────────────────────

const CATEGORY_KEYWORDS: Record<string, number[]> = {
  // helados, postres, dulces
  'helad': [905, 9, 904, 906, 908],
  'postre': [905, 904, 9, 906, 908],
  'dulce': [904, 905, 908, 9],
  'catering': [906, 902, 209, 9],
  'bebida': [907, 9],
  'cafetería': [9, 906, 902],
  'panadería': [904, 9],
  'repostería': [904, 9, 906],
  // libros
  'libro': [103, 1],
  'papelería': [103, 1],
  // tecnología
  'laptop': [703, 102, 7],
  'computadora': [703, 102, 7],
  'celular': [702, 7],
  'teléfono': [702, 7],
  'reparación celular': [702, 7],
  // carpintería / muebles
  'carpintería': [201, 207, 2],
  'mueble': [104, 201, 207, 2],
  'madera': [201, 207, 105, 2],
  'puerta': [201, 207, 2],
  // servicios del hogar
  'reparación': [201, 2],
  'hogar': [201, 104, 2],
  'limpieza': [202, 2],
  // motos / repuestos
  'moto': [5],
  'repuesto': [105, 5, 1],
  // alimentos
  'aliment': [9],
  'comida': [9, 901, 902],
  'delivery': [901, 9],
}

function mapQueryToCategories(q: string): number[] {
  const lower = q.toLowerCase()
  const found = new Set<number>()
  for (const [kw, cats] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lower.includes(kw)) {
      cats.forEach(c => found.add(c))
    }
  }
  // Fallback: always include Alimentación (9) for food keywords
  if (found.size === 0) found.add(9)
  return Array.from(found).slice(0, 6)
}

export async function getCreditUseCaseAnalysis(query_str: string, zoneId?: number) {
  const categoryIds = mapQueryToCategories(query_str)

  const conditions = [`d.category_id = ANY($1) AND d.status NOT IN ('draft','cancelled')`]
  const params: unknown[] = [categoryIds]
  let p = 2

  if (zoneId) { conditions.push(`d.zone_id = $${p}`); params.push(zoneId); p++ }

  const [demands, offers, transactions, categories, zoneBreakdown] = await Promise.all([
    queryOne<{
      total: number; active: number; unmet: number
      avg_budget: number | null; median_budget: number | null
      budget_p10: number | null; budget_p90: number | null
      avg_urgency: number | null
    }>(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'open')::int AS active,
        COUNT(*) FILTER (WHERE offer_count = 0 AND status = 'open')::int AS unmet,
        AVG(budget_max) AS avg_budget,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY budget_max) FILTER (WHERE budget_max IS NOT NULL) AS median_budget,
        PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY budget_max) FILTER (WHERE budget_max IS NOT NULL) AS budget_p10,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY budget_max) FILTER (WHERE budget_max IS NOT NULL) AS budget_p90,
        AVG(CASE urgency WHEN 'immediate' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END) AS avg_urgency
      FROM app.demands d
      WHERE ${conditions.join(' AND ')}
    `, params),

    queryOne<{ total: number; avg_price: number | null; median_price: number | null; price_p10: number | null; price_p90: number | null }>(`
      SELECT
        COUNT(*)::int AS total,
        AVG(o.price) AS avg_price,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY o.price) AS median_price,
        PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY o.price) AS price_p10,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY o.price) AS price_p90
      FROM app.offers o
      JOIN app.demands d ON d.id = o.demand_id
      WHERE d.category_id = ANY($1) AND o.status != 'withdrawn'
    `, [categoryIds]),

    queryOne<{ total: number; avg_amount: number | null; close_rate: number | null }>(`
      SELECT
        COUNT(*)::int AS total,
        AVG(t.amount) AS avg_amount,
        (COUNT(*)::float / NULLIF((SELECT COUNT(*) FROM app.demands WHERE category_id = ANY($1) AND status NOT IN ('draft','cancelled')), 0)) AS close_rate
      FROM app.transactions t
      JOIN app.demands d ON d.id = t.demand_id
      WHERE d.category_id = ANY($1) AND t.status = 'completed'
    `, [categoryIds]),

    query<{ id: number; name: string; count: number }>(`
      SELECT dc.id, dc.name, COUNT(*)::int AS count
      FROM app.demands d
      JOIN app.categories dc ON dc.id = d.category_id
      WHERE d.category_id = ANY($1) AND d.status NOT IN ('draft','cancelled')
      GROUP BY dc.id, dc.name ORDER BY count DESC LIMIT 5
    `, [categoryIds]),

    query<{ zone: string; municipality: string; count: number; unmet: number }>(`
      SELECT az.name AS zone, am.name AS municipality,
             COUNT(*)::int AS count,
             COUNT(*) FILTER (WHERE d.offer_count = 0 AND d.status = 'open')::int AS unmet
      FROM app.demands d
      JOIN app.zones az ON az.id = d.zone_id
      JOIN app.municipalities am ON am.id = az.municipality_id
      WHERE d.category_id = ANY($1) AND d.status NOT IN ('draft','cancelled')
      GROUP BY az.name, am.name
      ORDER BY count DESC LIMIT 8
    `, [categoryIds]),
  ])

  const total     = demands?.total ?? 0
  const active    = demands?.active ?? 0
  const unmet     = demands?.unmet ?? 0
  const unmetRate = total > 0 ? (unmet / total) : 0
  const closeRate = transactions?.close_rate ?? 0

  // Market Opportunity Score: unmet demand (40%) + total signals (30%) + close rate signal (30%)
  const mos = Math.min(
    (unmetRate * 40) +
    (Math.min(total / 5, 30)) +
    (closeRate > 0.3 ? 30 : closeRate > 0.1 ? 15 : 0),
    100
  )

  const confidence = total >= 20 ? 'high' : total >= 5 ? 'medium' : 'low'

  // Narrative
  const queryCapit = query_str.charAt(0).toUpperCase() + query_str.slice(1)
  const topZone    = zoneBreakdown[0]
  const priceRange = offers?.price_p10 && offers?.price_p90
    ? `Q${Math.round(offers.price_p10).toLocaleString()} y Q${Math.round(offers.price_p90).toLocaleString()}`
    : 'No disponible'

  const narrative = [
    `En los últimos 30 días se observaron ${total} señales de demanda relacionadas con "${query_str}" y categorías relacionadas.`,
    topZone ? `La zona con mayor actividad fue ${topZone.zone}, ${topZone.municipality} (${topZone.count} señales).` : '',
    offers?.price_p10
      ? `El rango de precios observado se concentra entre ${priceRange}.`
      : 'No hay suficientes señales de precio aún.',
    unmetRate > 0.3
      ? `La demanda insatisfecha es alta: ${Math.round(unmetRate * 100)}% de las demandas no recibieron ofertas.`
      : `La tasa de demanda insatisfecha es ${Math.round(unmetRate * 100)}%.`,
    `Esto no constituye una recomendación de crédito, pero puede servir como evidencia de mercado para complementar el análisis del banco.`,
  ].filter(Boolean).join(' ')

  return {
    query:           query_str,
    categoryIds,
    categories,
    demands:         demands!,
    offers:          offers!,
    transactions:    transactions!,
    zoneBreakdown,
    marketOpportunityScore: Math.round(mos),
    unmetRate,
    closeRate,
    confidence,
    narrative,
    priceRange: {
      p10: offers?.price_p10,
      p50: offers?.median_price,
      p90: offers?.price_p90,
    },
    sampleSize: total,
  }
}

// ─── Market price oracle ──────────────────────────────────────────────────────

export async function getMarketPrice(opts: {
  categoryId?: number
  keywords?: string
  zoneId?: number
}) {
  const conditions = [`o.status NOT IN ('withdrawn')`]
  const params: unknown[] = []
  let p = 1

  if (opts.categoryId) {
    conditions.push(`d.category_id = $${p}`)
    params.push(opts.categoryId); p++
  }
  if (opts.keywords) {
    conditions.push(`(d.title ILIKE $${p} OR d.description ILIKE $${p})`)
    params.push(`%${opts.keywords}%`); p++
  }

  const result = await queryOne<{
    sample_size: number
    median_price: number | null; avg_price: number | null
    p10: number | null; p25: number | null; p75: number | null; p90: number | null
    min_price: number | null; max_price: number | null
  }>(`
    SELECT
      COUNT(*)::int AS sample_size,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY o.price) AS median_price,
      AVG(o.price)                                          AS avg_price,
      PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY o.price) AS p10,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY o.price) AS p25,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY o.price) AS p75,
      PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY o.price) AS p90,
      MIN(o.price) AS min_price, MAX(o.price) AS max_price
    FROM app.offers o
    JOIN app.demands d ON d.id = o.demand_id
    WHERE ${conditions.join(' AND ')}
  `, params)

  const n = result?.sample_size ?? 0
  const confidence = n >= 20 ? 'high' : n >= 5 ? 'medium' : 'low'

  return { ...result, confidence, sampleSize: n }
}

// ─── Access log ───────────────────────────────────────────────────────────────

export async function logInstitutionalAccess(opts: {
  institutionId: string
  userId: string
  endpoint: string
  method?: string
  responseRows?: number
  httpStatus?: number
}) {
  try {
    await queryOne(`
      INSERT INTO b2b.access_logs
        (institution_id, user_id, endpoint, http_method, response_rows, http_status, accessed_at)
      VALUES ($1, $2, $3, $4, $5, $6, now())
    `, [
      opts.institutionId, opts.userId, opts.endpoint,
      opts.method ?? 'GET', opts.responseRows ?? 0, opts.httpStatus ?? 200,
    ])
  } catch { /* non-critical */ }
}

// ─── Categories list for filter ──────────────────────────────────────────────

export async function getAnalyticsCategories() {
  return query<{ id: number; name: string; level: number; parent_id: number | null }>(`
    SELECT id, name,
           CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END AS level,
           parent_id
    FROM analytics.dim_categories
    ORDER BY level, name
  `)
}

export async function getAnalyticsZones() {
  return query<{ id: number; zone_name: string; municipality: string; department_name: string }>(`
    SELECT id, zone_name, municipality, department_name
    FROM analytics.dim_zones
    ORDER BY department_name, municipality, zone_name
    LIMIT 50
  `)
}

// ─── Access log table ─────────────────────────────────────────────────────────

export async function getAccessLogs(institutionId: string, limit = 20) {
  return query<{
    endpoint: string; http_method: string; http_status: number
    response_rows: number | null; accessed_at: string
    user_id: string | null
  }>(`
    SELECT endpoint, http_method, http_status, response_rows, accessed_at::text, user_id::text
    FROM b2b.access_logs
    WHERE institution_id = $1
    ORDER BY accessed_at DESC
    LIMIT $2
  `, [institutionId, limit])
}
