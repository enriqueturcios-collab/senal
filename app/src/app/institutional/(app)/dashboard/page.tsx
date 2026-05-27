import Link from 'next/link'
import { getInstitutionalSession } from '@/lib/institutional-auth'
import {
  getInstitutionalOverview, getMarketIndices,
  getDemandAggregates, logInstitutionalAccess,
} from '@/lib/institutional-data'
import {
  MetricCard, ConfidenceBadge, InstitutionalDisclaimer,
  BarChart, IndexGauge,
} from '@/components/institutional/metric-card'

function fmtQ(v: number | null | undefined, fallback = '—') {
  if (v == null) return fallback
  return `Q${Math.round(v).toLocaleString('es-GT')}`
}
function fmtPct(v: number | null | undefined, fallback = '—') {
  if (v == null) return fallback
  return `${(v * 100).toFixed(1)}%`
}

export default async function InstitutionalDashboard() {
  const session = await getInstitutionalSession()
  if (!session) return null

  const [{ kpis, topCats, topZones }, indices, aggregates] = await Promise.all([
    getInstitutionalOverview(),
    getMarketIndices({ periodType: 'month' }),
    getDemandAggregates({ minSample: 1 }),
  ])

  logInstitutionalAccess({
    institutionId: session.iid, userId: session.uid,
    endpoint: '/institutional/dashboard', responseRows: (kpis?.total_demands ?? 0),
  })

  const k = kpis!

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F3EA' }}>
      <div className="max-w-6xl mx-auto px-6 py-8 pb-16">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1"
               style={{ color: '#A7A196' }}>
              Demand Intelligence · Período actual
            </p>
            <h1 className="text-[28px] font-bold text-signal-text"
                style={{ letterSpacing: '-0.025em' }}>
              Market Overview
            </h1>
          </div>
          <Link href="/institutional/credit-use-case"
                className="flex items-center gap-2 text-white text-[13px] font-semibold
                           px-4 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-button"
                style={{ backgroundColor: '#4D4A43' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
            Análisis crediticio
          </Link>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <MetricCard label="Demandas totales" value={k.total_demands.toLocaleString()} />
          <MetricCard label="Demandas activas" value={k.active_demands.toLocaleString()} accent="#5F6F52" />
          <MetricCard label="Insatisfechas" value={k.unmet_demands.toLocaleString()} accent="#B8795B"
            sub="sin ninguna oferta" />
          <MetricCard label="Cerradas" value={k.closed_demands.toLocaleString()} accent="#B8946F" />
          <MetricCard label="Ofertas totales" value={k.total_offers.toLocaleString()} small />
          <MetricCard label="Transacciones" value={k.total_transactions.toLocaleString()} small />
          <MetricCard label="Tasa respuesta" value={fmtPct(k.overall_response_rate)} accent="#5F6F52" small />
          <MetricCard label="Precio mediano" value={fmtQ(k.median_budget)} accent="#B8946F" small />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">

          {/* Category ranking */}
          <div className="rounded-2xl p-6"
               style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', boxShadow: '0 2px 8px rgba(46,42,36,0.04)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[14px] font-bold text-signal-text">Demanda por categoría</h2>
              <span className="text-[11px] text-signal-ash">período actual</span>
            </div>
            <BarChart
              data={topCats.map(c => ({ label: c.category, value: c.count }))}
              color="#5F6F52" height={120}
            />
            <div className="mt-5 space-y-2">
              {topCats.map((cat, i) => (
                <div key={cat.category} className="flex items-center justify-between py-1.5"
                     style={{ borderBottom: i < topCats.length - 1 ? '1px solid #EAE3D6' : 'none' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-signal-ash w-4">{i + 1}</span>
                    <span className="text-[13px] text-signal-text">{cat.category}</span>
                  </div>
                  <span className="text-[13px] font-semibold text-signal-text">{cat.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Zone heatmap */}
          <div className="rounded-2xl p-6"
               style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', boxShadow: '0 2px 8px rgba(46,42,36,0.04)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[14px] font-bold text-signal-text">Demanda por zona</h2>
              <span className="text-[11px] text-signal-ash">activas + cerradas</span>
            </div>
            <div className="space-y-2">
              {topZones.length === 0 && (
                <p className="text-[13px] text-signal-ash py-4 text-center">Sin datos de zona suficientes.</p>
              )}
              {topZones.map((z, i) => {
                const max = topZones[0]?.count ?? 1
                const pct = (z.count / max) * 100
                return (
                  <div key={`${z.zone}-${z.municipality}`} className="flex items-center gap-3">
                    <span className="text-[11px] text-signal-ash w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] text-signal-text truncate">{z.zone}, {z.municipality}</span>
                        <span className="text-[12px] font-semibold text-signal-text shrink-0 ml-2">{z.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ backgroundColor: '#EAE3D6' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: '#5F6F52' }} />
                      </div>
                    </div>
                    {z.unmet > 0 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ backgroundColor: 'rgba(184,121,91,0.12)', color: '#B8795B' }}>
                        {z.unmet} ins.
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Market indices */}
        {indices.length > 0 && (
          <div className="rounded-2xl p-6 mb-8"
               style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', boxShadow: '0 2px 8px rgba(46,42,36,0.04)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[14px] font-bold text-signal-text">Índices de mercado</h2>
              <ConfidenceBadge level="medium" />
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {indices.slice(0, 4).map(idx => (
                <div key={`${idx.category_id}-${idx.zone_id}`}
                     className="p-4 rounded-xl space-y-3"
                     style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-semibold text-signal-text">{idx.category}</p>
                      <p className="text-[11px] text-signal-ash">{idx.zone}</p>
                    </div>
                    <ConfidenceBadge level={idx.data_confidence} />
                  </div>

                  <div className="space-y-2">
                    {idx.demand_activity_index != null && (
                      <IndexGauge value={idx.demand_activity_index} label="Actividad de demanda" color="#5F6F52" />
                    )}
                    {idx.unmet_demand_index != null && (
                      <IndexGauge value={idx.unmet_demand_index} label="Demanda insatisfecha" color="#B8795B" />
                    )}
                    {idx.market_opportunity_score != null && (
                      <IndexGauge value={idx.market_opportunity_score} label="Market Opportunity Score" color="#B8946F" />
                    )}
                  </div>

                  {idx.price_acceptance_p50 != null && (
                    <div className="pt-2" style={{ borderTop: '1px solid #DED6C8' }}>
                      <p className="text-[11px] text-signal-ash mb-1">Rango de precio aceptado</p>
                      <p className="text-[13px] font-semibold text-signal-text">
                        {fmtQ(idx.price_acceptance_p10)} – {fmtQ(idx.price_acceptance_p90)}
                        <span className="text-signal-ash font-normal ml-1">(med. {fmtQ(idx.price_acceptance_p50)})</span>
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aggregate table */}
        {aggregates.length > 0 && (
          <div className="rounded-2xl p-6 mb-8 overflow-x-auto"
               style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', boxShadow: '0 2px 8px rgba(46,42,36,0.04)' }}>
            <h2 className="text-[14px] font-bold text-signal-text mb-5">
              Detalle por zona y categoría
            </h2>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ borderBottom: '1px solid #EAE3D6' }}>
                  {['Categoría','Zona','Señales','P25','Mediana','P75','Resp. %','Cierre %','Insatisfecha %'].map(h => (
                    <th key={h} className="text-left py-2 pr-4 text-signal-ash font-semibold uppercase tracking-wider text-[10px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aggregates.slice(0, 15).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1ECE2' }}>
                    <td className="py-2.5 pr-4 text-signal-text font-medium">{row.category}</td>
                    <td className="py-2.5 pr-4 text-signal-text-soft">{row.zone}</td>
                    <td className="py-2.5 pr-4 font-semibold text-signal-text">{row.demand_count ?? '—'}</td>
                    <td className="py-2.5 pr-4 text-signal-text-soft">{fmtQ(row.budget_p25)}</td>
                    <td className="py-2.5 pr-4 font-semibold" style={{ color: '#5F6F52' }}>{fmtQ(row.budget_p50)}</td>
                    <td className="py-2.5 pr-4 text-signal-text-soft">{fmtQ(row.budget_p75)}</td>
                    <td className="py-2.5 pr-4 text-signal-text-soft">
                      {row.avg_offers_per_demand != null
                        ? `${(Math.min(row.avg_offers_per_demand / 3, 1) * 100).toFixed(0)}%`
                        : '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      {row.transaction_rate != null ? (
                        <span className="font-semibold"
                              style={{ color: row.transaction_rate > 0.3 ? '#5F6F52' : '#B8795B' }}>
                          {fmtPct(row.transaction_rate)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2.5">
                      {row.unmet_demand_rate != null ? (
                        <span className="font-semibold"
                              style={{ color: row.unmet_demand_rate > 0.4 ? '#B8795B' : '#5F6F52' }}>
                          {fmtPct(row.unmet_demand_rate)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <InstitutionalDisclaimer />
      </div>
    </div>
  )
}
