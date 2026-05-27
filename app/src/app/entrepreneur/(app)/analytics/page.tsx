import { ElementalGradient } from '@/components/ui/elemental-gradient'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireEntrepreneurAccess } from '@/lib/entitlements/feature-gate'
import { hasFeature } from '@/lib/entitlements/entrepreneur-plans'
import { query, queryOne } from '@/db'
import { fmtCurrency } from '@/lib/utils'

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const ent  = await requireEntrepreneurAccess(session.user.id)
  const plan = ent.plan
  const hasBasic    = hasFeature(plan, 'own_analytics_basic')
  const hasAdvanced = hasFeature(plan, 'own_analytics_advanced')

  if (!hasBasic) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto"
             style={{ backgroundColor: '#EEF1EA', border: '1px solid rgba(95,111,82,0.2)' }}>
          <svg className="w-6 h-6" style={{ color: '#5F6F52' }} fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-[20px] font-bold text-signal-text mb-2" style={{ letterSpacing: '-0.02em' }}>
          Mi Analítica
        </h2>
        <p className="text-[14px] text-signal-text-muted mb-6 max-w-xs mx-auto">
          Con Starter accedés a métricas de tu actividad: matches, respuestas, y rendimiento por categoría.
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

  // Core stats
  const totals = await queryOne<{
    total_matches: number; new_matches: number; viewed_matches: number
    offers_sent: number; offers_this_month: number
  }>(`
    SELECT
      COUNT(*)                                        AS total_matches,
      COUNT(*) FILTER (WHERE status = 'new')          AS new_matches,
      COUNT(*) FILTER (WHERE status = 'viewed')       AS viewed_matches,
      COUNT(*) FILTER (WHERE status = 'responded')    AS offers_sent,
      COUNT(*) FILTER (
        WHERE status = 'responded'
        AND created_at >= date_trunc('month', now())
      )                                               AS offers_this_month
    FROM entrepreneur.opportunity_matches
    WHERE user_id = $1
  `, [session.user.id])

  const t = totals ?? { total_matches: 0, new_matches: 0, viewed_matches: 0, offers_sent: 0, offers_this_month: 0 }

  // Top matched categories
  const byCategory = await query<{
    category: string; matches: number; responded: number
  }>(`
    SELECT c.name AS category,
           COUNT(m.id)::int                                  AS matches,
           COUNT(m.id) FILTER (WHERE m.status = 'responded')::int AS responded
    FROM entrepreneur.opportunity_matches m
    JOIN app.demands d ON d.id = m.demand_id
    JOIN app.categories c ON c.id = d.category_id
    WHERE m.user_id = $1
    GROUP BY c.name
    ORDER BY matches DESC
    LIMIT 5
  `, [session.user.id])

  // Monthly activity (last 4 months)
  const monthly = await query<{ month: string; matches: number; responses: number }>(`
    SELECT to_char(date_trunc('month', created_at), 'Mon') AS month,
           COUNT(*)::int AS matches,
           COUNT(*) FILTER (WHERE status = 'responded')::int AS responses
    FROM entrepreneur.opportunity_matches
    WHERE user_id = $1
      AND created_at >= now() - interval '4 months'
    GROUP BY date_trunc('month', created_at)
    ORDER BY date_trunc('month', created_at)
  `, [session.user.id])

  // Best scoring matches
  const topMatches = hasAdvanced ? await query<{
    demand_title: string; match_score: number; category: string; status: string
    budget_max: number | null; currency: string
  }>(`
    SELECT d.title AS demand_title, m.match_score, c.name AS category, m.status,
           d.budget_max, d.currency
    FROM entrepreneur.opportunity_matches m
    JOIN app.demands d ON d.id = m.demand_id
    JOIN app.categories c ON c.id = d.category_id
    WHERE m.user_id = $1
    ORDER BY m.match_score DESC
    LIMIT 5
  `, [session.user.id]) : []

  const responseRate = t.total_matches > 0
    ? Math.round((t.offers_sent / t.total_matches) * 100)
    : 0

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 pb-28">
      <div className="relative rounded-2xl overflow-hidden mb-6 h-28">
        <ElementalGradient />
        <div className="absolute inset-0 bg-black/45 flex flex-col justify-end px-5 pb-4">
          <h1 className="text-[22px] font-bold text-white" style={{ letterSpacing: '-0.025em' }}>Mi Analítica</h1>
          <p className="text-[12px] text-white/55 mt-0.5">Tu actividad en Signal Entrepreneur</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <AnalyticCard value={t.total_matches} label="Total matches" color="#5F6F52" />
        <AnalyticCard value={t.new_matches}   label="Sin revisar"   color="#B8795B" />
        <AnalyticCard value={t.offers_sent}   label="Respuestas enviadas" color="#B8946F" />
        <AnalyticCard value={`${responseRate}%`} label="Tasa de respuesta" color="#4D4A43" />
      </div>

      {/* Monthly chart */}
      {monthly.length > 0 && (
        <div className="rounded-2xl p-5 mb-6"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#A7A196' }}>
            Actividad mensual
          </p>
          <div className="flex items-end gap-3 h-20">
            {monthly.map(m => {
              const maxMatches = Math.max(...monthly.map(x => x.matches), 1)
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col-reverse gap-0.5">
                    <div className="w-full rounded-t-sm"
                         style={{
                           height: `${Math.round((m.matches / maxMatches) * 56)}px`,
                           backgroundColor: '#A8B39A',
                         }} />
                    {m.responses > 0 && (
                      <div className="w-full rounded-t-sm"
                           style={{
                             height: `${Math.round((m.responses / maxMatches) * 56)}px`,
                             backgroundColor: '#5F6F52',
                             marginBottom: '2px',
                           }} />
                    )}
                  </div>
                  <span className="text-[9px] text-signal-ash">{m.month}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-[10px] text-signal-text-muted">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: '#A8B39A' }} />
              Matches
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-signal-text-muted">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: '#5F6F52' }} />
              Respuestas
            </span>
          </div>
        </div>
      )}

      {/* By category */}
      {byCategory.length > 0 && (
        <div className="rounded-2xl p-5 mb-6"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#A7A196' }}>
            Por categoría
          </p>
          <div className="space-y-3">
            {byCategory.map(cat => (
              <div key={cat.category} className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-signal-text">{cat.category}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-signal-text-muted">{cat.matches} matches</span>
                  {cat.responded > 0 && (
                    <span className="text-[11px] font-semibold" style={{ color: '#5F6F52' }}>
                      {cat.responded} resp.
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top matches — advanced only */}
      {hasAdvanced && topMatches.length > 0 && (
        <div className="rounded-2xl p-5"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#A7A196' }}>
            Mejores matches
          </p>
          <div className="space-y-2">
            {topMatches.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                     style={{ backgroundColor: '#EEF1EA', border: '1px solid #DED6C8' }}>
                  <span className="text-[13px] font-bold" style={{ color: '#5F6F52' }}>{m.match_score}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-signal-text truncate">{m.demand_title}</p>
                  <p className="text-[11px] text-signal-text-muted">{m.category}</p>
                </div>
                {m.budget_max && (
                  <span className="text-[11px] font-semibold text-signal-text shrink-0">
                    {fmtCurrency(m.budget_max, m.currency)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upgrade nudge */}
      {!hasAdvanced && (
        <div className="rounded-2xl p-5 mt-4 text-center"
             style={{ backgroundColor: '#F7F3EA', border: '1px solid #DED6C8' }}>
          <p className="text-[13px] font-semibold text-signal-text mb-1">Analytics avanzado</p>
          <p className="text-[12px] text-signal-text-muted mb-3">
            Con Growth accedés a análisis detallado: mejores matches, tendencias, exportación de datos.
          </p>
          <Link href="/entrepreneur/pricing"
                className="inline-block text-white font-semibold text-[12px] px-4 py-2 rounded-xl
                           hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#5F6F52' }}>
            Ver Growth →
          </Link>
        </div>
      )}
    </div>
  )
}

function AnalyticCard({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div className="rounded-2xl p-4"
         style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
      <span className="text-[24px] font-bold leading-none block mb-1"
            style={{ color, letterSpacing: '-0.04em' }}>
        {value}
      </span>
      <p className="text-[10px] text-signal-text-muted leading-tight">{label}</p>
    </div>
  )
}
