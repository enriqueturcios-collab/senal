import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Header } from '@/components/layout/header'
import { IndexGauge } from '@/components/charts/index-gauge'
import { getMarketLookup, getCategories, getZones } from '@/lib/data'
import { fmtScore, fmtPct, fmtGrowth, scoreBg, confidenceBadge, periodLabel } from '@/lib/utils'
import { LookupForm } from './lookup-form'

export const metadata: Metadata = { title: 'Consulta de Mercado' }

interface Props {
  searchParams: { category_id?: string; zone_id?: string }
}

export default async function LookupPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions)
  const [categories, zones] = await Promise.all([getCategories(), getZones()])

  const categoryId = searchParams.category_id ? parseInt(searchParams.category_id) : null
  const zoneId     = searchParams.zone_id     ? parseInt(searchParams.zone_id)     : null

  const result = categoryId && zoneId
    ? await getMarketLookup(categoryId, zoneId, session!.user.historicalMonthsAccess)
    : null

  const { current, history, aggregates } = result ?? { current: null, history: [], aggregates: null }

  return (
    <>
      <Header
        title="Consulta de Mercado"
        subtitle="Evalúa la demanda real de un sector y zona específicos"
      />

      <main className="flex-1 p-8 space-y-6">

        {/* Formulario de búsqueda */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Selecciona categoría y zona</h2>
          <LookupForm categories={categories} zones={zones} />
          <p className="text-xs text-slate-400 mt-3">
            Caso de uso típico: un emprendedor solicita crédito para abrir un negocio.
            Consulta si existe demanda real detrás de ese giro en esa zona.
          </p>
        </div>

        {/* Sin resultados */}
        {categoryId && zoneId && !current && (
          <div className="card p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <p className="text-slate-600 font-medium">Sin datos suficientes</p>
            <p className="text-sm text-slate-400 mt-1">
              Esta combinación de categoría y zona no tiene actividad suficiente para publicar
              índices (umbral mínimo de k-anonimidad no alcanzado).
            </p>
          </div>
        )}

        {/* Resultados */}
        {current && (
          <>
            {/* Header del resultado */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{current.category}</h2>
                <p className="text-slate-500">{current.zone}, {current.municipality} · {current.department}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Período: {periodLabel(current.period_value)} ·
                  Muestra: {current.sample_size ?? '—'} demandas ·{' '}
                  <span className={`badge ${confidenceBadge(current.data_confidence)}`}>
                    Confianza {current.data_confidence}
                  </span>
                </p>
              </div>
              <div className={`badge text-base px-4 py-2 ${scoreBg(current.market_opportunity_score)}`}>
                Score {fmtScore(current.market_opportunity_score)}
              </div>
            </div>

            {/* Gauges de índices */}
            <div className="card p-6">
              <h3 className="font-semibold text-slate-800 mb-6">Índices de mercado</h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-6 justify-items-center">
                <IndexGauge score={current.market_opportunity_score}     label="Oportunidad" />
                <IndexGauge score={current.demand_activity_index}        label="Actividad" />
                <IndexGauge score={current.unmet_demand_index}           label="Insatisfecha" />
                <IndexGauge score={current.category_growth_score != null ? Math.min(Math.max(current.category_growth_score, 0), 100) : null} label="Crecimiento" />
                <IndexGauge score={current.local_demand_strength}        label="Fuerza local" />
                <IndexGauge score={current.offer_response_rate != null ? current.offer_response_rate * 100 : null} label="Tasa oferta" />
                <IndexGauge score={current.transaction_confirmation_rate != null ? current.transaction_confirmation_rate * 100 : null} label="Tasa cierre" />
              </div>
            </div>

            {/* Métricas clave + precios */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              <div className="card p-6 space-y-4">
                <h3 className="font-semibold text-slate-800">Señales clave</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Score de oportunidad',   value: fmtScore(current.market_opportunity_score) + ' / 100' },
                    { label: 'Crecimiento vs anterior', value: fmtGrowth(current.category_growth_score) },
                    { label: 'Demanda insatisfecha',    value: fmtPct(current.unmet_demand_index != null ? current.unmet_demand_index / 100 : null) },
                    { label: 'Tasa de cierre',          value: fmtPct(current.transaction_confirmation_rate) },
                    { label: 'Respuesta de oferentes',  value: fmtPct(current.offer_response_rate) },
                    { label: 'Demandas en muestra',     value: String(aggregates?.demand_count ?? '—') },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-semibold text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-6 space-y-4">
                <h3 className="font-semibold text-slate-800">Rangos de precio aceptado</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Precio bajo (p10)',    value: current.price_acceptance_p10 },
                    { label: 'Precio mediano (p50)', value: current.price_acceptance_p50 },
                    { label: 'Precio alto (p90)',     value: current.price_acceptance_p90 },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">{label}</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {value != null ? `Q${value.toLocaleString('es-GT')}` : '—'}
                        </span>
                      </div>
                      {value != null && current.price_acceptance_p90 != null && (
                        <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full"
                            style={{ width: `${(value / current.price_acceptance_p90) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400">Percentiles del presupuesto máximo que los compradores declaran.</p>
              </div>

              <div className="card p-6 space-y-4">
                <h3 className="font-semibold text-slate-800">Historial reciente</h3>
                <div className="space-y-2">
                  {history.slice(0, 6).map((h) => (
                    <div key={h.period_value} className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">{periodLabel(h.period_value)}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-surface-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-400 rounded-full"
                            style={{ width: `${Math.min((h.market_opportunity_score ?? 0), 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs w-8 text-right text-slate-600">
                          {fmtScore(h.market_opportunity_score)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Disclaimer obligatorio */}
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <p className="text-sm text-amber-800">
                <strong>Nota importante:</strong> Señal provee señales de demanda de mercado como
                información contextual. Los datos aquí presentados no constituyen una recomendación
                de aprobación, rechazo ni calificación crediticia. Todas las decisiones de crédito
                son responsabilidad exclusiva de su institución conforme a sus políticas internas.
              </p>
            </div>
          </>
        )}
      </main>
    </>
  )
}
