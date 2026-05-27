// Core analytics calculation helpers for Signal institutional features

export interface PriceBands {
  p10: number | null
  p25: number | null
  median: number | null
  p75: number | null
  p90: number | null
}

export interface DemandCoverageInput {
  monthlyPaymentEstimate: number
  dscrTarget: number
  grossMarginAssumption: number
  medianObservedTicket: number
  monthlyObservedSignals: number
}

export interface DemandCoverageResult {
  requiredGrossRevenue: number
  requiredTransactions: number
  captureRateNeeded: number
  demandCoverageRatio: number
  interpretation: 'strong' | 'moderate' | 'weak'
  interpretationLabel: string
  interpretationColor: string
  narrative: string
}

export function calculateDemandCoverageRatio(input: DemandCoverageInput): DemandCoverageResult {
  const { monthlyPaymentEstimate, dscrTarget, grossMarginAssumption, medianObservedTicket, monthlyObservedSignals } = input
  const requiredGrossRevenue = (monthlyPaymentEstimate * dscrTarget) / grossMarginAssumption
  const requiredTransactions = medianObservedTicket > 0 ? requiredGrossRevenue / medianObservedTicket : 0
  const captureRateNeeded = monthlyObservedSignals > 0 ? requiredTransactions / monthlyObservedSignals : 999
  const demandCoverageRatio = requiredTransactions > 0 ? monthlyObservedSignals / requiredTransactions : 0

  let interpretation: 'strong' | 'moderate' | 'weak'
  let interpretationLabel: string
  let interpretationColor: string

  if (demandCoverageRatio >= 2) {
    interpretation = 'strong'
    interpretationLabel = 'Cobertura fuerte'
    interpretationColor = '#5F6F52'
  } else if (demandCoverageRatio >= 1) {
    interpretation = 'moderate'
    interpretationLabel = 'Cobertura moderada'
    interpretationColor = '#B8946F'
  } else {
    interpretation = 'weak'
    interpretationLabel = 'Cobertura débil'
    interpretationColor = '#B8795B'
  }

  const captureRatePct = Math.round(captureRateNeeded * 100)
  const narrative = `Con cuota mensual estimada de Q${monthlyPaymentEstimate.toLocaleString('es-GT')}, margen bruto de ${Math.round(grossMarginAssumption * 100)}% y DSCR objetivo de ${dscrTarget}, el negocio necesitaría generar aproximadamente Q${Math.round(requiredGrossRevenue).toLocaleString('es-GT')} de ingresos brutos mensuales. Con ticket mediano observado de Q${Math.round(medianObservedTicket).toLocaleString('es-GT')}, esto equivale a ${Math.round(requiredTransactions)} transacciones mensuales. Signal observó ${monthlyObservedSignals} señales relacionadas, por lo que el solicitante necesitaría capturar aproximadamente ${captureRatePct}% de la demanda observada.`

  return { requiredGrossRevenue, requiredTransactions, captureRateNeeded, demandCoverageRatio, interpretation, interpretationLabel, interpretationColor, narrative }
}

export interface MarketLiquidityInput {
  offerResponseRate: number | null   // 0-1
  closeRate: number | null           // 0-1
  offersPerDemand: number | null     // avg offers per demand
  avgTimeToFirstOfferHours: number | null
  priceDispersionCoeff: number | null // coefficient of variation 0-1
  unmetDemandRate: number | null     // 0-1
}

export function calculateMarketLiquidityScore(input: MarketLiquidityInput): { score: number; label: string; color: string; drivers: Record<string, number> } {
  const norm = (v: number | null, min: number, max: number) => v == null ? 0 : Math.min(Math.max((v - min) / (max - min), 0), 1)

  const responseScore   = norm(input.offerResponseRate, 0, 1) * 100
  const closeScore      = norm(input.closeRate, 0, 0.8) * 100
  const offersScore     = norm(input.offersPerDemand, 0, 5) * 100
  const speedScore      = norm(1 / Math.max(input.avgTimeToFirstOfferHours ?? 48, 0.5), 1/48, 2) * 100
  const dispPenalty     = norm(input.priceDispersionCoeff, 0, 1) * 100
  const unmetPenalty    = norm(input.unmetDemandRate, 0, 1) * 100

  const raw = 0.25 * responseScore + 0.25 * closeScore + 0.20 * offersScore + 0.15 * speedScore - 0.10 * dispPenalty - 0.05 * unmetPenalty
  const score = Math.round(Math.min(Math.max(raw, 0), 100))

  let label: string; let color: string
  if (score >= 70) { label = 'Liquidez alta'; color = '#5F6F52' }
  else if (score >= 40) { label = 'Liquidez moderada'; color = '#B8946F' }
  else { label = 'Liquidez baja'; color = '#B8795B' }

  return { score, label, color, drivers: { responseScore, closeScore, offersScore, speedScore, dispPenalty, unmetPenalty } }
}

export function calculateSaturationIndex(activeSuppliers: number, demandCount: number, offersPerDemand: number | null): { score: number; label: string; color: string; quadrant: string } {
  const ratio = demandCount > 0 ? activeSuppliers / demandCount : 0
  const saturation = Math.min(ratio * 40 + (offersPerDemand ?? 0) * 10, 100)
  const score = Math.round(Math.min(Math.max(saturation, 0), 100))

  let label: string; let color: string
  if (score <= 30) { label = 'Baja saturación'; color = '#5F6F52' }
  else if (score <= 60) { label = 'Mercado balanceado'; color = '#B8946F' }
  else if (score <= 80) { label = 'Alta saturación'; color = '#B8795B' }
  else { label = 'Muy alta saturación'; color = '#9B3A3A' }

  const highDemand = demandCount >= 20
  const highSat = score >= 50
  let quadrant: string
  if (highDemand && !highSat) quadrant = 'Oportunidad emergente'
  else if (highDemand && highSat) quadrant = 'Mercado activo pero competido'
  else if (!highDemand && !highSat) quadrant = 'Mercado pequeño o no probado'
  else quadrant = 'Mercado presionado'

  return { score, label, color, quadrant }
}

export function calculateConfidenceScore(opts: {
  sampleSize: number
  freshnessdays: number
  categoryMatchDirect: boolean
  geoPrecision: 'exact' | 'municipality' | 'department' | 'national'
  verifiedTransactionShare: number
}): { score: number; label: 'Baja' | 'Media' | 'Alta'; color: string; explanation: string } {
  const sampleScore = Math.min(opts.sampleSize / 50, 1) * 100
  const freshnessScore = Math.max(1 - opts.freshnessdays / 180, 0) * 100
  const matchScore = opts.categoryMatchDirect ? 100 : 55
  const geoScore = { exact: 100, municipality: 75, department: 50, national: 25 }[opts.geoPrecision]
  const verifiedScore = Math.min(opts.verifiedTransactionShare, 1) * 100

  const raw = 0.30 * sampleScore + 0.20 * freshnessScore + 0.20 * matchScore + 0.15 * geoScore + 0.15 * verifiedScore
  const score = Math.round(Math.min(Math.max(raw, 0), 100))

  let label: 'Baja' | 'Media' | 'Alta'
  let color: string
  if (score >= 70) { label = 'Alta'; color = '#5F6F52' }
  else if (score >= 40) { label = 'Media'; color = '#B8946F' }
  else { label = 'Baja'; color = '#B8795B' }

  const explanation = `Confianza ${label.toLowerCase()}: ${opts.sampleSize} señales, datos de últimos ${opts.freshnessdays} días, ${opts.categoryMatchDirect ? 'coincidencia directa' : 'categorías relacionadas'}, precisión geográfica ${opts.geoPrecision}.`

  return { score, label, color, explanation }
}

export function calculateUnmetDemandValue(unmetCount: number, p25: number | null, median: number | null, p75: number | null) {
  return {
    low: p25 != null ? unmetCount * p25 : null,
    median: median != null ? unmetCount * median : null,
    high: p75 != null ? unmetCount * p75 : null,
  }
}

export function classifyAssumption(applicantValue: number, p25: number | null, median: number | null, p75: number | null): {
  label: 'Conservative' | 'Reasonable' | 'Aggressive' | 'Unsupported'
  color: string
  explanation: string
} {
  if (median == null) return { label: 'Unsupported', color: '#A7A196', explanation: 'Sin datos de mercado suficientes.' }
  if (applicantValue <= (p25 ?? median * 0.7)) return { label: 'Conservative', color: '#5F6F52', explanation: 'Por debajo del rango P25 observado.' }
  if (applicantValue <= (p75 ?? median * 1.3)) return { label: 'Reasonable', color: '#B8946F', explanation: 'Dentro del rango P25–P75 observado.' }
  return { label: 'Aggressive', color: '#B8795B', explanation: 'Por encima del rango P75 observado.' }
}
