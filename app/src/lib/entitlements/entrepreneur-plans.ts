// Source of truth for entrepreneur plan definitions and feature keys.
// This is the ONLY place where plan logic is defined — never duplicate it in UI components.

export type EntrepreneurPlan = 'free' | 'starter' | 'growth' | 'scale'

// Every feature key available to entrepreneurs
export type EntrepreneurFeatureKey =
  | 'marketplace_basic'
  | 'demand_response'
  | 'opportunity_inbox'
  | 'demand_alerts'
  | 'alert_rules'
  | 'inventory_manager'
  | 'inventory_csv_import'
  | 'inventory_external_sync'
  | 'inventory_demand_matching'
  | 'fulfillment_assistant'
  | 'offer_auto_draft'
  | 'offer_auto_send'
  | 'market_pulse_lite'
  | 'market_pulse_pro'
  | 'market_pulse_advanced'
  | 'own_analytics_basic'
  | 'own_analytics_advanced'
  | 'team_users'
  | 'own_data_export'
  | 'proactive_offers'

// Institutional features — entrepreneurs can NEVER access these
export type InstitutionalFeatureKey =
  | 'institutional_dashboard'
  | 'credit_use_case_explorer'
  | 'credit_memo'
  | 'reality_check'
  | 'institutional_price_book'
  | 'portfolio_watchlist'
  | 'branch_opportunity_map'
  | 'sector_zone_snapshot'
  | 'institutional_api'
  | 'institutional_exports'
  | 'institutional_audit_logs'

export interface PlanLimits {
  monthly_offer_responses: number
  inventory_items: number
  alert_rules: number
  categories: number
  zones: number
  team_members: number
}

export interface PlanDefinition {
  plan: EntrepreneurPlan
  name: string
  monthly_price_cents: number
  currency: string
  description: string
  limits: PlanLimits
  features: EntrepreneurFeatureKey[]
}

// Static definitions mirror what's in the DB — used for client-side rendering and guards
export const PLAN_DEFINITIONS: Record<EntrepreneurPlan, PlanDefinition> = {
  free: {
    plan: 'free',
    name: 'Marketplace Basic',
    monthly_price_cents: 0,
    currency: 'GTQ',
    description: 'Probá Signal como marketplace básico. Sin costo.',
    limits: { monthly_offer_responses: 5, inventory_items: 0, alert_rules: 0, categories: 1, zones: 1, team_members: 0 },
    features: ['marketplace_basic', 'demand_response', 'proactive_offers'],
  },
  starter: {
    plan: 'starter',
    name: 'Entrepreneur Starter',
    monthly_price_cents: 4900,
    currency: 'GTQ',
    description: 'Recibí alertas de demanda y encontrá tus primeras oportunidades.',
    limits: { monthly_offer_responses: 30, inventory_items: 30, alert_rules: 3, categories: 3, zones: 3, team_members: 0 },
    features: ['marketplace_basic', 'demand_response', 'opportunity_inbox', 'demand_alerts', 'alert_rules',
               'inventory_manager', 'inventory_demand_matching', 'market_pulse_lite', 'own_analytics_basic',
               'proactive_offers'],
  },
  growth: {
    plan: 'growth',
    name: 'Entrepreneur Growth',
    monthly_price_cents: 14900,
    currency: 'GTQ',
    description: 'Conectá inventario, generá ofertas más rápido y entendé qué pide tu mercado.',
    limits: { monthly_offer_responses: 150, inventory_items: 250, alert_rules: 10, categories: 10, zones: 10, team_members: 0 },
    features: ['marketplace_basic', 'demand_response', 'opportunity_inbox', 'demand_alerts', 'alert_rules',
               'inventory_manager', 'inventory_csv_import', 'inventory_demand_matching', 'fulfillment_assistant',
               'offer_auto_draft', 'market_pulse_pro', 'own_analytics_advanced', 'own_data_export',
               'proactive_offers'],
  },
  scale: {
    plan: 'scale',
    name: 'Entrepreneur Scale',
    monthly_price_cents: 39900,
    currency: 'GTQ',
    description: 'Convertí Signal en un motor de ventas con equipo, reglas y fulfillment semi-automatizado.',
    limits: { monthly_offer_responses: 500, inventory_items: 2000, alert_rules: 50, categories: 30, zones: 30, team_members: 5 },
    features: ['marketplace_basic', 'demand_response', 'opportunity_inbox', 'demand_alerts', 'alert_rules',
               'inventory_manager', 'inventory_csv_import', 'inventory_demand_matching', 'fulfillment_assistant',
               'offer_auto_draft', 'offer_auto_send', 'market_pulse_advanced', 'own_analytics_advanced',
               'own_data_export', 'team_users', 'proactive_offers'],
  },
}

export const PLAN_ORDER: EntrepreneurPlan[] = ['free', 'starter', 'growth', 'scale']

export function planIndex(plan: EntrepreneurPlan): number {
  return PLAN_ORDER.indexOf(plan)
}

export function isPlanAtLeast(plan: EntrepreneurPlan, minimum: EntrepreneurPlan): boolean {
  return planIndex(plan) >= planIndex(minimum)
}

// Feature hierarchies: having a higher-tier feature implies access to lower-tier ones
const FEATURE_IMPLIES: Partial<Record<EntrepreneurFeatureKey, EntrepreneurFeatureKey[]>> = {
  market_pulse_advanced: ['market_pulse_pro', 'market_pulse_lite'],
  market_pulse_pro:      ['market_pulse_lite'],
  own_analytics_advanced: ['own_analytics_basic'],
}

export function hasFeature(plan: EntrepreneurPlan, feature: EntrepreneurFeatureKey): boolean {
  const features = PLAN_DEFINITIONS[plan].features
  if (features.includes(feature)) return true
  // Check if any feature in the plan implies the requested one
  return features.some(f => FEATURE_IMPLIES[f]?.includes(feature))
}

export function getPlanLimits(plan: EntrepreneurPlan): PlanLimits {
  return PLAN_DEFINITIONS[plan].limits
}

export function fmtPlanPrice(plan: EntrepreneurPlan): string {
  const def = PLAN_DEFINITIONS[plan]
  if (def.monthly_price_cents === 0) return 'Gratis'
  return `Q${(def.monthly_price_cents / 100).toFixed(0)}/mes`
}

// Upgrade suggestions by feature
export const FEATURE_UPGRADE_REQUIRED: Partial<Record<EntrepreneurFeatureKey, EntrepreneurPlan>> = {
  opportunity_inbox:         'starter',
  demand_alerts:             'starter',
  alert_rules:               'starter',
  inventory_manager:         'starter',
  inventory_demand_matching: 'starter',
  market_pulse_lite:         'starter',
  own_analytics_basic:       'starter',
  inventory_csv_import:      'growth',
  fulfillment_assistant:     'growth',
  offer_auto_draft:          'growth',
  market_pulse_pro:          'growth',
  own_analytics_advanced:    'growth',
  own_data_export:           'growth',
  market_pulse_advanced:     'scale',
  team_users:                'scale',
  offer_auto_send:           'scale',
}
