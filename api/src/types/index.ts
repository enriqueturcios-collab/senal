// ---------------------------------------------------------------------------
// Tipos de dominio que circulan por toda la API
// ---------------------------------------------------------------------------

export type PlanTier = 'basic' | 'pro' | 'enterprise' | 'research'
export type DataConfidence = 'low' | 'medium' | 'high'
export type PeriodType = 'week' | 'month' | 'quarter'

// Contexto de autenticación adjunto a cada request
export interface AuthContext {
  institutionId: string
  institutionName: string
  apiKeyId: string
  plan: PlanTier
  allowedScopes: string[]        // scopes del plan
  keyScopes: string[]            // scopes de la API key (subconjunto del plan)
  historicalMonthsAccess: number
  apiCallsMonthly: number | null
}

// ---------------------------------------------------------------------------
// Respuestas de la API
// ---------------------------------------------------------------------------

export interface ApiMeta {
  request_id: string
  institution_id: string
  generated_at: string
  period?: string
  data_confidence?: DataConfidence
  sample_size?: number
  suppressed_cells?: number  // celdas suprimidas por k-anonimidad
}

export interface ApiResponse<T> {
  data: T
  meta: ApiMeta
}

export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  meta: ApiMeta & {
    total: number
    page: number
    per_page: number
    total_pages: number
  }
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

// ---------------------------------------------------------------------------
// Entidades devueltas por los endpoints
// ---------------------------------------------------------------------------

export interface DemandAggregate {
  zone_id: number
  department: string
  municipality: string
  zone: string
  category_id: number
  category: string
  category_path: string
  period_type: PeriodType
  period_value: string
  period_start: string
  period_end: string
  demand_count: number | null         // null = suprimido por k-anonimidad (n<5)
  budget_p10: number | null
  budget_p25: number | null
  budget_p50: number | null
  budget_p75: number | null
  budget_p90: number | null
  budget_avg: number | null
  avg_offers_per_demand: number | null
  transaction_rate: number | null
  avg_time_to_close_h: number | null
  unmet_demand_count: number | null
  unmet_demand_rate: number | null
  avg_urgency_score: number | null
  data_confidence: DataConfidence
  calculated_at: string
}

export interface MarketIndex {
  zone_id: number
  department: string
  municipality: string
  zone: string
  category_id: number
  category: string
  category_path: string
  period_type: PeriodType
  period_value: string
  period_start: string
  period_end: string
  demand_activity_index: number | null
  unmet_demand_index: number | null
  market_opportunity_score: number | null
  category_growth_score: number | null
  local_demand_strength: number | null
  entrepreneurial_demand_signal: number | null
  price_acceptance_p10: number | null
  price_acceptance_p50: number | null
  price_acceptance_p90: number | null
  offer_response_rate: number | null
  transaction_confirmation_rate: number | null
  data_confidence: DataConfidence
  sample_size: number | null
  calculated_at: string
}

export interface CategoryTrend {
  category_id: number
  category: string
  category_path: string
  zone_id: number | null
  department: string | null
  zone: string | null
  period_type: PeriodType
  period_value: string
  period_start: string
  demand_count: number | null
  transaction_count: number | null
  avg_budget: number | null
  transaction_rate: number | null
  unmet_rate: number | null
  growth_pct: number | null
  calculated_at: string
}

export interface NationalSummary {
  period_type: PeriodType
  period_value: string
  period_start: string
  total_demands: number
  total_transactions: number
  overall_transaction_rate: number | null
  overall_unmet_rate: number | null
  top_categories: Array<{ category_id: number; category: string; count: number; share: number }>
  top_zones: Array<{ zone_id: number; zone: string; count: number; share: number }>
  avg_budget_national: number | null
  new_categories_emerging: number
  calculated_at: string
}

export interface Category {
  id: number
  parent_id: number | null
  name: string
  slug: string
  level: number
  full_path: string
}

export interface Zone {
  id: number
  country_code: string
  department: string
  municipality: string
  zone: string
  zone_type: string | null
  lat_centroid: number | null
  lng_centroid: number | null
}

export interface UsageSummary {
  period: string
  api_calls_used: number
  api_calls_limit: number | null
  api_calls_remaining: number | null
  report_downloads_used: number
  report_downloads_limit: number | null
  dashboard_queries_used: number
  dashboard_queries_limit: number | null
  reset_date: string
}

export interface Report {
  id: string
  report_type: string
  title: string
  period_start: string | null
  period_end: string | null
  filters: Record<string, unknown> | null
  status: 'queued' | 'generating' | 'ready' | 'failed' | 'expired'
  file_format: string
  file_size_bytes: number | null
  download_count: number
  generated_at: string | null
  expires_at: string | null
  created_at: string
}
