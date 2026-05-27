import { ElementalGradient } from '@/components/ui/elemental-gradient'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireEntrepreneurAccess, getUpgradeMessage } from '@/lib/entitlements/feature-gate'
import { hasFeature, PLAN_DEFINITIONS } from '@/lib/entitlements/entrepreneur-plans'
import { query, queryOne } from '@/db'
import { fmtCurrency, timeAgo } from '@/lib/utils'

export default async function OpportunitiesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const ent  = await requireEntrepreneurAccess(session.user.id)
  const plan = ent.plan
  const canSeeInbox = hasFeature(plan, 'opportunity_inbox')

  if (!canSeeInbox) {
    return <UpgradeGate message={getUpgradeMessage('opportunity_inbox', plan)} />
  }

  const matches = await query<{
    id: string; demand_id: string; demand_title: string; demand_description: string
    match_score: number; match_reasons: string[]; status: string; created_at: string
    category: string; urgency: string
    budget_min: number | null; budget_max: number | null; currency: string
    municipality: string | null; zone: string | null
    inventory_title: string | null; inventory_price: number | null
  }>(`
    SELECT
      m.id, m.demand_id, d.title AS demand_title,
      LEFT(d.description, 160) AS demand_description,
      m.match_score, m.match_reasons, m.status, m.created_at::text,
      c.name AS category, d.urgency,
      d.budget_min, d.budget_max, d.currency,
      am.name AS municipality, az.name AS zone,
      i.title AS inventory_title, i.price AS inventory_price
    FROM entrepreneur.opportunity_matches m
    JOIN app.demands d     ON d.id = m.demand_id
    JOIN app.categories c  ON c.id = d.category_id
    LEFT JOIN app.zones az         ON az.id = d.zone_id
    LEFT JOIN app.municipalities am ON am.id = az.municipality_id
    LEFT JOIN entrepreneur.inventory_items i ON i.id = m.inventory_item_id
    WHERE m.user_id = $1 AND d.status = 'open'
    ORDER BY m.match_score DESC, m.created_at DESC
    LIMIT 50
  `, [session.user.id])

  const newCount = matches.filter(m => m.status === 'new').length

  const URGENCY_COLOR: Record<string, string> = {
    immediate: '#B8795B', high: '#B8946F', medium: '#A8B39A', low: '#DED6C8',
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 pb-28">
      <div className="relative rounded-2xl overflow-hidden mb-6 h-28">
        <ElementalGradient />
        <div className="absolute inset-0 bg-black/45 flex flex-col justify-end px-5 pb-4">
          <h1 className="text-[22px] font-bold text-white" style={{ letterSpacing: '-0.025em' }}>Oportunidades</h1>
          <p className="text-[12px] text-white/55 mt-0.5">Demandas compatibles con lo que ofrecés.</p>
        </div>
      </div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div />
        {newCount > 0 && (
          <span className="mt-1 px-3 py-1 rounded-full text-[12px] font-bold text-white"
                style={{ backgroundColor: '#B8795B' }}>
            {newCount} nuevas
          </span>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="rounded-2xl p-10 text-center"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <p className="text-[15px] font-semibold text-signal-text mb-2">Sin oportunidades aún</p>
          <p className="text-[13px] text-signal-text-muted max-w-sm mx-auto mb-6">
            Cuando aparezcan demandas compatibles con tu perfil e inventario, aparecerán aquí.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/entrepreneur/inventory"
                  className="text-[13px] font-semibold px-4 py-2 rounded-xl text-white
                             hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#5F6F52' }}>
              Agregar inventario
            </Link>
            <Link href="/"
                  className="text-[13px] font-semibold px-4 py-2 rounded-xl transition-colors
                             text-signal-text-soft hover:text-signal-text"
                  style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}>
              Ver demandas
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3 stagger">
          {matches.map(m => {
            const reasons = Array.isArray(m.match_reasons) ? m.match_reasons : []
            const budget = m.budget_min || m.budget_max
              ? m.budget_min && m.budget_max
                ? `${fmtCurrency(m.budget_min, m.currency)} – ${fmtCurrency(m.budget_max, m.currency)}`
                : fmtCurrency((m.budget_min ?? m.budget_max)!, m.currency)
              : null

            return (
              <div key={m.id}
                   className="interactive-card rounded-2xl overflow-hidden"
                   style={{
                     backgroundColor: '#FFFDF8',
                     border: '1px solid #DED6C8',
                     boxShadow: '0 2px 8px rgba(46,42,36,0.05)',
                   }}>
                <div className="px-5 pt-4 pb-3"
                     style={{ borderLeft: `3px solid ${URGENCY_COLOR[m.urgency] ?? '#DED6C8'}` }}>
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: '#F1ECE2', color: '#7A7468' }}>
                          {m.category}
                        </span>
                        {m.status === 'new' && (
                          <span className="flex items-center gap-1 text-[10px] font-bold"
                                style={{ color: '#5F6F52' }}>
                            <span className="w-1.5 h-1.5 rounded-full animate-bounce-dot"
                                  style={{ backgroundColor: '#5F6F52' }} />
                            Nueva
                          </span>
                        )}
                        <span className="text-[10px] text-signal-ash ml-auto">{timeAgo(m.created_at)}</span>
                      </div>
                      <h3 className="text-[15px] font-semibold text-signal-text leading-snug">
                        {m.demand_title}
                      </h3>
                    </div>

                    {/* Score */}
                    <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0"
                         style={{
                           backgroundColor: m.match_score >= 70 ? '#EEF1EA' : m.match_score >= 50 ? '#F5EDE2' : '#F1ECE2',
                           border: '1px solid #DED6C8',
                         }}>
                      <span className="text-[15px] font-bold leading-none"
                            style={{ color: m.match_score >= 70 ? '#5F6F52' : m.match_score >= 50 ? '#B8946F' : '#A7A196' }}>
                        {m.match_score}
                      </span>
                      <span className="text-[8px] font-semibold" style={{ color: '#A7A196' }}>match</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[12px] text-signal-text-soft leading-relaxed mb-3">
                    {m.demand_description}{m.demand_description?.length === 160 ? '…' : ''}
                  </p>

                  {/* Match reasons */}
                  {reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {reasons.slice(0, 3).map((r, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: 'rgba(95,111,82,0.1)', color: '#5F6F52' }}>
                          ✓ {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3"
                       style={{ borderTop: '1px solid #EAE3D6' }}>
                    <div className="flex items-center gap-3 flex-wrap">
                      {(m.municipality || m.zone) && (
                        <span className="text-[11px] text-signal-text-muted">
                          📍 {[m.municipality, m.zone].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {budget && (
                        <span className="text-[13px] font-bold text-signal-text">{budget}</span>
                      )}
                      {m.inventory_title && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: '#F5EDE2', color: '#B8946F' }}>
                          Tu item: {m.inventory_title}
                        </span>
                      )}
                    </div>
                    <Link href={`/demand/${m.demand_id}`}
                          className="text-[12px] font-semibold px-3 py-1.5 rounded-xl text-white
                                     hover:opacity-90 transition-opacity shrink-0"
                          style={{ backgroundColor: '#4D4A43' }}>
                      Ver demanda →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function UpgradeGate({ message }: { message: string }) {
  return (
    <div className="max-w-2xl mx-auto px-5 py-16 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto"
           style={{ backgroundColor: '#EEF1EA', border: '1px solid rgba(95,111,82,0.2)' }}>
        <svg className="w-6 h-6" style={{ color: '#5F6F52' }} fill="none" viewBox="0 0 24 24"
             stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h2 className="text-[20px] font-bold text-signal-text mb-2" style={{ letterSpacing: '-0.02em' }}>
        Opportunity Inbox
      </h2>
      <p className="text-[14px] text-signal-text-muted mb-6 max-w-xs mx-auto">{message}</p>
      <Link href="/entrepreneur/pricing"
            className="inline-block text-white font-semibold text-[13px] px-6 py-3 rounded-xl
                       hover:opacity-90 transition-opacity shadow-button"
            style={{ backgroundColor: '#5F6F52' }}>
        Ver planes y precios
      </Link>
    </div>
  )
}
