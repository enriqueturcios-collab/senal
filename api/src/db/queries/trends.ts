import { query, queryOne } from '../client'
import type { CategoryTrend, NationalSummary, PeriodType } from '../../types'

export interface TrendFilter {
  categoryId?: number
  zoneId?: number
  periodType?: PeriodType
  months?: number   // cuántos períodos hacia atrás
  historicalMonthsLimit?: number
}

export async function getCategoryTrends(
  filters: TrendFilter
): Promise<CategoryTrend[]> {
  const conditions: string[] = ['dt.demand_count IS NOT NULL']
  const params: unknown[] = []
  let p = 1

  const maxMonths = filters.historicalMonthsLimit ?? 36
  const requestedMonths = Math.min(filters.months ?? 12, maxMonths)
  conditions.push(`dt.period_start >= (CURRENT_DATE - ($${p}::int * INTERVAL '1 month'))`)
  params.push(requestedMonths)
  p++

  if (filters.categoryId) {
    conditions.push(`dt.category_id = $${p}`)
    params.push(filters.categoryId)
    p++
  }
  if (filters.zoneId !== undefined) {
    if (filters.zoneId === 0) {
      conditions.push('dt.zone_id IS NULL')  // 0 = nivel nacional
    } else {
      conditions.push(`dt.zone_id = $${p}`)
      params.push(filters.zoneId)
      p++
    }
  }
  if (filters.periodType) {
    conditions.push(`dt.period_type = $${p}`)
    params.push(filters.periodType)
    p++
  }

  const where = `WHERE ${conditions.join(' AND ')}`

  return query<CategoryTrend>(`
    SELECT
      dt.category_id,
      dc.name                  AS category,
      dc.full_path             AS category_path,
      dt.zone_id,
      dz.department_name       AS department,
      dz.zone_name             AS zone,
      dt.period_type,
      dt.period_value,
      dt.period_start::text,
      dt.demand_count,
      dt.transaction_count,
      dt.avg_budget,
      dt.transaction_rate,
      dt.unmet_rate,
      dt.demand_pct_change     AS growth_pct,
      dt.calculated_at::text
    FROM analytics.demand_trends dt
    JOIN analytics.dim_categories dc ON dc.id = dt.category_id
    LEFT JOIN analytics.dim_zones dz ON dz.id = dt.zone_id
    ${where}
    ORDER BY dt.category_id, dt.period_start DESC
  `, params)
}

export async function getNationalSummary(
  periodType: PeriodType = 'month',
  periodValue?: string
): Promise<NationalSummary | null> {
  const conditions = [`ns.period_type = $1`]
  const params: unknown[] = [periodType]

  if (periodValue) {
    conditions.push(`ns.period_value = $2`)
    params.push(periodValue)
  }

  const row = await queryOne<{
    period_type: string
    period_value: string
    period_start: string
    total_demands: number
    total_transactions: number
    overall_transaction_rate: number | null
    overall_unmet_rate: number | null
    top_categories: string
    top_zones: string
    avg_budget_national: number | null
    new_categories_emerging: number
    calculated_at: string
  }>(`
    SELECT
      ns.period_type,
      ns.period_value,
      ns.period_start::text,
      ns.total_demands,
      ns.total_transactions,
      ns.overall_transaction_rate,
      ns.overall_unmet_rate,
      ns.top_categories,
      ns.top_zones,
      ns.avg_budget_national,
      ns.new_categories_emerging,
      ns.calculated_at::text
    FROM analytics.national_summary ns
    WHERE ${conditions.join(' AND ')}
    ORDER BY ns.period_start DESC
    LIMIT 1
  `, params)

  if (!row) return null

  return {
    ...row,
    top_categories: typeof row.top_categories === 'string'
      ? JSON.parse(row.top_categories)
      : row.top_categories ?? [],
    top_zones: typeof row.top_zones === 'string'
      ? JSON.parse(row.top_zones)
      : row.top_zones ?? [],
  } as NationalSummary
}
