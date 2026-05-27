import { ElementalGradient } from '@/components/ui/elemental-gradient'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireEntrepreneurAccess } from '@/lib/entitlements/feature-gate'
import { hasFeature } from '@/lib/entitlements/entrepreneur-plans'
import { query } from '@/db'
import { fmtCurrency } from '@/lib/utils'

export default async function MarketPulsePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const ent  = await requireEntrepreneurAccess(session.user.id)
  const plan = ent.plan
  const hasLite = hasFeature(plan, 'market_pulse_lite')
  const hasPro  = hasFeature(plan, 'market_pulse_pro')

  if (!hasLite) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto"
             style={{ backgroundColor: '#EEF1EA', border: '1px solid rgba(95,111,82,0.2)' }}>
          <svg className="w-6 h-6" style={{ color: '#5F6F52' }} fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-[20px] font-bold text-signal-text mb-2" style={{ letterSpacing: '-0.02em' }}>
          Market Pulse
        </h2>
        <p className="text-[14px] text-signal-text-muted mb-6 max-w-xs mx-auto">
          Con Starter accedés a las tendencias de demanda de tu mercado en tiempo real.
        </p>
        <Link href="/entrepreneur/pricing"
              className="inline-block text-white font-semibold text-[13px] px-6 py-3 rounded-xl
                         hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#5F6F52' }}>
          Ver planes y precios
        </Link>
      </div>
    )
  }

  // Top categories by demand volume
  const topCategories = await query<{
    name: string; demand_count: number; avg_budget: number | null; currency: string
    immediate_count: number; high_count: number
  }>(`
    SELECT c.name,
           COUNT(d.id)::int AS demand_count,
           AVG(d.budget_max)::numeric(12,2) AS avg_budget,
           'GTQ' AS currency,
           COUNT(*) FILTER (WHERE d.urgency = 'immediate')::int AS immediate_count,
           COUNT(*) FILTER (WHERE d.urgency = 'high')::int       AS high_count
    FROM app.demands d
    JOIN app.categories c ON c.id = d.category_id
    WHERE d.status = 'open'
      AND d.created_at >= now() - interval '30 days'
    GROUP BY c.name
    ORDER BY demand_count DESC
    LIMIT 10
  `, [])

  // Recent high-urgency demands (no personal buyer info)
  const urgentDemands = await query<{
    id: string; title: string; category: string
    budget_min: number | null; budget_max: number | null; currency: string
    urgency: string; zone: string | null; municipality: string | null
    created_at: string
  }>(`
    SELECT d.id, d.title, c.name AS category,
           d.budget_min, d.budget_max, d.currency, d.urgency,
           az.name AS zone, am.name AS municipality,
           d.created_at::text
    FROM app.demands d
    JOIN app.categories c ON c.id = d.category_id
    LEFT JOIN app.zones az ON az.id = d.zone_id
    LEFT JOIN app.municipalities am ON am.id = az.municipality_id
    WHERE d.status = 'open'
      AND d.urgency IN ('immediate', 'high')
    ORDER BY d.created_at DESC
    LIMIT ${hasPro ? 20 : 5}
  `, [])

  // Weekly trend (last 4 weeks)
  const weeklyTrend = await query<{ week: string; count: number }>(`
    SELECT to_char(date_trunc('week', created_at), 'Mon DD') AS week,
           COUNT(*)::int AS count
    FROM app.demands
    WHERE status IN ('open', 'in_progress')
      AND created_at >= now() - interval '4 weeks'
    GROUP BY date_trunc('week', created_at)
    ORDER BY date_trunc('week', created_at)
  `, [])

  const maxWeekCount = Math.max(...weeklyTrend.map(w => w.count), 1)

  const URGENCY_COLOR: Record<string, string> = {
    immediate: '#B8795B', high: '#B8946F', medium: '#A8B39A', low: '#DED6C8',
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 pb-28">
      <div className="relative rounded-2xl overflow-hidden mb-6 h-28">
        <ElementalGradient />
        <div className="absolute inset-0 bg-black/45 flex flex-col justify-end px-5 pb-4">
          <h1 className="text-[22px] font-bold text-white" style={{ letterSpacing: '-0.025em' }}>Market Pulse</h1>
          <p className="text-[12px] text-white/55 mt-0.5">Tendencias de demanda · últimos 30 días</p>
        </div>
      </div>

      {/* Weekly bar chart */}
      <div className="rounded-2xl p-5 mb-6"
           style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#A7A196' }}>
          Demandas por semana
        </p>
        <div className="flex items-end gap-2 h-20">
          {weeklyTrend.map(w => (
            <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-lg transition-all"
                   style={{
                     height: `${Math.round((w.count / maxWeekCount) * 72)}px`,
                     backgroundColor: '#5F6F52',
                     opacity: 0.8,
                   }} />
              <span className="text-[9px] text-signal-ash">{w.week}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top categories */}
      <div className="rounded-2xl p-5 mb-6"
           style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#A7A196' }}>
          Categorías más demandadas
        </p>
        <div className="space-y-3">
          {topCategories.map((cat, i) => (
            <div key={cat.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-semibold text-signal-text">{cat.name}</span>
                <div className="flex items-center gap-3">
                  {cat.avg_budget && (
                    <span className="text-[11px] text-signal-text-muted">
                      ~{fmtCurrency(cat.avg_budget, cat.currency)}
                    </span>
                  )}
                  <span className="text-[12px] font-bold text-signal-text">{cat.demand_count}</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#EAE3D6' }}>
                <div className="h-full rounded-full"
                     style={{
                       width: `${Math.round((cat.demand_count / topCategories[0].demand_count) * 100)}%`,
                       backgroundColor: i === 0 ? '#5F6F52' : '#A8B39A',
                     }} />
              </div>
              {(cat.immediate_count > 0 || cat.high_count > 0) && (
                <p className="text-[10px] text-signal-text-muted mt-0.5">
                  {cat.immediate_count > 0 && `${cat.immediate_count} inmediata${cat.immediate_count > 1 ? 's' : ''} `}
                  {cat.high_count > 0 && `${cat.high_count} urgente${cat.high_count > 1 ? 's' : ''}`}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Urgent demands */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#A7A196' }}>
            Demandas urgentes activas
          </p>
          {!hasPro && (
            <Link href="/entrepreneur/pricing"
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full text-white"
                  style={{ backgroundColor: '#B8946F' }}>
              Ver todas con Growth
            </Link>
          )}
        </div>
        <div className="space-y-2">
          {urgentDemands.map(d => (
            <Link key={d.id} href={`/demand/${d.id}`} className="block group">
              <div className="rounded-2xl px-4 py-3 transition-all hover:-translate-y-0.5"
                   style={{
                     backgroundColor: '#FFFDF8',
                     border: '1px solid #DED6C8',
                     borderLeft: `3px solid ${URGENCY_COLOR[d.urgency] ?? '#DED6C8'}`,
                   }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-signal-text leading-snug truncate">
                      {d.title}
                    </p>
                    <p className="text-[11px] text-signal-text-muted mt-0.5">
                      {d.category}
                      {(d.municipality || d.zone) && ` · ${[d.municipality, d.zone].filter(Boolean).join(', ')}`}
                    </p>
                  </div>
                  {(d.budget_min || d.budget_max) && (
                    <p className="text-[12px] font-bold text-signal-text shrink-0">
                      {fmtCurrency(d.budget_min ?? d.budget_max!, d.currency)}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
        {!hasPro && urgentDemands.length === 5 && (
          <p className="text-center text-[12px] text-signal-text-muted mt-4">
            Mostrando 5 de muchas.{' '}
            <Link href="/entrepreneur/pricing" className="underline font-semibold" style={{ color: '#5F6F52' }}>
              Actualizá a Growth
            </Link>{' '}
            para ver todas.
          </p>
        )}
      </div>
    </div>
  )
}
