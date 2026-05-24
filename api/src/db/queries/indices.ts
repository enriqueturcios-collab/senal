import { query } from '../client'
import type { MarketIndex, PeriodType } from '../../types'

export interface IndexFilter {
  categoryId?: number
  zoneId?: number
  department?: string
  periodType?: PeriodType
  periodValue?: string
  minOpportunityScore?: number
  confidence?: 'low' | 'medium' | 'high'
  historicalMonthsLimit?: number
  sortBy?: 'market_opportunity_score' | 'demand_activity_index' | 'unmet_demand_index' | 'category_growth_score'
  sortDir?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

const ALLOWED_SORT_FIELDS = new Set([
  'market_opportunity_score',
  'demand_activity_index',
  'unmet_demand_index',
  'category_growth_score',
])

export async function getMarketIndices(
  filters: IndexFilter
): Promise<{ rows: MarketIndex[]; total: number }> {
  const conditions: string[] = ['mi.data_confidence IS NOT NULL']
  const params: unknown[] = []
  let p = 1

  if (filters.historicalMonthsLimit) {
    conditions.push(`mi.period_start >= (CURRENT_DATE - ($${p}::int * INTERVAL '1 month'))`)
    params.push(filters.historicalMonthsLimit)
    p++
  }
  if (filters.categoryId) {
    conditions.push(`mi.category_id = $${p}`)
    params.push(filters.categoryId)
    p++
  }
  if (filters.zoneId) {
    conditions.push(`mi.zone_id = $${p}`)
    params.push(filters.zoneId)
    p++
  }
  if (filters.department) {
    conditions.push(`dz.department_name ILIKE $${p}`)
    params.push(`%${filters.department}%`)
    p++
  }
  if (filters.periodType) {
    conditions.push(`mi.period_type = $${p}`)
    params.push(filters.periodType)
    p++
  }
  if (filters.periodValue) {
    conditions.push(`mi.period_value = $${p}`)
    params.push(filters.periodValue)
    p++
  }
  if (filters.minOpportunityScore != null) {
    conditions.push(`mi.market_opportunity_score >= $${p}`)
    params.push(filters.minOpportunityScore)
    p++
  }
  if (filters.confidence) {
    conditions.push(`mi.data_confidence = $${p}`)
    params.push(filters.confidence)
    p++
  }

  const where = `WHERE ${conditions.join(' AND ')}`

  // Sanitizar campo de ordenamiento contra la whitelist
  const sortField = ALLOWED_SORT_FIELDS.has(filters.sortBy ?? '')
    ? filters.sortBy
    : 'market_opportunity_score'
  const sortDir = filters.sortDir === 'asc' ? 'ASC' : 'DESC'

  const limit  = filters.limit  ?? 50
  const offset = filters.offset ?? 0

  const [countResult, rows] = await Promise.all([
    query<{ count: string }>(`
      SELECT COUNT(*) AS count
      FROM analytics.market_indices mi
      JOIN analytics.dim_zones dz      ON dz.id = mi.zone_id
      JOIN analytics.dim_categories dc ON dc.id = mi.category_id
      ${where}
    `, params),

    query<MarketIndex>(`
      SELECT
        mi.zone_id,
        dz.department_name           AS department,
        dz.municipality,
        dz.zone_name                 AS zone,
        mi.category_id,
        dc.name                      AS category,
        dc.full_path                 AS category_path,
        mi.period_type,
        mi.period_value,
        mi.period_start::text,
        mi.period_end::text,
        mi.demand_activity_index,
        mi.unmet_demand_index,
        mi.market_opportunity_score,
        mi.category_growth_score,
        mi.local_demand_strength,
        mi.entrepreneurial_demand_signal,
        mi.price_acceptance_p10,
        mi.price_acceptance_p50,
        mi.price_acceptance_p90,
        mi.offer_response_rate,
        mi.transaction_confirmation_rate,
        mi.data_confidence,
        mi.sample_size,
        mi.calculated_at::text
      FROM analytics.market_indices mi
      JOIN analytics.dim_zones dz      ON dz.id = mi.zone_id
      JOIN analytics.dim_categories dc ON dc.id = mi.category_id
      ${where}
      ORDER BY mi.${sortField} ${sortDir} NULLS LAST, mi.period_start DESC
      LIMIT $${p} OFFSET $${p + 1}
    `, [...params, limit, offset]),
  ])

  return {
    rows,
    total: parseInt(countResult[0]?.count ?? '0', 10),
  }
}

// Top N oportunidades — endpoint más usado por bancos
export async function getTopOpportunities(
  filters: Pick<IndexFilter, 'department' | 'periodValue' | 'historicalMonthsLimit'> & { topN?: number }
): Promise<MarketIndex[]> {
  const params: unknown[] = []
  const conditions = [`mi.data_confidence IN ('medium','high')`]
  let p = 1

  if (filters.historicalMonthsLimit) {
    conditions.push(`mi.period_start >= (CURRENT_DATE - ($${p}::int * INTERVAL '1 month'))`)
    params.push(filters.historicalMonthsLimit)
    p++
  }
  if (filters.periodValue) {
    conditions.push(`mi.period_value = $${p}`)
    params.push(filters.periodValue)
    p++
  }
  if (filters.department) {
    conditions.push(`dz.department_name ILIKE $${p}`)
    params.push(`%${filters.department}%`)
    p++
  }

  const topN = Math.min(filters.topN ?? 20, 100)
  const where = `WHERE ${conditions.join(' AND ')}`

  return query<MarketIndex>(`
    SELECT
      mi.zone_id,
      dz.department_name           AS department,
      dz.municipality,
      dz.zone_name                 AS zone,
      mi.category_id,
      dc.name                      AS category,
      dc.full_path                 AS category_path,
      mi.period_type,
      mi.period_value,
      mi.period_start::text,
      mi.period_end::text,
      mi.demand_activity_index,
      mi.unmet_demand_index,
      mi.market_opportunity_score,
      mi.category_growth_score,
      mi.local_demand_strength,
      mi.entrepreneurial_demand_signal,
      mi.price_acceptance_p10,
      mi.price_acceptance_p50,
      mi.price_acceptance_p90,
      mi.offer_response_rate,
      mi.transaction_confirmation_rate,
      mi.data_confidence,
      mi.sample_size,
      mi.calculated_at::text
    FROM analytics.market_indices mi
    JOIN analytics.dim_zones dz      ON dz.id = mi.zone_id
    JOIN analytics.dim_categories dc ON dc.id = mi.category_id
    ${where}
    ORDER BY mi.market_opportunity_score DESC NULLS LAST
    LIMIT $${p}
  `, [...params, topN])
}
