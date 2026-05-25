/**
 * Funciones de acceso a datos para el portal.
 * Todas son Server-Side — nunca se ejecutan en el browser.
 * Consultan analytics.* y b2b.* directamente vía pool de PostgreSQL.
 */

import { query, queryOne } from '@/db'

// ---------------------------------------------------------------------------
// KPIs del dashboard principal
// ---------------------------------------------------------------------------

export async function getOverviewKpis(institutionId: string, periodValue: string) {
  return queryOne<{
    total_demand:        number
    demand_growth:       number | null
    transaction_rate:    number | null
    top_opportunity:     number | null
    unmet_demand_rate:   number | null
    active_categories:   number
    active_zones:        number
  }>(`
    WITH current AS (
      SELECT
        COALESCE(SUM(demand_count), 0)                             AS total_demand,
        AVG(transaction_rate)                                      AS transaction_rate,
        MAX(market_opportunity_score)                              AS top_opportunity,
        AVG(unmet_demand_rate)                                     AS unmet_demand_rate,
        COUNT(DISTINCT category_id)                                AS active_categories,
        COUNT(DISTINCT zone_id)                                    AS active_zones
      FROM analytics.agg_demand_by_zone_category
      WHERE period_type = 'month' AND period_value = $1
        AND demand_count_suppressed = false
    ),
    previous AS (
      SELECT COALESCE(SUM(demand_count), 0) AS total_demand
      FROM analytics.agg_demand_by_zone_category
      WHERE period_type = 'month'
        AND period_value = TO_CHAR(
          TO_DATE($1, 'YYYY-MM') - INTERVAL '1 month', 'YYYY-MM'
        )
        AND demand_count_suppressed = false
    )
    SELECT
      c.total_demand::int,
      CASE WHEN p.total_demand > 0 THEN
        ROUND(((c.total_demand - p.total_demand)::numeric / p.total_demand) * 100, 1)
      END AS demand_growth,
      ROUND(c.transaction_rate::numeric, 4) AS transaction_rate,
      ROUND(c.top_opportunity::numeric, 1)  AS top_opportunity,
      ROUND(c.unmet_demand_rate::numeric, 4) AS unmet_demand_rate,
      c.active_categories::int,
      c.active_zones::int
    FROM current c CROSS JOIN previous p
  `, [periodValue])
}

// ---------------------------------------------------------------------------
// Top oportunidades
// ---------------------------------------------------------------------------

export async function getTopOpportunities(opts: {
  periodValue: string
  department?: string
  categoryId?: number
  limit?: number
  historicalMonths: number
}) {
  const conditions = [
    `mi.data_confidence IN ('medium','high')`,
    `mi.period_type = 'month'`,
    `mi.period_value = $1`,
    `mi.period_start >= (CURRENT_DATE - ($2::int * INTERVAL '1 month'))`,
  ]
  const params: unknown[] = [opts.periodValue, opts.historicalMonths]
  let p = 3

  if (opts.department) {
    conditions.push(`dz.department_name ILIKE $${p}`)
    params.push(`%${opts.department}%`)
    p++
  }
  if (opts.categoryId) {
    conditions.push(`mi.category_id = $${p}`)
    params.push(opts.categoryId)
    p++
  }

  const limit = Math.min(opts.limit ?? 20, 50)

  return query<{
    zone_id: number; department: string; municipality: string; zone: string
    category_id: number; category: string; category_path: string
    period_value: string
    market_opportunity_score: number
    demand_activity_index: number | null
    unmet_demand_index: number | null
    category_growth_score: number | null
    price_acceptance_p50: number | null
    price_acceptance_p10: number | null
    price_acceptance_p90: number | null
    transaction_confirmation_rate: number | null
    offer_response_rate: number | null
    sample_size: number | null
    data_confidence: string
  }>(`
    SELECT
      mi.zone_id, dz.department_name AS department, dz.municipality, dz.zone_name AS zone,
      mi.category_id, dc.name AS category, dc.full_path AS category_path,
      mi.period_value,
      mi.market_opportunity_score,
      mi.demand_activity_index,
      mi.unmet_demand_index,
      mi.category_growth_score,
      mi.price_acceptance_p50,
      mi.price_acceptance_p10,
      mi.price_acceptance_p90,
      mi.transaction_confirmation_rate,
      mi.offer_response_rate,
      mi.sample_size,
      mi.data_confidence
    FROM analytics.market_indices mi
    JOIN analytics.dim_zones dz      ON dz.id = mi.zone_id
    JOIN analytics.dim_categories dc ON dc.id = mi.category_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY mi.market_opportunity_score DESC NULLS LAST
    LIMIT $${p}
  `, [...params, limit])
}

// ---------------------------------------------------------------------------
// Tendencia mensual para un set de categorías (gráfico de líneas)
// ---------------------------------------------------------------------------

export async function getDemandTrend(opts: {
  categoryIds?: number[]
  zoneId?: number
  months: number
}) {
  const months = Math.min(opts.months, 24)

  return query<{
    period_value: string
    period_start: string
    category: string
    demand_count: number | null
    transaction_count: number | null
    transaction_rate: number | null
    unmet_rate: number | null
    growth_pct: number | null
  }>(`
    SELECT
      dt.period_value,
      dt.period_start::text,
      dc.name AS category,
      dt.demand_count,
      dt.transaction_count,
      dt.transaction_rate,
      dt.unmet_demand_rate AS unmet_rate,
      dt.demand_pct_change AS growth_pct
    FROM analytics.demand_trends dt
    JOIN analytics.dim_categories dc ON dc.id = dt.category_id
    WHERE dt.period_type = 'month'
      AND dt.demand_count IS NOT NULL
      AND dt.period_start >= (CURRENT_DATE - ($1::int * INTERVAL '1 month'))
      ${opts.zoneId ? `AND dt.zone_id = ${opts.zoneId}` : 'AND dt.zone_id IS NULL'}
      ${opts.categoryIds?.length ? `AND dt.category_id = ANY($2::int[])` : ''}
    ORDER BY dt.period_start, dc.name
  `, opts.categoryIds?.length ? [months, opts.categoryIds] : [months])
}

// ---------------------------------------------------------------------------
// Distribución de demanda por categoría (gráfico de barras)
// ---------------------------------------------------------------------------

export async function getDemandByCategory(periodValue: string, topN = 10) {
  return query<{
    category: string
    category_id: number
    demand_count: number
    transaction_rate: number | null
    unmet_rate: number | null
  }>(`
    SELECT
      dc.name AS category,
      a.category_id,
      SUM(a.demand_count)::int                   AS demand_count,
      AVG(a.transaction_rate)                     AS transaction_rate,
      AVG(a.unmet_demand_rate)                    AS unmet_rate
    FROM analytics.agg_demand_by_zone_category a
    JOIN analytics.dim_categories dc ON dc.id = a.category_id
    WHERE a.period_type = 'month'
      AND a.period_value = $1
      AND a.demand_count_suppressed = false
      AND dc.parent_id IS NOT NULL  -- solo subcategorías
    GROUP BY dc.name, a.category_id
    ORDER BY demand_count DESC
    LIMIT $2
  `, [periodValue, topN])
}

// ---------------------------------------------------------------------------
// Lookup puntual: categoría + zona (caso de uso "librería")
// ---------------------------------------------------------------------------

export async function getMarketLookup(categoryId: number, zoneId: number, months = 6) {
  const [current, history, aggregates] = await Promise.all([
    queryOne<{
      zone: string; department: string; municipality: string
      category: string; category_path: string
      market_opportunity_score: number | null
      demand_activity_index: number | null
      unmet_demand_index: number | null
      category_growth_score: number | null
      local_demand_strength: number | null
      price_acceptance_p10: number | null
      price_acceptance_p50: number | null
      price_acceptance_p90: number | null
      offer_response_rate: number | null
      transaction_confirmation_rate: number | null
      data_confidence: string
      sample_size: number | null
      period_value: string
    }>(`
      SELECT
        dz.zone_name AS zone, dz.department_name AS department, dz.municipality,
        dc.name AS category, dc.full_path AS category_path,
        mi.market_opportunity_score, mi.demand_activity_index, mi.unmet_demand_index,
        mi.category_growth_score, mi.local_demand_strength,
        mi.price_acceptance_p10, mi.price_acceptance_p50, mi.price_acceptance_p90,
        mi.offer_response_rate, mi.transaction_confirmation_rate,
        mi.data_confidence, mi.sample_size, mi.period_value
      FROM analytics.market_indices mi
      JOIN analytics.dim_zones dz      ON dz.id = mi.zone_id
      JOIN analytics.dim_categories dc ON dc.id = mi.category_id
      WHERE mi.zone_id = $1 AND mi.category_id = $2 AND mi.period_type = 'month'
      ORDER BY mi.period_start DESC LIMIT 1
    `, [zoneId, categoryId]),

    query<{
      period_value: string; period_start: string
      market_opportunity_score: number | null
      demand_activity_index: number | null
      unmet_demand_index: number | null
      category_growth_score: number | null
      sample_size: number | null
    }>(`
      SELECT
        mi.period_value, mi.period_start::text,
        mi.market_opportunity_score, mi.demand_activity_index,
        mi.unmet_demand_index, mi.category_growth_score, mi.sample_size
      FROM analytics.market_indices mi
      WHERE mi.zone_id = $1 AND mi.category_id = $2 AND mi.period_type = 'month'
        AND mi.period_start >= (CURRENT_DATE - ($3::int * INTERVAL '1 month'))
      ORDER BY mi.period_start DESC
    `, [zoneId, categoryId, months]),

    queryOne<{
      demand_count: number | null; avg_urgency_score: number | null
      budget_p50: number | null; unmet_demand_count: number | null
    }>(`
      SELECT demand_count, avg_urgency_score, budget_p50, unmet_demand_count
      FROM analytics.agg_demand_by_zone_category
      WHERE zone_id = $1 AND category_id = $2 AND period_type = 'month'
      ORDER BY period_start DESC LIMIT 1
    `, [zoneId, categoryId]),
  ])

  return { current, history, aggregates }
}

// ---------------------------------------------------------------------------
// Datos de referencia
// ---------------------------------------------------------------------------

export async function getCategories() {
  return query<{ id: number; name: string; parent_id: number | null; level: number; full_path: string }>(`
    SELECT id, name, parent_id, level, full_path
    FROM analytics.dim_categories
    WHERE is_active = true
    ORDER BY level, name
  `)
}

export async function getZones(department?: string) {
  return query<{ id: number; zone: string; department: string; municipality: string }>(`
    SELECT id, zone_name AS zone, department_name AS department, municipality
    FROM analytics.dim_zones
    ${department ? `WHERE department_name ILIKE '%${department.replace(/'/g, "''")}%'` : ''}
    ORDER BY department_name, municipality, zone_name
  `)
}

export async function getUsageSummary(institutionId: string) {
  const period = new Date().toISOString().slice(0, 7)
  return queryOne<{
    api_calls_used: number; api_calls_limit: number | null
    report_downloads_used: number; report_downloads_limit: number | null
    dashboard_queries_used: number; dashboard_queries_limit: number | null
    plan_tier: string; institution_name: string
  }>(`
    SELECT
      COALESCE(uq.api_calls_used, 0)          AS api_calls_used,
      p.api_calls_monthly                     AS api_calls_limit,
      COALESCE(uq.report_downloads_used, 0)   AS report_downloads_used,
      p.report_downloads_monthly              AS report_downloads_limit,
      COALESCE(uq.dashboard_queries_used, 0)  AS dashboard_queries_used,
      p.dashboard_queries_monthly             AS dashboard_queries_limit,
      p.tier                                  AS plan_tier,
      i.name                                  AS institution_name
    FROM b2b.institutions i
    JOIN b2b.plans p ON p.id = i.plan_id
    LEFT JOIN b2b.usage_quotas uq ON uq.institution_id = i.id AND uq.period = $2
    WHERE i.id = $1
  `, [institutionId, period])
}
