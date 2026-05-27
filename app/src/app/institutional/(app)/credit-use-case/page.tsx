import { Suspense } from 'react'
import { getInstitutionalSession } from '@/lib/institutional-auth'
import { getCreditUseCaseAnalysis, logInstitutionalAccess } from '@/lib/institutional-data'
import { ConfidenceBadge, InstitutionalDisclaimer, IndexGauge } from '@/components/institutional/metric-card'
import { CreditUseCaseForm } from './credit-use-case-form'

interface PageProps {
  searchParams: { q?: string; zone?: string }
}

function fmtQ(v: number | null | undefined) {
  if (v == null) return '—'
  return `Q${Math.round(v).toLocaleString('es-GT')}`
}
function fmtPct(v: number | null | undefined) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(1)}%`
}

const SUGGESTED = [
  'negocio de helados', 'venta de libros', 'taller de reparación de celulares',
  'servicio de carpintería', 'cafetería', 'catering de postres', 'delivery de comida',
]

async function Analysis({ q, zoneId }: { q: string; zoneId?: number }) {
  const data = await getCreditUseCaseAnalysis(q, zoneId)

  const mos       = data.marketOpportunityScore
  const mosColor  = mos >= 60 ? '#5F6F52' : mos >= 30 ? '#B8946F' : '#B8795B'
  const mosLabel  = mos >= 60 ? 'Alta oportunidad' : mos >= 30 ? 'Oportunidad moderada' : 'Oportunidad baja'

  return (
    <div className="space-y-6 mt-6">
      {/* Narrative */}
      <div className="rounded-2xl p-6"
           style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', boxShadow: '0 2px 8px rgba(46,42,36,0.04)' }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-signal-ash mb-1">
              Market Evidence Report
            </p>
            <h2 className="text-[20px] font-bold text-signal-text" style={{ letterSpacing: '-0.02em' }}>
              "{q}"
            </h2>
          </div>
          <ConfidenceBadge level={data.confidence} />
        </div>
        <p className="text-[14px] text-signal-text-soft leading-relaxed">
          {data.narrative}
        </p>
      </div>

      {/* Opportunity score + KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2 rounded-2xl p-5 flex flex-col justify-between"
             style={{ backgroundColor: '#FFFDF8', border: `2px solid ${mosColor}`, boxShadow: '0 2px 8px rgba(46,42,36,0.04)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-signal-ash mb-2">
            Market Opportunity Score
          </p>
          <div className="flex items-end gap-3">
            <span className="text-[52px] font-bold leading-none" style={{ color: mosColor, letterSpacing: '-0.03em' }}>
              {mos}
            </span>
            <div className="mb-2">
              <span className="text-[12px] font-semibold" style={{ color: mosColor }}>/100</span>
              <p className="text-[12px] font-semibold mt-0.5" style={{ color: mosColor }}>{mosLabel}</p>
            </div>
          </div>
          <div className="h-2 rounded-full overflow-hidden mt-3" style={{ backgroundColor: '#EAE3D6' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${mos}%`, backgroundColor: mosColor }} />
          </div>
        </div>

        {[
          { label: 'Señales totales',    value: data.sampleSize.toString(), color: '#5F6F52' },
          { label: 'Señales activas',    value: data.demands.active.toString(), color: '#5F6F52' },
          { label: 'Insatisfechas',      value: data.demands.unmet.toString(), color: '#B8795B' },
          { label: 'Transacciones',      value: data.transactions.total.toString(), color: '#B8946F' },
        ].map(card => (
          <div key={card.label} className="rounded-2xl px-4 py-4"
               style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', borderTop: `3px solid ${card.color}` }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-signal-ash mb-2">{card.label}</p>
            <p className="text-[28px] font-bold text-signal-text leading-none" style={{ letterSpacing: '-0.03em', color: card.color }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Price range */}
        <div className="rounded-2xl p-6"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', boxShadow: '0 2px 8px rgba(46,42,36,0.04)' }}>
          <h3 className="text-[14px] font-bold text-signal-text mb-5">Rango de precios observado</h3>

          {data.priceRange.p50 != null ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 rounded-xl px-4"
                   style={{ backgroundColor: '#EEF1EA' }}>
                <span className="text-[12px] text-signal-text-soft">Precio mediano</span>
                <span className="text-[20px] font-bold" style={{ color: '#5F6F52' }}>
                  {fmtQ(data.priceRange.p50)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#F1ECE2' }}>
                  <p className="text-[10px] text-signal-ash mb-1">Percentil 10</p>
                  <p className="text-[16px] font-bold text-signal-text">{fmtQ(data.priceRange.p10)}</p>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#F1ECE2' }}>
                  <p className="text-[10px] text-signal-ash mb-1">Percentil 90</p>
                  <p className="text-[16px] font-bold text-signal-text">{fmtQ(data.priceRange.p90)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <IndexGauge value={(data.closeRate ?? 0) * 100} label="Tasa de cierre" color="#5F6F52" />
                <IndexGauge value={(data.unmetRate ?? 0) * 100} label="Demanda insatisfecha" color="#B8795B" />
              </div>
            </div>
          ) : (
            <div className="py-8 text-center rounded-xl" style={{ backgroundColor: '#F1ECE2' }}>
              <p className="text-[13px] text-signal-text-muted">
                No hay suficientes señales de precio para este rubro aún.
              </p>
              <p className="text-[12px] text-signal-ash mt-1">Se muestran datos relacionados.</p>
            </div>
          )}
        </div>

        {/* Zone breakdown */}
        <div className="rounded-2xl p-6"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', boxShadow: '0 2px 8px rgba(46,42,36,0.04)' }}>
          <h3 className="text-[14px] font-bold text-signal-text mb-5">Concentración geográfica</h3>

          {data.zoneBreakdown.length === 0 ? (
            <p className="text-[13px] text-signal-ash text-center py-8">Sin datos de zona suficientes.</p>
          ) : (
            <div className="space-y-3">
              {data.zoneBreakdown.map((z, i) => {
                const max = data.zoneBreakdown[0].count
                const pct = (z.count / max) * 100
                return (
                  <div key={`${z.zone}-${i}`} className="flex items-center gap-3">
                    <span className="text-[11px] text-signal-ash w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] text-signal-text truncate">{z.zone}, {z.municipality}</span>
                        <span className="text-[12px] font-semibold shrink-0 ml-2">{z.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ backgroundColor: '#EAE3D6' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: '#5F6F52' }} />
                      </div>
                    </div>
                    {z.unmet > 0 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ backgroundColor: 'rgba(184,121,91,0.1)', color: '#B8795B' }}>
                        {z.unmet} ins.
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Categories found */}
      {data.categories.length > 0 && (
        <div className="rounded-2xl p-6"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <h3 className="text-[14px] font-bold text-signal-text mb-4">Categorías relacionadas detectadas</h3>
          <div className="flex flex-wrap gap-2">
            {data.categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                   style={{ backgroundColor: '#EEF1EA', border: '1px solid rgba(95,111,82,0.2)' }}>
                <span className="text-[12px] font-medium" style={{ color: '#5F6F52' }}>{cat.name}</span>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: '#5F6F52' }}>
                  {cat.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <InstitutionalDisclaimer />
    </div>
  )
}

export default async function CreditUseCasePage({ searchParams }: PageProps) {
  const session = await getInstitutionalSession()
  if (!session) return null

  const q      = searchParams.q?.trim()
  const zoneId = searchParams.zone ? Number(searchParams.zone) : undefined

  if (q) {
    logInstitutionalAccess({
      institutionId: session.iid, userId: session.uid,
      endpoint: '/institutional/credit-use-case', responseRows: 1,
    })
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F3EA' }}>
      <div className="max-w-4xl mx-auto px-6 py-8 pb-16">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-signal-ash mb-1">
            Credit Use Case Explorer
          </p>
          <h1 className="text-[28px] font-bold text-signal-text mb-2"
              style={{ letterSpacing: '-0.025em' }}>
            Análisis por propósito de crédito
          </h1>
          <p className="text-[14px] text-signal-text-muted">
            Escribe el propósito del crédito solicitado para ver evidencia de mercado relacionada.
          </p>
        </div>

        {/* Search form */}
        <CreditUseCaseForm initialQuery={q} />

        {/* Suggested */}
        {!q && (
          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-signal-ash mb-3">
              Ejemplos de propósito
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map(s => (
                <a key={s}
                   href={`/institutional/credit-use-case?q=${encodeURIComponent(s)}`}
                   className="px-4 py-2 rounded-full text-[13px] font-medium transition-all hover:opacity-80"
                   style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8', color: '#5F5B52' }}>
                  {s}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {q && (
          <Suspense fallback={
            <div className="mt-8 rounded-2xl p-8 text-center"
                 style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
              <div className="w-6 h-6 border-2 rounded-full border-signal-ash border-t-signal-forest
                              animate-spin mx-auto mb-3" />
              <p className="text-[13px] text-signal-text-muted">Calculando evidencia de mercado…</p>
            </div>
          }>
            <Analysis q={q} zoneId={zoneId} />
          </Suspense>
        )}
      </div>
    </div>
  )
}
