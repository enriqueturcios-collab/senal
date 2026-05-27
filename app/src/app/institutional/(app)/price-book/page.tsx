import { getInstitutionalSession } from '@/lib/institutional-auth'
import { logInstitutionalAccess } from '@/lib/institutional-data'
import { query } from '@/db'
import { ConfidenceBadge } from '@/components/institutional/metric-card'
import { PriceBookExportButton } from './export-btn'

interface PageProps {
  searchParams: { category?: string; zone?: string }
}

async function getPriceBookData(opts: { categoryFilter?: string; zoneFilter?: string }) {
  const conditions = [`o.status != 'withdrawn'`, `d.status NOT IN ('draft','cancelled')`]
  const params: unknown[] = []
  let p = 1

  if (opts.categoryFilter) {
    conditions.push(`c.name ILIKE $${p}`)
    params.push(`%${opts.categoryFilter}%`)
    p++
  }
  if (opts.zoneFilter) {
    conditions.push(`(z.name ILIKE $${p} OR m.name ILIKE $${p})`)
    params.push(`%${opts.zoneFilter}%`)
    p++
  }

  const rows = await query<{
    category_id: number
    category: string
    zone: string
    municipality: string
    sample_size: number
    price_p10: number | null
    price_p25: number | null
    price_p50: number | null
    price_p75: number | null
    price_p90: number | null
    price_avg: number | null
    close_rate: number | null
  }>(`
    SELECT
      c.id AS category_id,
      c.name AS category,
      z.name AS zone,
      m.name AS municipality,
      COUNT(o.id)::int AS sample_size,
      PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY o.price) AS price_p10,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY o.price) AS price_p25,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY o.price) AS price_p50,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY o.price) AS price_p75,
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY o.price) AS price_p90,
      AVG(o.price) AS price_avg,
      (COUNT(t.id)::float / NULLIF(COUNT(d.id), 0)) AS close_rate
    FROM app.offers o
    JOIN app.demands d ON d.id = o.demand_id
    JOIN app.categories c ON c.id = d.category_id
    LEFT JOIN app.zones z ON z.id = d.zone_id
    LEFT JOIN app.municipalities m ON m.id = z.municipality_id
    LEFT JOIN app.transactions t ON t.demand_id = d.id AND t.status = 'completed'
    WHERE ${conditions.join(' AND ')}
    GROUP BY c.id, c.name, z.name, m.name
    HAVING COUNT(o.id) >= 2
    ORDER BY COUNT(o.id) DESC, c.name
    LIMIT 100
  `, params)

  return rows
}

function fmtQ(v: number | null | undefined) {
  if (v == null) return '—'
  return `Q${Math.round(v).toLocaleString('es-GT')}`
}

function confidenceLevel(n: number): 'high' | 'medium' | 'low' {
  if (n >= 20) return 'high'
  if (n >= 5) return 'medium'
  return 'low'
}

export default async function PriceBookPage({ searchParams }: PageProps) {
  const session = await getInstitutionalSession()
  if (!session) return null

  const rows = await getPriceBookData({
    categoryFilter: searchParams.category,
    zoneFilter: searchParams.zone,
  })

  void logInstitutionalAccess({
    institutionId: session.iid,
    userId: session.uid,
    endpoint: '/institutional/price-book',
    responseRows: rows.length,
  })

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F3EA' }}>
      <div className="max-w-6xl mx-auto px-6 py-8 pb-16">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#A7A196' }}>
              Demand Intelligence
            </p>
            <h1 className="text-[28px] font-bold text-signal-text" style={{ letterSpacing: '-0.025em' }}>
              Price Book
            </h1>
            <p className="text-[14px] text-signal-text-muted mt-1">
              Precios observados por categoría y zona. Basado en ofertas reales del marketplace.
            </p>
          </div>
          <PriceBookExportButton rows={rows} />
        </div>

        {/* Filters */}
        <form method="GET" className="flex flex-wrap gap-3 mb-6">
          <input
            name="category"
            defaultValue={searchParams.category}
            placeholder="Filtrar por categoría..."
            className="flex-1 min-w-48 px-4 py-2 rounded-xl text-[13px]"
            style={{ border: '1px solid #DED6C8', backgroundColor: '#FFFDF8', color: '#2E2A24', outline: 'none' }}
          />
          <input
            name="zone"
            defaultValue={searchParams.zone}
            placeholder="Filtrar por zona o municipio..."
            className="flex-1 min-w-48 px-4 py-2 rounded-xl text-[13px]"
            style={{ border: '1px solid #DED6C8', backgroundColor: '#FFFDF8', color: '#2E2A24', outline: 'none' }}
          />
          <button type="submit"
                  className="px-5 py-2 rounded-xl text-[13px] font-semibold"
                  style={{ backgroundColor: '#5F6F52', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Filtrar
          </button>
          {(searchParams.category || searchParams.zone) && (
            <a href="/institutional/price-book"
               className="px-4 py-2 rounded-xl text-[13px]"
               style={{ backgroundColor: '#F1ECE2', color: '#7A7468', border: '1px solid #DED6C8' }}>
              Limpiar
            </a>
          )}
        </form>

        {/* Table */}
        {rows.length === 0 ? (
          <div className="rounded-2xl p-12 text-center"
               style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
            <p className="text-[16px] font-semibold text-signal-text mb-2">Sin datos suficientes</p>
            <p className="text-[13px]" style={{ color: '#A7A196' }}>
              No hay suficientes ofertas para los filtros aplicados. Intenta con categorías más amplias.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden"
               style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', boxShadow: '0 2px 8px rgba(46,42,36,0.04)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F7F3EA', borderBottom: '1px solid #DED6C8' }}>
                    {['Categoría', 'Zona / Municipio', 'N', 'P10', 'P25', 'Mediana', 'P75', 'P90', 'Prom.', '% Cierre', 'Confianza'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest"
                          style={{ color: '#A7A196', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={`${row.category_id}-${row.zone}-${i}`}
                        style={{ borderBottom: '1px solid #F1ECE2' }}
                        className="hover:bg-[#FDFBF5] transition-colors">
                      <td className="px-4 py-3 font-medium text-signal-text">{row.category}</td>
                      <td className="px-4 py-3" style={{ color: '#7A7468' }}>
                        {row.zone ? `${row.zone}, ${row.municipality}` : row.municipality ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: '#5F6F52' }}>{row.sample_size}</td>
                      <td className="px-4 py-3" style={{ color: '#A7A196' }}>{fmtQ(row.price_p10)}</td>
                      <td className="px-4 py-3" style={{ color: '#7A7468' }}>{fmtQ(row.price_p25)}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: '#2E2A24' }}>{fmtQ(row.price_p50)}</td>
                      <td className="px-4 py-3" style={{ color: '#7A7468' }}>{fmtQ(row.price_p75)}</td>
                      <td className="px-4 py-3" style={{ color: '#A7A196' }}>{fmtQ(row.price_p90)}</td>
                      <td className="px-4 py-3" style={{ color: '#7A7468' }}>{fmtQ(row.price_avg)}</td>
                      <td className="px-4 py-3">
                        {row.close_rate != null
                          ? <span className="font-semibold" style={{ color: row.close_rate >= 0.3 ? '#5F6F52' : '#B8795B' }}>
                              {(row.close_rate * 100).toFixed(0)}%
                            </span>
                          : <span style={{ color: '#A7A196' }}>—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <ConfidenceBadge level={confidenceLevel(row.sample_size)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3" style={{ borderTop: '1px solid #EAE3D6', backgroundColor: '#F7F3EA' }}>
              <p className="text-[11px]" style={{ color: '#A7A196' }}>
                {rows.length} combinaciones · Confianza alta: ≥20 muestras · Media: ≥5 · Baja: &lt;5
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl p-4"
             style={{ backgroundColor: '#EEF1EA', border: '1px solid rgba(95,111,82,0.2)' }}>
          <p className="text-[12px]" style={{ color: '#4D4A43' }}>
            <span className="font-semibold" style={{ color: '#5F6F52' }}>Nota metodológica: </span>
            Los precios son de ofertas recibidas en el marketplace, no necesariamente transacciones cerradas.
            El precio P50 es el mejor estimador del precio de mercado típico. Use P25–P75 como rango de negociación.
          </p>
        </div>
      </div>
    </div>
  )
}
