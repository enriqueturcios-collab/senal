export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEntrepreneurSession } from '@/lib/entitlements/feature-gate'
import { PLAN_DEFINITIONS, PLAN_ORDER, hasFeature, type EntrepreneurPlan } from '@/lib/entitlements/entrepreneur-plans'
import { ElementalGradient } from '@/components/ui/elemental-gradient'

const FEATURE_ROWS = [
  { label: 'Respuestas de oferta / mes',     key: 'monthly_offer_responses', isLimit: true },
  { label: 'Items de inventario',            key: 'inventory_items',         isLimit: true },
  { label: 'Reglas de alerta',               key: 'alert_rules',             isLimit: true },
  { label: 'Miembros de equipo',             key: 'team_members',            isLimit: true },
  { label: 'Opportunity Inbox',              key: 'opportunity_inbox',        isFeature: true },
  { label: 'Alertas de demanda',             key: 'demand_alerts',            isFeature: true },
  { label: 'Gestor de inventario',           key: 'inventory_manager',        isFeature: true },
  { label: 'Importar CSV',                   key: 'inventory_csv_import',     isFeature: true },
  { label: 'Market Pulse básico',            key: 'market_pulse_lite',        isFeature: true },
  { label: 'Market Pulse Pro',              key: 'market_pulse_pro',         isFeature: true },
  { label: 'Market Pulse avanzado',         key: 'market_pulse_advanced',    isFeature: true },
  { label: 'Analítica propia',               key: 'own_analytics_basic',      isFeature: true },
  { label: 'Analítica avanzada + exportar',  key: 'own_analytics_advanced',   isFeature: true },
  { label: 'Asistente de fulfillment',       key: 'fulfillment_assistant',    isFeature: true },
  { label: 'Borrador de oferta automático',  key: 'offer_auto_draft',          isFeature: true },
] as const

export default async function PricingPage() {
  const session  = await getServerSession(authOptions)
  const ent      = session ? await getEntrepreneurSession(session.user.id) : null
  const currentPlan = ent?.plan ?? null

  const HIGHLIGHT: EntrepreneurPlan = 'growth'

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F3EA' }}>
      <div className="max-w-4xl mx-auto px-5 py-12 pb-20">

        {/* Gradient hero */}
        <div className="relative rounded-3xl overflow-hidden mb-10 h-52">
          <ElementalGradient />
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center px-6">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <span className="text-[20px] font-bold tracking-[-0.03em] text-white">signal</span>
            </Link>
            <h1 className="text-[28px] font-bold text-white mb-2" style={{ letterSpacing: '-0.025em' }}>
              Signal Entrepreneur
            </h1>
            <p className="text-[14px] max-w-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Convertí la demanda de mercado en ventas reales. Elegí el plan que se adapta a tu negocio.
            </p>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {PLAN_ORDER.map(plan => {
            const def = PLAN_DEFINITIONS[plan]
            const isCurrent  = currentPlan === plan
            const isHighlight = plan === HIGHLIGHT

            return (
              <div key={plan}
                   className="rounded-2xl p-5 flex flex-col"
                   style={{
                     backgroundColor: isHighlight ? '#4D4A43' : '#FFFDF8',
                     border: isHighlight ? 'none' : '1px solid #DED6C8',
                     boxShadow: isHighlight ? '0 4px 24px rgba(46,42,36,0.18)' : '0 1px 4px rgba(46,42,36,0.04)',
                   }}>
                {isHighlight && (
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-3"
                     style={{ color: '#B8946F' }}>
                    Más popular
                  </p>
                )}
                <p className="text-[15px] font-bold mb-1"
                   style={{ color: isHighlight ? '#fff' : '#2E2A24' }}>
                  {def.name}
                </p>
                <p className="text-[26px] font-bold mb-1" style={{
                  color: isHighlight ? '#fff' : '#2E2A24',
                  letterSpacing: '-0.04em'
                }}>
                  {def.monthly_price_cents === 0 ? 'Gratis' : `Q${def.monthly_price_cents / 100}`}
                  {def.monthly_price_cents > 0 && (
                    <span className="text-[13px] font-normal" style={{ color: isHighlight ? 'rgba(255,255,255,0.5)' : '#A7A196' }}>
                      /mes
                    </span>
                  )}
                </p>
                <p className="text-[12px] mb-5 leading-relaxed"
                   style={{ color: isHighlight ? 'rgba(255,255,255,0.65)' : '#7A7468' }}>
                  {def.description}
                </p>

                <div className="mt-auto">
                  {isCurrent ? (
                    <div className="w-full py-2.5 rounded-xl text-center text-[12px] font-semibold"
                         style={{ backgroundColor: isHighlight ? 'rgba(255,255,255,0.15)' : '#EEF1EA',
                                  color: isHighlight ? '#fff' : '#5F6F52' }}>
                      Plan actual
                    </div>
                  ) : (
                    <Link href={session ? `/entrepreneur/subscription?upgrade=${plan}` : '/login?callbackUrl=/entrepreneur/pricing'}
                          className="block w-full py-2.5 rounded-xl text-center text-[12px] font-semibold
                                     hover:opacity-90 transition-opacity"
                          style={{
                            backgroundColor: isHighlight ? '#5F6F52' : '#F1ECE2',
                            border: isHighlight ? 'none' : '1px solid #DED6C8',
                            color: isHighlight ? '#fff' : '#4D4A43',
                          }}>
                      {def.monthly_price_cents === 0 ? 'Empezar gratis' : 'Activar plan'}
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Feature comparison table */}
        <div className="rounded-2xl overflow-hidden"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <div className="grid grid-cols-5 gap-0">
            {/* Header row */}
            <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider"
                 style={{ color: '#A7A196', borderBottom: '1px solid #DED6C8' }}>
              Función
            </div>
            {PLAN_ORDER.map(plan => (
              <div key={plan}
                   className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider"
                   style={{
                     color: currentPlan === plan ? '#5F6F52' : '#A7A196',
                     borderBottom: '1px solid #DED6C8',
                     borderLeft: '1px solid #EAE3D6',
                   }}>
                {PLAN_DEFINITIONS[plan].name.replace('Entrepreneur ', '').replace('Marketplace ', '')}
                {currentPlan === plan && (
                  <span className="block text-[9px] mt-0.5 font-normal" style={{ color: '#5F6F52' }}>actual</span>
                )}
              </div>
            ))}

            {/* Feature rows */}
            {FEATURE_ROWS.map((row, rowIdx) => {
              const isOdd = rowIdx % 2 === 0
              return (
                <>
                  <div key={`label-${row.key}`}
                       className="px-4 py-3 text-[12px] text-signal-text"
                       style={{ backgroundColor: isOdd ? '#FFFDF8' : '#F7F3EA', borderBottom: '1px solid #EAE3D6' }}>
                    {row.label}
                  </div>
                  {PLAN_ORDER.map(plan => {
                    const def = PLAN_DEFINITIONS[plan]
                    let content: React.ReactNode

                    if ('isLimit' in row && row.isLimit) {
                      const val = def.limits[row.key as keyof typeof def.limits]
                      content = val === 0
                        ? <span style={{ color: '#DED6C8' }}>—</span>
                        : <span className="font-semibold" style={{ color: '#5F6F52' }}>{val === 500 || val === 2000 ? val.toLocaleString() : val}</span>
                    } else {
                      const has = hasFeature(plan, row.key as any)
                      content = has
                        ? <span className="text-[14px]" style={{ color: '#5F6F52' }}>✓</span>
                        : <span className="text-[12px]" style={{ color: '#DED6C8' }}>—</span>
                    }

                    return (
                      <div key={`${row.key}-${plan}`}
                           className="px-3 py-3 text-center text-[12px]"
                           style={{
                             backgroundColor: isOdd ? '#FFFDF8' : '#F7F3EA',
                             borderBottom: '1px solid #EAE3D6',
                             borderLeft: '1px solid #EAE3D6',
                           }}>
                        {content}
                      </div>
                    )
                  })}
                </>
              )
            })}
          </div>
        </div>

        {/* Fine print */}
        <p className="text-center text-[11px] text-signal-text-muted mt-6">
          Todos los precios en quetzales (GTQ) · IVA incluido · Cancelá cuando quieras
        </p>
        <p className="text-center text-[11px] mt-2" style={{ color: '#A7A196' }}>
          Signal Entrepreneur no da acceso a herramientas institucionales (análisis bancario, reportes de cartera, etc.)
        </p>
      </div>
    </div>
  )
}
