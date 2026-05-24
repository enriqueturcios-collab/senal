import { query } from '../client'
import type { DemandAggregate, PeriodType } from '../../types'

export interface DemandAggregateFilter {
  categoryId?: number
  zoneId?: number
  department?: string
  periodType?: PeriodType
  periodValue?: string
  dateFrom?: string
  dateTo?: string
  minDemandCount?: number
  confidence?: 'low' | 'medium' | 'high'
  limit?: number
  offset?: number
  historicalMonthsLimit?: number  // restricción del plan
}

export async function getDemandAggregates(
  filters: DemandAggregateFilter
): Promise<{ rows: DemandAggregate[]; total: number; suppressedCells: number }> {
  const conditions: string[] = ['a.demand_count_suppressed = false']
  const params: unknown[] = []
  let p = 1

  if (filters.historicalMonthsLimit) {
    conditions.push(`a.period_start >= (CURRENT_DATE - ($${p}::int * INTERVAL '1 month'))`)
    params.push(filters.historicalMonthsLimit)
    p++
  }
  if (filters.categoryId) {
    conditions.push(`a.category_id = $${p}`)
    params.push(filters.categoryId)
    p++
  }
  if (filters.zoneId) {
    conditions.push(`a.zone_id = $${p}`)
    params.push(filters.zoneId)
    p++
  }
  if (filters.department) {
    conditions.push(`dz.department_name ILIKE $${p}`)
    params.push(`%${filters.department}%`)
    p++
  }
  if (filters.periodType) {
    conditions.push(`a.period_type = $${p}`)
    params.push(filters.periodType)
    p++
  }
  if (filters.periodValue) {
    conditions.push(`a.period_value = $${p}`)
    params.push(filters.periodValue)
    p++
  }
  if (filters.dateFrom) {
    conditions.push(`a.period_start >= $${p}::date`)
    params.push(filters.dateFrom)
    p++
  }
  if (filters.dateTo) {
    conditions.push(`a.period_end <= $${p}::date`)
    params.push(filters.dateTo)
    p++
  }
  if (filters.confidence) {
    const scoreMap = { low: 0, medium: 15, high: 50 }
    conditions.push(`a.demand_count >= $${p}`)
    params.push(scoreMap[filters.confidence])
    p++
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit  = filters.limit  ?? 50
  const offset = filters.offset ?? 0

  // Contar total y celdas suprimidas en paralelo
  const [countResult, suppressedResult, rows] = await Promise.all([
    query<{ count: string }>(`
      SELECT COUNT(*) AS count
      FROM analytics.agg_demand_by_zone_category a
      JOIN analytics.dim_zones dz      ON dz.id = a.zone_id
      JOIN analytics.dim_categories dc ON dc.id = a.category_id
      ${where}
    `, params),

    query<{ count: string }>(`
      SELECT COUNT(*) AS count
      FROM analytics.agg_demand_by_zone_category a
      JOIN analytics.dim_zones dz      ON dz.id = a.zone_id
      JOIN analytics.dim_categories dc ON dc.id = a.category_id
      WHERE demand_count_suppressed = true
        ${filters.categoryId    ? `AND a.category_id = ${filters.categoryId}`    : ''}
        ${filters.zoneId        ? `AND a.zone_id = ${filters.zoneId}`            : ''}
        ${filters.periodValue   ? `AND a.period_value = '${filters.periodValue}'`: ''}
    `, []),

    query<DemandAggregate>(`
      SELECT
        a.zone_id,
        dz.department_name       AS department,
        dz.municipality,
        dz.zone_name             AS zone,
        a.category_id,
        dc.name                  AS category,
        dc.full_path             AS category_path,
        a.period_type,
        a.period_value,
        a.period_start::text,
        a.period_end::text,
        a.demand_count,
        a.budget_p10,
        a.budget_p25,
        a.budget_p50,
        a.budget_p75,
        a.budget_p90,
        a.budget_avg,
        a.avg_offers_per_demand,
        a.transaction_rate,
        a.avg_time_to_close_h,
        a.unmet_demand_count,
        a.unmet_demand_rate,
        a.avg_urgency_score,
        CASE
          WHEN a.demand_count >= 50 THEN 'high'
          WHEN a.demand_count >= 15 THEN 'medium'
          ELSE 'low'
        END                      AS data_confidence,
        a.calculated_at::text
      FROM analytics.agg_demand_by_zone_category a
      JOIN analytics.dim_zones dz      ON dz.id = a.zone_id
      JOIN analytics.dim_categories dc ON dc.id = a.category_id
      ${where}
      ORDER BY a.period_start DESC, a.demand_count DESC NULLS LAST
      LIMIT $${p} OFFSET $${p + 1}
    `, [...params, limit, offset]),
  ])

  return {
    rows,
    total: parseInt(countResult[0]?.count ?? '0', 10),
    suppressedCells: parseInt(suppressedResult[0]?.count ?? '0', 10),
  }
}

export async function getUnmetDemand(
  filters: Pick<DemandAggregateFilter, 'categoryId' | 'zoneId' | 'periodType' | 'periodValue' | 'historicalMonthsLimit' | 'limit' | 'offset'>
): Promise<{ rows: DemandAggregate[]; total: number }> {
  const conditions = ['a.demand_count_suppressed = false', 'a.unmet_demand_rate > 0.3']
  const params: unknown[] = []
  let p = 1

  if (filters.historicalMonthsLimit) {
    conditions.push(`a.period_start >= (CURRENT_DATE - ($${p}::int * INTERVAL '1 month'))`)
    params.push(filters.historicalMonthsLimit)
    p++
  }
  if (filters.categoryId) { conditions.push(`a.category_id = $${p}`); params.push(filters.categoryId); p++ }
  if (filters.zoneId)     { conditions.push(`a.zone_id = $${p}`);     params.push(filters.zoneId);     p++ }
  if (filters.periodType) { conditions.push(`a.period_type = $${p}`); params.push(filters.periodType); p++ }
  if (filters.periodValue){ conditions.push(`a.period_value = $${p}`);params.push(filters.periodValue);p++ }

  const where = `WHERE ${conditions.join(' AND ')}`
  const limit  = filters.limit  ?? 50
  const offset = filters.offset ?? 0

  const [countResult, rows] = await Promise.all([
    query<{ count: string }>(`
      SELECT COUNT(*) AS count
      FROM analytics.agg_demand_by_zone_category a
      JOIN analytics.dim_zones dz      ON dz.id = a.zone_id
      JOIN analytics.dim_categories dc ON dc.id = a.category_id
      ${where}
    `, params),

    query<DemandAggregate>(`
      SELECT
        a.zone_id,
        dz.department_name  AS department,
        dz.municipality,
        dz.zone_name        AS zone,
        a.category_id,
        dc.name             AS category,
        dc.full_path        AS category_path,
        a.period_type, a.period_value,
        a.period_start::text, a.period_end::text,
        a.demand_count,
        a.budget_p50,
        a.unmet_demand_count,
        a.unmet_demand_rate,
        a.avg_urgency_score,
        a.transaction_rate,
        CASE WHEN a.demand_count >= 50 THEN 'high' WHEN a.demand_count >= 15 THEN 'medium' ELSE 'low' END AS data_confidence,
        a.calculated_at::text,
        NULL AS budget_p10, NULL AS budget_p25, NULL AS budget_p75, NULL AS budget_p90,
        NULL AS budget_avg, NULL AS avg_offers_per_demand, NULL AS avg_time_to_close_h
      FROM analytics.agg_demand_by_zone_category a
      JOIN analytics.dim_zones dz      ON dz.id = a.zone_id
      JOIN analytics.dim_categories dc ON dc.id = a.category_id
      ${where}
      ORDER BY a.unmet_demand_rate DESC, a.demand_count DESC NULLS LAST
      LIMIT $${p} OFFSET $${p + 1}
    `, [...params, limit, offset]),
  ])

  return { rows, total: parseInt(countResult[0]?.count ?? '0', 10) }
}
