import { getInstitutionalSession } from '@/lib/institutional-auth'
import { getDemandAggregates, getAnalyticsCategories } from '@/lib/institutional-data'
import { InstitutionalDisclaimer, BarChart, ConfidenceBadge } from '@/components/institutional/metric-card'

function fmtQ(v: number | null | undefined) {
  if (v == null) return '—'
  return `Q${Math.round(v).toLocaleString('es-GT')}`
}
function fmtPct(v: number | null | undefined) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(1)}%`
}

export default async function CategoriesPage() {
  const session = await getInstitutionalSession()
  if (!session) return null

  const [categories, aggregates] = await Promise.all([
    getAnalyticsCategories(),
    getDemandAggregates({ minSample: 1 }),
  ])

  // Aggregate by category (sum across zones)
  const byCat = new Map<string, { count: number; p50_sum: number; p50_cnt: number; close_sum: number; close_cnt: number; unmet_sum: number }>()
  for (const row of aggregates) {
    const prev = byCat.get(row.category) ?? { count: 0, p50_sum: 0, p50_cnt: 0, close_sum: 0, close_cnt: 0, unmet_sum: 0 }
    prev.count += row.demand_count ?? 0
    if (row.budget_p50) { prev.p50_sum += row.budget_p50; prev.p50_cnt++ }
    if (row.transaction_rate != null) { prev.close_sum += row.transaction_rate; prev.close_cnt++ }
    if (row.unmet_demand_rate != null) prev.unmet_sum += row.unmet_demand_rate
    byCat.set(row.category, prev)
  }

  const catList = Array.from(byCat.entries())
    .map(([name, d]) => ({
      name,
      count: d.count,
      medianPrice: d.p50_cnt > 0 ? d.p50_sum / d.p50_cnt : null,
      closeRate: d.close_cnt > 0 ? d.close_sum / d.close_cnt : null,
      unmetRate: d.close_cnt > 0 ? d.unmet_sum / d.close_cnt : null,
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F3EA' }}>
      <div className="max-w-5xl mx-auto px-6 py-8 pb-16">
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-signal-ash mb-1">Demand Intelligence</p>
          <h1 className="text-[28px] font-bold text-signal-text" style={{ letterSpacing: '-0.025em' }}>
            Análisis por categoría
          </h1>
        </div>

        {catList.length > 0 && (
          <div className="rounded-2xl p-6 mb-6"
               style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', boxShadow: '0 2px 8px rgba(46,42,36,0.04)' }}>
            <h2 className="text-[14px] font-bold text-signal-text mb-5">Volumen por categoría</h2>
            <BarChart data={catList.map(c => ({ label: c.name, value: c.count }))} color="#5F6F52" height={140} />
          </div>
        )}

        <div className="rounded-2xl overflow-hidden mb-6"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', boxShadow: '0 2px 8px rgba(46,42,36,0.04)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #EAE3D6' }}>
            <h2 className="text-[14px] font-bold text-signal-text">Tabla de categorías</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead style={{ backgroundColor: '#F1ECE2' }}>
                <tr>
                  {['Categoría', 'Señales', 'Precio mediano', 'Tasa cierre', 'Insatisfecha', 'Confianza'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-signal-ash font-semibold uppercase tracking-wider text-[10px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catList.map((cat, i) => (
                  <tr key={cat.name} style={{ borderBottom: '1px solid #F1ECE2' }}>
                    <td className="px-5 py-3 font-semibold text-signal-text">{cat.name}</td>
                    <td className="px-5 py-3 font-bold text-signal-text">{cat.count}</td>
                    <td className="px-5 py-3 font-semibold" style={{ color: '#5F6F52' }}>{fmtQ(cat.medianPrice)}</td>
                    <td className="px-5 py-3">
                      {cat.closeRate != null ? (
                        <span style={{ color: cat.closeRate > 0.3 ? '#5F6F52' : '#B8795B' }}>
                          {fmtPct(cat.closeRate)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {cat.unmetRate != null ? (
                        <span style={{ color: cat.unmetRate > 0.4 ? '#B8795B' : '#A7A196' }}>
                          {fmtPct(cat.unmetRate)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <ConfidenceBadge level={cat.count >= 10 ? 'high' : cat.count >= 3 ? 'medium' : 'low'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <InstitutionalDisclaimer />
      </div>
    </div>
  )
}
