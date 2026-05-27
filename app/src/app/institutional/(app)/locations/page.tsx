import { getInstitutionalSession } from '@/lib/institutional-auth'
import { getDemandAggregates } from '@/lib/institutional-data'
import { InstitutionalDisclaimer, ConfidenceBadge } from '@/components/institutional/metric-card'

function fmtQ(v: number | null | undefined) {
  if (v == null) return '—'
  return `Q${Math.round(v).toLocaleString('es-GT')}`
}
function fmtPct(v: number | null | undefined) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(1)}%`
}

export default async function LocationsPage() {
  const session = await getInstitutionalSession()
  if (!session) return null

  const aggregates = await getDemandAggregates({ minSample: 1 })

  // Group by zone
  const byZone = new Map<string, { municipality: string; count: number; unmetSum: number; cnt: number; p50Sum: number; p50Cnt: number }>()
  for (const row of aggregates) {
    const key  = row.zone
    const prev = byZone.get(key) ?? { municipality: row.municipality, count: 0, unmetSum: 0, cnt: 0, p50Sum: 0, p50Cnt: 0 }
    prev.count   += row.demand_count ?? 0
    prev.cnt     += 1
    if (row.unmet_demand_rate != null) prev.unmetSum += row.unmet_demand_rate
    if (row.budget_p50) { prev.p50Sum += row.budget_p50; prev.p50Cnt++ }
    byZone.set(key, prev)
  }

  const zoneList = Array.from(byZone.entries())
    .map(([zone, d]) => ({
      zone, municipality: d.municipality,
      count: d.count,
      avgUnmet: d.cnt > 0 ? d.unmetSum / d.cnt : null,
      medianPrice: d.p50Cnt > 0 ? d.p50Sum / d.p50Cnt : null,
    }))
    .sort((a, b) => b.count - a.count)

  const maxCount = zoneList[0]?.count ?? 1

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F3EA' }}>
      <div className="max-w-5xl mx-auto px-6 py-8 pb-16">
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-signal-ash mb-1">Demand Intelligence</p>
          <h1 className="text-[28px] font-bold text-signal-text" style={{ letterSpacing: '-0.025em' }}>
            Demanda por zona
          </h1>
        </div>

        {zoneList.length === 0 ? (
          <div className="rounded-2xl p-12 text-center"
               style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
            <p className="text-[14px] text-signal-text-muted">Sin datos de zona suficientes aún.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {zoneList.map(z => {
              const pct = (z.count / maxCount) * 100
              const isHot = z.avgUnmet != null && z.avgUnmet > 0.4
              return (
                <div key={z.zone} className="rounded-2xl p-5 transition-all"
                     style={{
                       backgroundColor: '#FFFDF8',
                       border: `1px solid ${isHot ? 'rgba(184,121,91,0.3)' : '#DED6C8'}`,
                       boxShadow: '0 2px 8px rgba(46,42,36,0.04)',
                     }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[14px] font-semibold text-signal-text">{z.zone}</p>
                      <p className="text-[12px] text-signal-ash">{z.municipality}</p>
                    </div>
                    {isHot && (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                            style={{ backgroundColor: 'rgba(184,121,91,0.12)', color: '#B8795B' }}>
                        Alta oportunidad
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-signal-ash">Señales</span>
                    <span className="text-[16px] font-bold text-signal-text">{z.count}</span>
                  </div>
                  <div className="h-2 rounded-full mb-3" style={{ backgroundColor: '#EAE3D6' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: '#5F6F52' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-signal-ash">Precio mediano</p>
                      <p className="text-[13px] font-semibold" style={{ color: '#5F6F52' }}>{fmtQ(z.medianPrice)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-signal-ash">Insatisfecha</p>
                      <p className="text-[13px] font-semibold" style={{ color: z.avgUnmet && z.avgUnmet > 0.3 ? '#B8795B' : '#A7A196' }}>
                        {fmtPct(z.avgUnmet)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <InstitutionalDisclaimer />
      </div>
    </div>
  )
}
