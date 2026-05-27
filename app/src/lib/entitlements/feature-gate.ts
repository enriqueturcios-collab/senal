// Centralised server-side feature gate.
// All entrepreneur API routes and server components use these helpers.
// Do NOT check plan names inline in multiple places — use these functions.

import { queryOne } from '@/db'
import { redirect } from 'next/navigation'
import type { EntrepreneurPlan, EntrepreneurFeatureKey, PlanLimits } from './entrepreneur-plans'
import { hasFeature, getPlanLimits, PLAN_DEFINITIONS } from './entrepreneur-plans'

// ── Types ────────────────────────────────────────────────────────────────────

export interface EntrepreneurSession {
  userId: string
  plan: EntrepreneurPlan
  profileId: string
  businessName: string | null
  status: string
}

// ── DB helpers ───────────────────────────────────────────────────────────────

export async function getEntrepreneurSession(userId: string): Promise<EntrepreneurSession | null> {
  const row = await queryOne<{
    profile_id: string
    plan: string
    status: string
    business_name: string | null
  }>(`
    SELECT p.id AS profile_id, s.plan, s.status, p.business_name
    FROM entrepreneur.profiles p
    JOIN entrepreneur.subscriptions s ON s.user_id = p.user_id
    WHERE p.user_id = $1
  `, [userId])

  if (!row) return null
  if (row.status !== 'active' && row.status !== 'trialing') return null

  return {
    userId,
    plan: row.plan as EntrepreneurPlan,
    profileId: row.profile_id,
    businessName: row.business_name,
    status: row.status,
  }
}

// Creates a free subscription + profile if the user doesn't have one yet
export async function ensureEntrepreneurProfile(userId: string, displayName: string): Promise<EntrepreneurSession> {
  const existing = await getEntrepreneurSession(userId)
  if (existing) return existing

  // Create profile
  const profile = await queryOne<{ id: string }>(`
    INSERT INTO entrepreneur.profiles (user_id, business_name)
    VALUES ($1, $2)
    ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
    RETURNING id
  `, [userId, displayName])

  // Create free subscription
  await queryOne(`
    INSERT INTO entrepreneur.subscriptions (user_id, plan, status, current_period_start)
    VALUES ($1, 'free', 'active', now())
    ON CONFLICT (user_id) DO NOTHING
  `, [userId])

  return {
    userId,
    plan: 'free',
    profileId: profile!.id,
    businessName: displayName,
    status: 'active',
  }
}

// ── Server-side guards (for use in server components + route handlers) ────────

/** Throws redirect if user doesn't have required feature */
export function requireEntrepreneurFeature(
  plan: EntrepreneurPlan,
  feature: EntrepreneurFeatureKey,
): void {
  if (!hasFeature(plan, feature)) {
    throw new Error(`UNAUTHORIZED: feature ${feature} not available on plan ${plan}`)
  }
}

/** Use in server components: redirects if not enrolled or feature locked */
export async function requireEntrepreneurAccess(
  userId: string,
  feature?: EntrepreneurFeatureKey,
): Promise<EntrepreneurSession> {
  const row = await queryOne<{ profile_id: string; plan: string; status: string; business_name: string | null }>(`
    SELECT p.id AS profile_id, s.plan, s.status, p.business_name
    FROM entrepreneur.profiles p
    JOIN entrepreneur.subscriptions s ON s.user_id = p.user_id
    WHERE p.user_id = $1
  `, [userId])

  if (!row || (row.status !== 'active' && row.status !== 'trialing')) {
    redirect('/entrepreneur/pricing')
  }

  const session: EntrepreneurSession = {
    userId,
    plan: row.plan as EntrepreneurPlan,
    profileId: row.profile_id,
    businessName: row.business_name,
    status: row.status,
  }

  if (feature && !hasFeature(session.plan, feature)) {
    redirect(`/entrepreneur/pricing?upgrade=${feature}`)
  }

  return session
}

// ── Usage tracking ────────────────────────────────────────────────────────────

export async function getCurrentUsage(
  userId: string,
  featureKey: string,
): Promise<number> {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const row = await queryOne<{ usage_count: number }>(`
    SELECT usage_count FROM entrepreneur.feature_usage
    WHERE user_id = $1 AND feature_key = $2 AND period_start = $3
  `, [userId, featureKey, periodStart])

  return row?.usage_count ?? 0
}

export async function incrementUsage(
  userId: string,
  featureKey: string,
  amount = 1,
): Promise<number> {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

  const row = await queryOne<{ usage_count: number }>(`
    INSERT INTO entrepreneur.feature_usage (user_id, feature_key, usage_count, period_start, period_end)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, feature_key, period_start)
    DO UPDATE SET usage_count = entrepreneur.feature_usage.usage_count + $3,
                  updated_at = now()
    RETURNING usage_count
  `, [userId, featureKey, amount, periodStart, periodEnd])

  return row?.usage_count ?? 0
}

export async function checkUsageLimit(
  userId: string,
  plan: EntrepreneurPlan,
  featureKey: keyof PlanLimits,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = getPlanLimits(plan)[featureKey]

  let used: number
  if (featureKey === 'inventory_items') {
    const row = await queryOne<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM entrepreneur.inventory_items WHERE user_id = $1`,
      [userId]
    )
    used = row?.n ?? 0
  } else if (featureKey === 'alert_rules') {
    const row = await queryOne<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM entrepreneur.alert_rules WHERE user_id = $1`,
      [userId]
    )
    used = row?.n ?? 0
  } else {
    used = await getCurrentUsage(userId, featureKey)
  }

  return { allowed: limit === 0 || used < limit, used, limit }
}

// ── Plan upgrade info ─────────────────────────────────────────────────────────

export function getUpgradeMessage(feature: EntrepreneurFeatureKey, currentPlan: EntrepreneurPlan): string {
  const msgs: Partial<Record<EntrepreneurFeatureKey, string>> = {
    opportunity_inbox:         'Activá Starter para ver tu Opportunity Inbox.',
    demand_alerts:             'Activá Starter para recibir alertas de nueva demanda.',
    inventory_manager:         'Activá Starter para gestionar tu inventario.',
    inventory_csv_import:      'Activá Growth para importar inventario por CSV.',
    fulfillment_assistant:     'Activá Growth para el Fulfillment Assistant.',
    offer_auto_draft:          'Activá Growth para generar borradores de ofertas automáticamente.',
    market_pulse_lite:         'Activá Starter para ver el pulso de mercado de tus categorías.',
    market_pulse_pro:          'Activá Growth para el Market Pulse Pro con rangos de precios.',
    market_pulse_advanced:     'Activá Scale para el Market Pulse avanzado con tendencias mensuales.',
    team_users:                'Activá Scale para agregar miembros a tu equipo.',
    own_analytics_advanced:    'Activá Growth para analítica avanzada de tu negocio.',
  }
  return msgs[feature] ?? `Actualizá tu plan para acceder a esta función.`
}

// ── Validate that an action isn't accessing institutional features ─────────────

export function assertNotInstitutional(feature: string): void {
  const institutionalFeatures = [
    'institutional_dashboard', 'credit_use_case_explorer', 'credit_memo',
    'reality_check', 'institutional_price_book', 'portfolio_watchlist',
    'branch_opportunity_map', 'sector_zone_snapshot', 'institutional_api',
    'institutional_exports', 'institutional_audit_logs',
  ]
  if (institutionalFeatures.includes(feature)) {
    throw new Error('FORBIDDEN: Institutional features are not accessible to entrepreneurs.')
  }
}
