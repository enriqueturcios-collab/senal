import { ElementalGradient } from '@/components/ui/elemental-gradient'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireEntrepreneurAccess } from '@/lib/entitlements/feature-gate'
import { PLAN_DEFINITIONS, fmtPlanPrice } from '@/lib/entitlements/entrepreneur-plans'
import { query, queryOne } from '@/db'
import { fmtCurrency, timeAgo } from '@/lib/utils'

export default async function EntrepreneurDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const ent = await requireEntrepreneurAccess(session.user.id)
  const plan = ent.plan
  const def  = PLAN_DEFINITIONS[plan]

  // Stats
  const stats = await queryOne<{
    new_matches: number
    total_matches: number
    inventory_count: number
    alert_rules: number
    offers_sent_month: number
  }>(`
    SELECT
      COUNT(*) FILTER (WHERE m.status = 'new')                                      AS new_matches,
      COUNT(*)                                                                        AS total_matches,
      (SELECT COUNT(*) FROM entrepreneur.inventory_items i WHERE i.user_id = $1 AND i.is_active) AS inventory_count,
      (SELECT COUNT(*) FROM entrepreneur.alert_rules r   WHERE r.user_id = $1 AND r.is_active)   AS alert_rules,
      COALESCE((
        SELECT usage_count FROM entrepreneur.feature_usage
        WHERE user_id = $1 AND feature_key = 'monthly_offer_responses'
          AND period_start = date_trunc('month', now())
      ), 0)::int AS offers_sent_month
    FROM entrepreneur.opportunity_matches m
    WHERE m.user_id = $1
  `, [session.user.id])

  // Recent top matches
  const recentMatches = await query<{
    id: string; demand_id: string; demand_title: string
    match_score: number; status: string; created_at: string
    category: string; budget_min: number | null; budget_max: number | null; currency: string
    urgency: string
  }>(`
    SELECT m.id, m.demand_id, d.title AS demand_title,
           m.match_score, m.status, m.created_at::text,
           c.name AS category,
           d.budget_min, d.budget_max, d.currency, d.urgency
    FROM entrepreneur.opportunity_matches m
    JOIN app.demands d ON d.id = m.demand_id
    JOIN app.categories c ON c.id = d.category_id
    WHERE m.user_id = $1 AND d.status = 'open'
    ORDER BY m.match_score DESC, m.created_at DESC
    LIMIT 5
  `, [session.user.id])

  const s = stats ?? { new_matches: 0, total_matches: 0, inventory_count: 0, alert_rules: 0, offers_sent_month: 0 }
  const offerLimit = def.limits.monthly_offer_responses

  const URGENCY_COLOR: Record<string, string> = {
    immediate: '#B8795B', high: '#B8946F', medium: '#A8B39A', low: '#DED6C8',
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 pb-28">

      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden mb-7 h-28">
        <ElementalGradient />
        <div className="absolute inset-0 bg-black/45 flex flex-col justify-end px-5 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">Signal Entrepreneur</p>
          <h1 className="text-[22px] font-bold text-white" style={{ letterSpacing: '-0.025em' }}>
            {ent.businessName ?? session.user.name ?? 'Mi negocio'}
          </h1>
        </div>
      </div>

      {/* Plan upgrade prompt for free */}
      {plan === 'free' && (
        <Link href="/entrepreneur/pricing" className="block mb-7 group">
          <div className="rounded-2xl p-5 flex items-center justify-between gap-4"
               style={{
                 background: 'linear-gradient(135deg, #4D4A43 0%, #3A3830 100%)',
                 boxShadow: '0 2px 12px rgba(46,42,36,0.18)',
               }}>
            <div>
              <p className="text-white font-bold text-[15px]" style={{ letterSpacing: '-0.01em' }}>
                Activá Signal Entrepreneur
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Recibí alertas, conectá inventario y respondé antes que la competencia.
              </p>
            </div>
            <span className="shrink-0 text-white text-[13px] font-bold px-4 py-2 rounded-xl
                             group-hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#5F6F52' }}>
              Ver planes →
            </span>
          </div>
        </Link>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard value={s.new_matches}        label="Nuevas oportunidades" color="#B8795B" />
        <StatCard value={s.total_matches}      label="Total matches"        color="#5F6F52" />
        <StatCard value={s.inventory_count}    label="Items inventario"     color="#B8946F" />
        <StatCard value={s.offers_sent_month}  label={`Resp. este mes / ${offerLimit}`} color="#4D4A43" />
      </div>

      {/* Offer usage meter */}
      {plan !== 'free' && (
        <div className="rounded-2xl p-4 mb-7"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-semibold text-signal-text">Respuestas este mes</p>
            <p className="text-[12px] text-signal-text-muted">
              {s.offers_sent_month} / {offerLimit}
            </p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#EAE3D6' }}>
            <div className="h-full rounded-full transition-all duration-700"
                 style={{
                   width: `${Math.min(100, (s.offers_sent_month / offerLimit) * 100)}%`,
                   backgroundColor: s.offers_sent_month / offerLimit > 0.8 ? '#B8795B' : '#5F6F52',
                 }} />
          </div>
          {offerLimit > 0 && s.offers_sent_month >= offerLimit && (
            <p className="text-[11px] mt-2" style={{ color: '#B8795B' }}>
              Alcanzaste el límite del mes.{' '}
              <Link href="/entrepreneur/pricing" className="underline font-semibold">Actualizá tu plan</Link>
            </p>
          )}
        </div>
      )}

      {/* Recent matches */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#A7A196' }}>
            Oportunidades recientes
          </p>
          <Link href="/entrepreneur/opportunities"
                className="text-[11px] font-semibold transition-colors"
                style={{ color: '#5F6F52' }}>
            Ver todas →
          </Link>
        </div>

        {recentMatches.length === 0 ? (
          <div className="rounded-2xl p-8 text-center"
               style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
            <p className="text-[14px] font-semibold text-signal-text mb-1">Sin matches aún</p>
            <p className="text-[12px] text-signal-text-muted mb-4 max-w-xs mx-auto">
              Completá tu perfil e inventario para que Signal detecte demandas compatibles.
            </p>
            <Link href="/entrepreneur/inventory"
                  className="inline-flex items-center gap-2 text-white text-[12px] font-semibold
                             px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#5F6F52' }}>
              Agregar inventario
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentMatches.map(m => (
              <Link key={m.id} href={`/entrepreneur/opportunities?focus=${m.id}`} className="block group">
                <div className="interactive-card rounded-2xl px-4 py-3.5 flex items-center gap-3"
                     style={{
                       backgroundColor: '#FFFDF8',
                       border: '1px solid #DED6C8',
                       borderLeft: `3px solid ${URGENCY_COLOR[m.urgency] ?? '#DED6C8'}`,
                     }}>
                  {/* Score badge */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 flex-col"
                       style={{
                         backgroundColor: m.match_score >= 70 ? '#EEF1EA' : '#F1ECE2',
                         border: '1px solid #DED6C8',
                       }}>
                    <span className="text-[13px] font-bold leading-none"
                          style={{ color: m.match_score >= 70 ? '#5F6F52' : '#B8946F' }}>
                      {m.match_score}
                    </span>
                    <span className="text-[8px] font-semibold" style={{ color: '#A7A196' }}>pts</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-signal-text leading-snug truncate">
                      {m.demand_title}
                    </p>
                    <p className="text-[11px] text-signal-text-muted mt-0.5">
                      {m.category} · {timeAgo(m.created_at)}
                    </p>
                  </div>

                  {(m.budget_min || m.budget_max) && (
                    <p className="text-[12px] font-bold text-signal-text shrink-0">
                      {fmtCurrency(m.budget_min ?? m.budget_max!, m.currency)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickLink href="/entrepreneur/inventory" label="Mi inventario" sub="Gestionar productos" />
        <QuickLink href="/entrepreneur/alerts"    label="Alertas"       sub="Reglas de demanda" />
        <QuickLink href="/entrepreneur/market-pulse" label="Market Pulse" sub="Qué pide tu mercado" />
        <QuickLink href="/entrepreneur/analytics" label="Analítica"     sub="Mi desempeño" />
      </div>
    </div>
  )
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-2xl p-4"
         style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8',
                  boxShadow: '0 1px 4px rgba(46,42,36,0.04)' }}>
      <span className="text-[26px] font-bold leading-none block mb-1"
            style={{ color, letterSpacing: '-0.04em' }}>
        {value}
      </span>
      <p className="text-[10px] text-signal-text-muted leading-tight">{label}</p>
    </div>
  )
}

function QuickLink({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <Link href={href} className="block group">
      <div className="interactive-card rounded-2xl p-4"
           style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
        <p className="text-[13px] font-semibold text-signal-text mb-0.5">{label}</p>
        <p className="text-[11px] text-signal-text-muted">{sub}</p>
      </div>
    </Link>
  )
}
