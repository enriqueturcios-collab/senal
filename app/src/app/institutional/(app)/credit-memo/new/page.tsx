import { Suspense } from 'react'
import { getInstitutionalSession } from '@/lib/institutional-auth'
import { logInstitutionalAccess } from '@/lib/institutional-data'
import { query, queryOne } from '@/db'
import {
  calculateDemandCoverageRatio,
  calculateMarketLiquidityScore,
  calculateSaturationIndex,
  calculateConfidenceScore,
  calculateUnmetDemandValue,
} from '@/lib/analytics'
import { mapPurposeToCategories, getCategoryIds } from '@/lib/category-mapper'
import { ConfidenceBadge, InstitutionalDisclaimer, IndexGauge } from '@/components/institutional/metric-card'
import { CreditMemoForm } from './credit-memo-form'

interface PageProps {
  searchParams: {
    q?: string
    department?: string
    municipality?: string
    amount?: string
    payment?: string
    margin?: string
    dscr?: string
    term?: string
    loanType?: string
  }
}

function fmtQ(v: number | null | undefined, decimals = 0) {
  if (v == null) return '—'
  return `Q${v.toLocaleString('es-GT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}
function fmtPct(v: number | null | undefined, decimals = 1) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(decimals)}%`
}
function fmtNum(v: number | null | undefined) {
  if (v == null) return '—'
  return Math.round(v).toLocaleString('es-GT')
}

const LOAN_TYPE_LABELS: Record<string, string> = {
  'capital-de-trabajo': 'Capital de trabajo',
  'inventario': 'Inventario',
  'equipamiento': 'Equipamiento',
  'expansion': 'Expansión',
  'otro': 'Otro',
}

async function getCreditMemoData(params: {
  q: string
  department?: string
  municipality?: string
  amount: number
  payment: number
  margin: number
  dscr: number
  term: number
  loanType: string
}) {
  const { mappedCategories, overallConfidence, matchedKeywords } = mapPurposeToCategories(params.q)
  const directIds = getCategoryIds(mappedCategories, ['direct'])
  const allIncludedIds = getCategoryIds(mappedCategories, ['direct', 'related'])

  // If no categories matched, use a broad fallback
  const queryIds = allIncludedIds.length > 0 ? allIncludedIds : [9, 1, 2]

  const [demandStats, offerStats, txStats, zoneBreakdown, activeSuppliers] = await Promise.all([
    queryOne<{
      total: number; active: number; unmet: number
      budget_p10: number | null; budget_p25: number | null
      budget_p50: number | null; budget_p75: number | null; budget_p90: number | null
      avg_offers_per_demand: number | null
    }>(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'open')::int AS active,
        COUNT(*) FILTER (WHERE offer_count = 0 AND status = 'open')::int AS unmet,
        PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY budget_max) FILTER (WHERE budget_max IS NOT NULL) AS budget_p10,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY budget_max) FILTER (WHERE budget_max IS NOT NULL) AS budget_p25,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY budget_max) FILTER (WHERE budget_max IS NOT NULL) AS budget_p50,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY budget_max) FILTER (WHERE budget_max IS NOT NULL) AS budget_p75,
        PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY budget_max) FILTER (WHERE budget_max IS NOT NULL) AS budget_p90,
        AVG(offer_count)::numeric AS avg_offers_per_demand
      FROM app.demands
      WHERE category_id = ANY($1) AND status NOT IN ('draft','cancelled')
        AND created_at >= now() - interval '90 days'
    `, [queryIds]),

    queryOne<{
      total_offers: number
      price_p10: number | null; price_p25: number | null
      price_p50: number | null; price_p75: number | null; price_p90: number | null
      price_stddev: number | null; price_avg: number | null
    }>(`
      SELECT
        COUNT(*)::int AS total_offers,
        PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY o.price) AS price_p10,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY o.price) AS price_p25,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY o.price) AS price_p50,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY o.price) AS price_p75,
        PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY o.price) AS price_p90,
        STDDEV(o.price) AS price_stddev,
        AVG(o.price) AS price_avg
      FROM app.offers o
      JOIN app.demands d ON d.id = o.demand_id
      WHERE d.category_id = ANY($1) AND o.status != 'withdrawn'
        AND d.created_at >= now() - interval '90 days'
    `, [queryIds]),

    queryOne<{
      completed: number; close_rate: number | null
      avg_amount: number | null
    }>(`
      SELECT
        COUNT(*)::int AS completed,
        (COUNT(*)::float / NULLIF((
          SELECT COUNT(*) FROM app.demands
          WHERE category_id = ANY($1) AND status NOT IN ('draft','cancelled')
            AND created_at >= now() - interval '90 days'
        ), 0)) AS close_rate,
        AVG(t.amount) AS avg_amount
      FROM app.transactions t
      JOIN app.demands d ON d.id = t.demand_id
      WHERE d.category_id = ANY($1) AND t.status = 'completed'
        AND d.created_at >= now() - interval '90 days'
    `, [queryIds]),

    query<{ zone: string; municipality: string; count: number; unmet: number }>(`
      SELECT az.name AS zone, am.name AS municipality,
             COUNT(*)::int AS count,
             COUNT(*) FILTER (WHERE d.offer_count = 0 AND d.status = 'open')::int AS unmet
      FROM app.demands d
      JOIN app.zones az ON az.id = d.zone_id
      JOIN app.municipalities am ON am.id = az.municipality_id
      WHERE d.category_id = ANY($1) AND d.status NOT IN ('draft','cancelled')
        AND d.created_at >= now() - interval '90 days'
      GROUP BY az.name, am.name
      ORDER BY count DESC
      LIMIT 6
    `, [queryIds]),

    queryOne<{ count: number }>(`
      SELECT COUNT(DISTINCT o.seller_id)::int AS count
      FROM app.offers o
      JOIN app.demands d ON d.id = o.demand_id
      WHERE d.category_id = ANY($1) AND o.created_at >= now() - interval '90 days'
    `, [queryIds]),
  ])

  const total = demandStats?.total ?? 0
  const active = demandStats?.active ?? 0
  const unmet = demandStats?.unmet ?? 0
  const unmetRate = total > 0 ? unmet / total : 0
  const closeRate = txStats?.close_rate ?? null
  const avgOffersPerDemand = demandStats?.avg_offers_per_demand ?? null
  const medianTicket = offerStats?.price_p50 ?? 0
  const monthlySignals = Math.round(total / 3) // 90 days → monthly

  // Compute price dispersion coeff
  const priceDispersion = (offerStats?.price_avg && offerStats?.price_stddev)
    ? (offerStats.price_stddev / offerStats.price_avg)
    : null

  // Analytics calculations
  const offerResponseRate = total > 0 ? (total - unmet) / total : null
  const liquidityScore = calculateMarketLiquidityScore({
    offerResponseRate,
    closeRate,
    offersPerDemand: avgOffersPerDemand,
    avgTimeToFirstOfferHours: 24,
    priceDispersionCoeff: priceDispersion,
    unmetDemandRate: unmetRate,
  })

  const saturationScore = calculateSaturationIndex(
    activeSuppliers?.count ?? 0,
    active,
    avgOffersPerDemand,
  )

  const confidenceScore = calculateConfidenceScore({
    sampleSize: total,
    freshnessdays: 45,
    categoryMatchDirect: directIds.length > 0,
    geoPrecision: params.municipality ? 'municipality' : params.department ? 'department' : 'national',
    verifiedTransactionShare: txStats?.completed ? Math.min((txStats.completed / Math.max(total, 1)), 1) : 0,
  })

  const unmetDemandValue = calculateUnmetDemandValue(
    unmet,
    offerStats?.price_p25 ?? null,
    medianTicket,
    offerStats?.price_p75 ?? null,
  )

  let dcr = null
  if (params.payment > 0 && params.margin > 0 && medianTicket > 0) {
    dcr = calculateDemandCoverageRatio({
      monthlyPaymentEstimate: params.payment,
      dscrTarget: params.dscr,
      grossMarginAssumption: params.margin,
      medianObservedTicket: medianTicket,
      monthlyObservedSignals: monthlySignals,
    })
  }

  // Risk flags
  const riskFlags: string[] = []
  if (unmetRate < 0.1) riskFlags.push('Mercado con alta cobertura de oferta — nueva entrada puede enfrentar competencia establecida.')
  if (liquidityScore.score < 40) riskFlags.push('Liquidez baja del mercado — tiempos de cierre lentos, mayor riesgo de flujo de caja.')
  if (saturationScore.score > 65) riskFlags.push('Índice de saturación elevado — mercado competido, margen bajo presión.')
  if (dcr && dcr.captureRateNeeded > 0.5) riskFlags.push(`Requiere capturar ${Math.round(dcr.captureRateNeeded * 100)}% de la demanda observada — supuesto de captura agresivo.`)
  if (total < 10) riskFlags.push('Muestra pequeña — datos de mercado limitados, evaluar con mayor cautela.')
  if (params.margin < 0.30) riskFlags.push('Margen bruto bajo (<30%) — deja poco margen para absorber volatilidad de ingresos.')

  // Opportunity flags
  const opportunityFlags: string[] = []
  if (unmetRate > 0.35) opportunityFlags.push(`Alta demanda insatisfecha: ${Math.round(unmetRate * 100)}% de señales sin oferta — gap de mercado claro.`)
  if (liquidityScore.score >= 60) opportunityFlags.push('Mercado líquido con buenos tiempos de cierre — el solicitante puede convertir demanda en ingresos con rapidez.')
  if (saturationScore.score <= 35) opportunityFlags.push('Baja saturación — espacio para nuevos proveedores sin presión de precio extrema.')
  if (dcr && dcr.demandCoverageRatio >= 1.5) opportunityFlags.push('DCR favorable — la demanda observada supera holgadamente las transacciones requeridas.')
  if (zoneBreakdown.length > 0) opportunityFlags.push(`Concentración geográfica en ${zoneBreakdown[0].zone}, ${zoneBreakdown[0].municipality} — ubicación con mayor actividad observada.`)

  return {
    mappedCategories,
    overallConfidence,
    matchedKeywords,
    demandStats: demandStats ?? { total: 0, active: 0, unmet: 0, budget_p10: null, budget_p25: null, budget_p50: null, budget_p75: null, budget_p90: null, avg_offers_per_demand: null },
    offerStats: offerStats ?? { total_offers: 0, price_p10: null, price_p25: null, price_p50: null, price_p75: null, price_p90: null, price_stddev: null, price_avg: null },
    txStats: txStats ?? { completed: 0, close_rate: null, avg_amount: null },
    zoneBreakdown,
    liquidityScore,
    saturationScore,
    confidenceScore,
    unmetDemandValue,
    dcr,
    riskFlags,
    opportunityFlags,
    monthlySignals,
    medianTicket,
    unmetRate,
  }
}

interface MemoParams {
  q: string; department?: string; municipality?: string; loanType: string
  amount: number; payment: number; margin: number; dscr: number; term: number
}

async function MemoContent({ params, session }: {
  params: MemoParams
  session: { iid: string; uid: string }
}) {
  const data = await getCreditMemoData(params)

  // Log access
  void logInstitutionalAccess({
    institutionId: session.iid,
    userId: session.uid,
    endpoint: '/institutional/credit-memo/new',
    responseRows: data.demandStats.total,
  })

  const confidenceLevelLabel = { high: 'Alta', medium: 'Media', low: 'Baja' }[data.overallConfidence]
  const confidenceColor = { high: '#5F6F52', medium: '#B8946F', low: '#B8795B' }[data.overallConfidence]

  const typeColors: Record<string, { bg: string; border: string; text: string }> = {
    direct:      { bg: 'rgba(95,111,82,0.1)',   border: 'rgba(95,111,82,0.3)',   text: '#5F6F52' },
    related:     { bg: 'rgba(184,148,111,0.1)',  border: 'rgba(184,148,111,0.3)', text: '#8A684B' },
    substitute:  { bg: 'rgba(167,161,150,0.1)',  border: 'rgba(167,161,150,0.3)', text: '#7A7468' },
    operational: { bg: 'rgba(46,42,36,0.06)',    border: 'rgba(46,42,36,0.15)',   text: '#4D4A43' },
  }

  const typeLabels: Record<string, string> = {
    direct: 'Directa', related: 'Relacionada', substitute: 'Sustituta', operational: 'Operacional',
  }

  const memoDate = new Date().toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-2xl p-6"
           style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', boxShadow: '0 2px 8px rgba(46,42,36,0.04)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#A7A196' }}>
              Signal Credit Memo — {memoDate}
            </p>
            <h2 className="text-[22px] font-bold text-signal-text mb-1" style={{ letterSpacing: '-0.02em' }}>
              {params.q}
            </h2>
            <div className="flex flex-wrap gap-3 mt-2">
              {params.municipality && (
                <span className="text-[12px] px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: '#EEF1EA', color: '#5F6F52', fontWeight: 600 }}>
                  {params.municipality}, {params.department}
                </span>
              )}
              <span className="text-[12px] px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: '#F1ECE2', color: '#7A7468' }}>
                {LOAN_TYPE_LABELS[params.loanType] ?? params.loanType}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <ConfidenceBadge level={data.overallConfidence} />
            <span className="text-[11px]" style={{ color: '#A7A196' }}>
              Confianza del análisis: {confidenceLevelLabel}
            </span>
          </div>
        </div>

        {/* Loan params strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4"
             style={{ borderTop: '1px solid #EAE3D6' }}>
          {[
            { label: 'Monto', value: fmtQ(params.amount) },
            { label: 'Cuota mensual', value: fmtQ(params.payment) },
            { label: 'Plazo', value: `${params.term} meses` },
            { label: 'Margen bruto', value: `${Math.round(params.margin * 100)}%` },
          ].map(item => (
            <div key={item.label}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#A7A196' }}>{item.label}</p>
              <p className="text-[16px] font-bold text-signal-text">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Category mapping */}
      <div className="rounded-2xl p-6"
           style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
        <h3 className="text-[14px] font-bold text-signal-text mb-1">Mapeo de categorías</h3>
        <p className="text-[12px] mb-4" style={{ color: '#A7A196' }}>
          Basado en el propósito del crédito, Signal identificó las siguientes categorías de demanda relevantes.
        </p>

        {data.matchedKeywords.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {['direct', 'related', 'substitute', 'operational'].map(type => {
                const cats = data.mappedCategories.filter(m => m.mappingType === type)
                if (cats.length === 0) return null
                const style = typeColors[type]
                return (
                  <div key={type} className="w-full">
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: style.text }}>
                      {typeLabels[type]}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {cats.map((cat, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
                             style={{ backgroundColor: style.bg, border: `1px solid ${style.border}`, color: style.text }}>
                          {cat.included && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.text }} />}
                          {cat.categoryName}
                          {!cat.included && <span className="text-[10px] opacity-60 ml-1">(excluida)</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[11px]" style={{ color: '#A7A196' }}>
              Las categorías directas y relacionadas se incluyen en el análisis de demanda. Sustitutos y operacionales son contextuales.
            </p>
          </>
        ) : (
          <p className="text-[13px]" style={{ color: '#A7A196' }}>
            No se encontraron categorías específicas. Análisis con categorías base de mercado.
          </p>
        )}
      </div>

      {/* 6-metric grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Demand signals */}
        <div className="rounded-2xl px-5 py-4"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', borderTop: '3px solid #5F6F52' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#A7A196' }}>Señales de demanda</p>
          <p className="text-[32px] font-bold leading-none" style={{ letterSpacing: '-0.03em', color: '#5F6F52' }}>
            {fmtNum(data.demandStats.total)}
          </p>
          <p className="text-[12px] mt-1" style={{ color: '#7A7468' }}>últimos 90 días</p>
          <div className="mt-2 flex gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: 'rgba(95,111,82,0.1)', color: '#5F6F52' }}>
              {fmtNum(data.demandStats.active)} activas
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: 'rgba(184,121,91,0.1)', color: '#B8795B' }}>
              {fmtNum(data.demandStats.unmet)} sin oferta
            </span>
          </div>
        </div>

        {/* Median price */}
        <div className="rounded-2xl px-5 py-4"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', borderTop: '3px solid #B8946F' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#A7A196' }}>Ticket mediano obs.</p>
          <p className="text-[32px] font-bold leading-none" style={{ letterSpacing: '-0.03em', color: '#2E2A24' }}>
            {fmtQ(data.medianTicket)}
          </p>
          <p className="text-[12px] mt-1" style={{ color: '#7A7468' }}>
            P25: {fmtQ(data.offerStats.price_p25)} — P75: {fmtQ(data.offerStats.price_p75)}
          </p>
        </div>

        {/* DCR */}
        <div className="rounded-2xl px-5 py-4"
             style={{
               backgroundColor: '#FFFDF8',
               border: '1px solid #DED6C8',
               borderTop: `3px solid ${data.dcr?.interpretationColor ?? '#A7A196'}`,
             }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#A7A196' }}>Demand Coverage Ratio</p>
          {data.dcr ? (
            <>
              <p className="text-[32px] font-bold leading-none"
                 style={{ letterSpacing: '-0.03em', color: data.dcr.interpretationColor }}>
                {data.dcr.demandCoverageRatio.toFixed(2)}x
              </p>
              <p className="text-[12px] mt-1 font-semibold" style={{ color: data.dcr.interpretationColor }}>
                {data.dcr.interpretationLabel}
              </p>
            </>
          ) : (
            <>
              <p className="text-[32px] font-bold leading-none" style={{ letterSpacing: '-0.03em', color: '#A7A196' }}>—</p>
              <p className="text-[12px] mt-1" style={{ color: '#A7A196' }}>Ingresa cuota para calcular</p>
            </>
          )}
        </div>

        {/* Liquidity */}
        <div className="rounded-2xl px-5 py-4"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', borderTop: `3px solid ${data.liquidityScore.color}` }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#A7A196' }}>Liquidez de mercado</p>
          <p className="text-[32px] font-bold leading-none"
             style={{ letterSpacing: '-0.03em', color: data.liquidityScore.color }}>
            {data.liquidityScore.score}
          </p>
          <p className="text-[12px] mt-1 font-semibold" style={{ color: data.liquidityScore.color }}>
            {data.liquidityScore.label}
          </p>
        </div>

        {/* Saturation */}
        <div className="rounded-2xl px-5 py-4"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', borderTop: `3px solid ${data.saturationScore.color}` }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#A7A196' }}>Saturación</p>
          <p className="text-[32px] font-bold leading-none"
             style={{ letterSpacing: '-0.03em', color: data.saturationScore.color }}>
            {data.saturationScore.score}
          </p>
          <p className="text-[12px] mt-1 font-semibold" style={{ color: data.saturationScore.color }}>
            {data.saturationScore.label}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: '#7A7468' }}>{data.saturationScore.quadrant}</p>
        </div>

        {/* Unmet demand value */}
        <div className="rounded-2xl px-5 py-4"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', borderTop: '3px solid #B8795B' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#A7A196' }}>Valor demand. insatisf.</p>
          {data.unmetDemandValue.median != null ? (
            <>
              <p className="text-[32px] font-bold leading-none" style={{ letterSpacing: '-0.03em', color: '#2E2A24' }}>
                {fmtQ(data.unmetDemandValue.median)}
              </p>
              <p className="text-[12px] mt-1" style={{ color: '#7A7468' }}>
                Escenario bajo: {fmtQ(data.unmetDemandValue.low)}
              </p>
            </>
          ) : (
            <p className="text-[28px] font-bold leading-none" style={{ color: '#A7A196' }}>—</p>
          )}
        </div>
      </div>

      {/* Price band bar */}
      {data.offerStats.price_p50 != null && (
        <div className="rounded-2xl p-6"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <h3 className="text-[14px] font-bold text-signal-text mb-4">Bandas de precio observadas</h3>
          <div className="space-y-3">
            {[
              { label: 'P10 (precio mínimo típico)', value: data.offerStats.price_p10, width: 15 },
              { label: 'P25', value: data.offerStats.price_p25, width: 35 },
              { label: 'P50 — Mediana', value: data.offerStats.price_p50, width: 55, highlight: true },
              { label: 'P75', value: data.offerStats.price_p75, width: 75 },
              { label: 'P90 (precio máximo típico)', value: data.offerStats.price_p90, width: 90 },
            ].map(row => row.value == null ? null : (
              <div key={row.label} className="flex items-center gap-4">
                <span className="text-[11px] w-44 shrink-0" style={{ color: '#7A7468' }}>{row.label}</span>
                <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: '#EAE3D6' }}>
                  <div className="h-full rounded-full"
                       style={{ width: `${row.width}%`, backgroundColor: row.highlight ? '#5F6F52' : '#B8946F' }} />
                </div>
                <span className="text-[13px] font-bold w-24 text-right" style={{ color: row.highlight ? '#5F6F52' : '#2E2A24' }}>
                  {fmtQ(row.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DCR narrative */}
      {data.dcr && (
        <div className="rounded-2xl p-6"
             style={{ backgroundColor: '#FFFDF8', border: `2px solid ${data.dcr.interpretationColor}`, boxShadow: '0 2px 8px rgba(46,42,36,0.04)' }}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#A7A196' }}>
                Demand Coverage Ratio — Análisis
              </p>
              <h3 className="text-[20px] font-bold" style={{ color: data.dcr.interpretationColor, letterSpacing: '-0.02em' }}>
                {data.dcr.demandCoverageRatio.toFixed(2)}x — {data.dcr.interpretationLabel}
              </h3>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px]" style={{ color: '#A7A196' }}>Captura requerida</p>
              <p className="text-[22px] font-bold" style={{ color: data.dcr.interpretationColor }}>
                {Math.round(data.dcr.captureRateNeeded * 100)}%
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#EAE3D6' }}>
              <div className="h-full rounded-full"
                   style={{ width: `${Math.min(data.dcr.demandCoverageRatio / 3 * 100, 100)}%`, backgroundColor: data.dcr.interpretationColor }} />
            </div>
            <div className="flex justify-between text-[10px]" style={{ color: '#A7A196' }}>
              <span>0x (débil)</span><span>1x (mínimo)</span><span>2x (fuerte)</span><span>3x</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4 pt-4" style={{ borderTop: '1px solid #EAE3D6' }}>
            {[
              { label: 'Ingresos brutos requeridos/mes', value: fmtQ(data.dcr.requiredGrossRevenue) },
              { label: 'Transacciones requeridas/mes', value: fmtNum(data.dcr.requiredTransactions) },
              { label: 'Señales observadas/mes', value: fmtNum(data.monthlySignals) },
            ].map(item => (
              <div key={item.label}>
                <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#A7A196' }}>{item.label}</p>
                <p className="text-[16px] font-bold text-signal-text">{item.value}</p>
              </div>
            ))}
          </div>

          <p className="text-[13px] leading-relaxed" style={{ color: '#4D4A43' }}>
            {data.dcr.narrative}
          </p>
        </div>
      )}

      {/* Market liquidity detail */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-6"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <h3 className="text-[14px] font-bold text-signal-text mb-4">Índices de mercado</h3>
          <div className="space-y-3">
            <IndexGauge value={data.liquidityScore.score} label="Liquidez" color={data.liquidityScore.color} />
            <IndexGauge value={data.saturationScore.score} label="Saturación" color={data.saturationScore.color} />
            <IndexGauge value={data.confidenceScore.score} label="Confianza del análisis" color={data.confidenceScore.color} />
            <IndexGauge value={data.unmetRate * 100} label="Tasa demanda insatisfecha" color="#B8795B" />
            {data.txStats.close_rate != null && (
              <IndexGauge value={data.txStats.close_rate * 100} label="Tasa de cierre" color="#5F6F52" />
            )}
          </div>
        </div>

        {/* Zone breakdown */}
        <div className="rounded-2xl p-6"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <h3 className="text-[14px] font-bold text-signal-text mb-4">Distribución geográfica</h3>
          {data.zoneBreakdown.length === 0 ? (
            <p className="text-[13px] text-center py-8" style={{ color: '#A7A196' }}>Sin datos geográficos suficientes.</p>
          ) : (
            <div className="space-y-3">
              {data.zoneBreakdown.map((z, i) => {
                const max = data.zoneBreakdown[0].count
                const pct = (z.count / max) * 100
                return (
                  <div key={`${z.zone}-${i}`} className="flex items-center gap-3">
                    <span className="text-[11px] w-4 shrink-0" style={{ color: '#A7A196' }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] text-signal-text truncate">{z.zone}, {z.municipality}</span>
                        <span className="text-[12px] font-bold shrink-0 ml-2" style={{ color: '#5F6F52' }}>{z.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ backgroundColor: '#EAE3D6' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: '#5F6F52' }} />
                      </div>
                    </div>
                    {z.unmet > 0 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ backgroundColor: 'rgba(184,121,91,0.1)', color: '#B8795B' }}>
                        {z.unmet} sin oferta
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Risk flags */}
      {data.riskFlags.length > 0 && (
        <div className="rounded-2xl p-6"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid rgba(184,121,91,0.3)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                 style={{ backgroundColor: 'rgba(184,121,91,0.15)' }}>
              <span className="text-[11px]">!</span>
            </div>
            <h3 className="text-[14px] font-bold" style={{ color: '#B8795B' }}>
              Señales de riesgo ({data.riskFlags.length})
            </h3>
          </div>
          <div className="space-y-2">
            {data.riskFlags.map((flag, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 px-3 rounded-xl"
                   style={{ backgroundColor: 'rgba(184,121,91,0.06)' }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: '#B8795B' }} />
                <p className="text-[13px] leading-relaxed" style={{ color: '#4D4A43' }}>{flag}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opportunity flags */}
      {data.opportunityFlags.length > 0 && (
        <div className="rounded-2xl p-6"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid rgba(95,111,82,0.3)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                 style={{ backgroundColor: 'rgba(95,111,82,0.15)' }}>
              <span className="text-[11px]">+</span>
            </div>
            <h3 className="text-[14px] font-bold" style={{ color: '#5F6F52' }}>
              Señales de oportunidad ({data.opportunityFlags.length})
            </h3>
          </div>
          <div className="space-y-2">
            {data.opportunityFlags.map((flag, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 px-3 rounded-xl"
                   style={{ backgroundColor: 'rgba(95,111,82,0.06)' }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: '#5F6F52' }} />
                <p className="text-[13px] leading-relaxed" style={{ color: '#4D4A43' }}>{flag}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confidence explanation */}
      <div className="rounded-2xl p-5"
           style={{ backgroundColor: '#EEF1EA', border: '1px solid rgba(95,111,82,0.2)' }}>
        <p className="text-[12px] leading-relaxed" style={{ color: '#4D4A43' }}>
          <span className="font-semibold" style={{ color: '#5F6F52' }}>Confianza del análisis: </span>
          {data.confidenceScore.explanation}
        </p>
      </div>

      <InstitutionalDisclaimer />
    </div>
  )
}

export default async function CreditMemoPage({ searchParams }: PageProps) {
  const session = await getInstitutionalSession()
  if (!session) return null

  const q = searchParams.q?.trim()
  const hasParams = q && searchParams.payment && searchParams.amount

  const params = hasParams ? {
    q: q!,
    department: searchParams.department ?? 'Guatemala',
    municipality: searchParams.municipality ?? '',
    amount: Number(searchParams.amount) || 0,
    payment: Number(searchParams.payment) || 0,
    margin: Number(searchParams.margin) || 0.45,
    dscr: Number(searchParams.dscr) || 1.2,
    term: Number(searchParams.term) || 24,
    loanType: searchParams.loanType ?? 'capital-de-trabajo',
  } : null

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F3EA' }}>
      <div className="max-w-4xl mx-auto px-6 py-8 pb-16">

        {/* Page header */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#A7A196' }}>
            Demand Intelligence
          </p>
          <h1 className="text-[28px] font-bold text-signal-text mb-2" style={{ letterSpacing: '-0.025em' }}>
            Credit Memo
          </h1>
          <p className="text-[14px] text-signal-text-muted">
            {params
              ? 'Análisis de mercado para el propósito de crédito indicado.'
              : 'Completa los datos del crédito para generar el análisis de evidencia de mercado.'}
          </p>
        </div>

        {/* Form — always visible to allow editing */}
        <CreditMemoForm initial={searchParams} />

        {/* Results */}
        {params && (
          <div className="mt-8">
            <Suspense fallback={
              <div className="rounded-2xl p-8 text-center"
                   style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
                <div className="w-6 h-6 border-2 rounded-full border-signal-ash border-t-signal-forest animate-spin mx-auto mb-3" />
                <p className="text-[13px] text-signal-text-muted">Calculando evidencia de mercado…</p>
              </div>
            }>
              <MemoContent params={params} session={session} />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  )
}
