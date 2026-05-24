import { query, queryOne } from '../client'
import type { UsageSummary, Report } from '../../types'

export async function getUsageSummary(institutionId: string): Promise<UsageSummary | null> {
  const period = new Date().toISOString().slice(0, 7)  // YYYY-MM

  const row = await queryOne<{
    period: string
    api_calls_used: number
    api_calls_limit: number | null
    report_downloads_used: number
    report_downloads_limit: number | null
    dashboard_queries_used: number
    dashboard_queries_limit: number | null
  }>(`
    SELECT
      COALESCE(uq.period, $2)        AS period,
      COALESCE(uq.api_calls_used, 0)          AS api_calls_used,
      p.api_calls_monthly                     AS api_calls_limit,
      COALESCE(uq.report_downloads_used, 0)   AS report_downloads_used,
      p.report_downloads_monthly              AS report_downloads_limit,
      COALESCE(uq.dashboard_queries_used, 0)  AS dashboard_queries_used,
      p.dashboard_queries_monthly             AS dashboard_queries_limit
    FROM b2b.institutions i
    JOIN b2b.plans p ON p.id = i.plan_id
    LEFT JOIN b2b.usage_quotas uq
      ON uq.institution_id = i.id AND uq.period = $2
    WHERE i.id = $1
  `, [institutionId, period])

  if (!row) return null

  const resetDate = new Date()
  resetDate.setMonth(resetDate.getMonth() + 1, 1)
  resetDate.setHours(0, 0, 0, 0)

  return {
    ...row,
    api_calls_remaining: row.api_calls_limit != null
      ? Math.max(0, row.api_calls_limit - row.api_calls_used)
      : null,
    reset_date: resetDate.toISOString().slice(0, 10),
  }
}

export async function getReports(
  institutionId: string,
  filters: { status?: string; limit?: number; offset?: number }
): Promise<{ rows: Report[]; total: number }> {
  const conditions = ['r.institution_id = $1']
  const params: unknown[] = [institutionId]
  let p = 2

  if (filters.status) {
    conditions.push(`r.status = $${p}`)
    params.push(filters.status)
    p++
  }

  const where = `WHERE ${conditions.join(' AND ')}`
  const limit  = filters.limit  ?? 20
  const offset = filters.offset ?? 0

  const [countResult, rows] = await Promise.all([
    queryOne<{ count: string }>(`
      SELECT COUNT(*) AS count FROM b2b.reports r ${where}
    `, params),

    query<Report>(`
      SELECT
        r.id, r.report_type, r.title,
        r.period_start::text, r.period_end::text,
        r.filters,
        r.status,
        r.file_format,
        r.file_size_bytes,
        r.download_count,
        r.generated_at::text,
        r.expires_at::text,
        r.created_at::text
      FROM b2b.reports r
      ${where}
      ORDER BY r.created_at DESC
      LIMIT $${p} OFFSET $${p + 1}
    `, [...params, limit, offset]),
  ])

  return {
    rows,
    total: parseInt(countResult?.count ?? '0', 10),
  }
}

export async function createReportRequest(
  institutionId: string,
  requestedBy: string | null,
  data: {
    reportType: string
    title: string
    periodStart?: string
    periodEnd?: string
    filters?: Record<string, unknown>
    fileFormat?: string
  }
): Promise<Report> {
  const rows = await query<Report>(`
    INSERT INTO b2b.reports (
      institution_id, requested_by,
      report_type, title,
      period_start, period_end,
      filters, file_format, status,
      expires_at
    ) VALUES (
      $1, $2,
      $3, $4,
      $5::date, $6::date,
      $7, $8, 'queued',
      now() + INTERVAL '30 days'
    )
    RETURNING
      id, report_type, title,
      period_start::text, period_end::text,
      filters, status, file_format,
      file_size_bytes, download_count,
      generated_at::text, expires_at::text, created_at::text
  `, [
    institutionId,
    requestedBy,
    data.reportType,
    data.title,
    data.periodStart ?? null,
    data.periodEnd   ?? null,
    data.filters ? JSON.stringify(data.filters) : null,
    data.fileFormat ?? 'pdf',
  ])

  return rows[0]!
}
