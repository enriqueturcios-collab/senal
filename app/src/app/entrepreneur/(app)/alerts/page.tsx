import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireEntrepreneurAccess } from '@/lib/entitlements/feature-gate'
import { hasFeature, PLAN_DEFINITIONS } from '@/lib/entitlements/entrepreneur-plans'
import { query } from '@/db'
import { timeAgo } from '@/lib/utils'
import { AlertActions } from './alert-actions'

export default async function AlertsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const ent  = await requireEntrepreneurAccess(session.user.id)
  const plan = ent.plan
  const canUseAlerts  = hasFeature(plan, 'demand_alerts')
  const canCreateRules = hasFeature(plan, 'alert_rules')
  const ruleLimit = PLAN_DEFINITIONS[plan].limits.alert_rules

  const rules = canUseAlerts ? await query<{
    id: string; name: string; keywords: string[]
    category_names: string[]; urgency_filter: string[]; budget_min: number | null
    is_active: boolean; match_count: number; created_at: string
  }>(`
    SELECT
      r.id, r.name, r.keywords,
      COALESCE(
        ARRAY(SELECT c.name FROM app.categories c
              WHERE c.id = ANY(r.category_ids)), '{}'::text[]
      ) AS category_names,
      r.urgency_filter, r.budget_min, r.is_active,
      COALESCE((
        SELECT COUNT(*) FROM entrepreneur.opportunity_matches m
        WHERE m.user_id = r.user_id AND m.created_at >= r.created_at
      ), 0)::int AS match_count,
      r.created_at::text
    FROM entrepreneur.alert_rules r
    WHERE r.user_id = $1
    ORDER BY r.is_active DESC, r.created_at DESC
  `, [session.user.id]) : []

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 pb-28">

      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-[24px] font-bold text-signal-text" style={{ letterSpacing: '-0.02em' }}>
            Alertas
          </h1>
          <p className="text-[12px] text-signal-text-muted mt-0.5">
            Notificaciones cuando aparezcan demandas que te interesan
          </p>
        </div>
        {canCreateRules && (ruleLimit === 0 || rules.length < ruleLimit) && (
          <Link href="/entrepreneur/alerts/new"
                className="text-[12px] font-semibold px-4 py-2 rounded-xl text-white
                           hover:opacity-90 transition-opacity shrink-0"
                style={{ backgroundColor: '#5F6F52' }}>
            + Nueva regla
          </Link>
        )}
      </div>

      {/* Upgrade gate */}
      {!canUseAlerts && (
        <div className="rounded-2xl p-8 text-center"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <p className="text-[15px] font-semibold text-signal-text mb-2">Alertas de demanda</p>
          <p className="text-[13px] text-signal-text-muted mb-5 max-w-xs mx-auto">
            Con Starter recibís notificaciones automáticas cuando aparezcan demandas compatibles con tu perfil.
          </p>
          <Link href="/entrepreneur/pricing"
                className="inline-block text-white font-semibold text-[13px] px-5 py-2.5 rounded-xl
                           hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#5F6F52' }}>
            Ver planes
          </Link>
        </div>
      )}

      {/* Rule limit bar */}
      {canCreateRules && ruleLimit > 0 && (
        <div className="rounded-2xl p-4 mb-6"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-semibold text-signal-text">Reglas activas</p>
            <p className="text-[11px] text-signal-text-muted">{rules.length} / {ruleLimit}</p>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#EAE3D6' }}>
            <div className="h-full rounded-full"
                 style={{
                   width: `${Math.min(100, (rules.length / ruleLimit) * 100)}%`,
                   backgroundColor: '#5F6F52',
                 }} />
          </div>
        </div>
      )}

      {/* Alerts-only (Starter) explanation — no custom rules */}
      {canUseAlerts && !canCreateRules && (
        <div className="rounded-2xl p-5 mb-6"
             style={{ backgroundColor: '#EEF1EA', border: '1px solid rgba(95,111,82,0.2)' }}>
          <p className="text-[13px] font-semibold text-signal-text mb-1">Alertas automáticas activas</p>
          <p className="text-[12px] text-signal-text-muted">
            Signal te notifica basándose en tu inventario y perfil. Con Growth podés crear reglas personalizadas.
          </p>
          <Link href="/entrepreneur/pricing"
                className="inline-block mt-3 text-[11px] font-semibold underline"
                style={{ color: '#5F6F52' }}>
            Ver Growth →
          </Link>
        </div>
      )}

      {/* Empty state */}
      {canCreateRules && rules.length === 0 && (
        <div className="rounded-2xl p-10 text-center"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <p className="text-[14px] font-semibold text-signal-text mb-2">Sin reglas aún</p>
          <p className="text-[12px] text-signal-text-muted mb-5 max-w-xs mx-auto">
            Creá reglas para que Signal te avise cuando aparezcan demandas con keywords específicos, categorías o rangos de precio.
          </p>
          <Link href="/entrepreneur/alerts/new"
                className="inline-block text-white font-semibold text-[13px] px-5 py-2.5 rounded-xl
                           hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#5F6F52' }}>
            Crear primera regla
          </Link>
        </div>
      )}

      {/* Rule list */}
      {rules.length > 0 && (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id}
                 className="rounded-2xl p-4"
                 style={{
                   backgroundColor: rule.is_active ? '#FFFDF8' : '#F7F3EA',
                   border: '1px solid #DED6C8',
                   opacity: rule.is_active ? 1 : 0.65,
                 }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {!rule.is_active && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#EAE3D6', color: '#A7A196' }}>
                        Inactiva
                      </span>
                    )}
                    <span className="text-[10px] text-signal-ash ml-auto">{timeAgo(rule.created_at)}</span>
                  </div>
                  <p className="text-[14px] font-semibold text-signal-text">{rule.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[15px] font-bold text-signal-text">{rule.match_count}</p>
                  <p className="text-[10px] text-signal-text-muted">matches</p>
                </div>
              </div>

              {rule.keywords?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {rule.keywords.slice(0, 5).map((kw, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(95,111,82,0.1)', color: '#5F6F52' }}>
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {rule.category_names?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {rule.category_names.map((cat, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: '#F1ECE2', color: '#7A7468' }}>
                      {cat}
                    </span>
                  ))}
                </div>
              )}

              <AlertActions ruleId={rule.id} isActive={rule.is_active} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
