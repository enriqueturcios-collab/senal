import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Header } from '@/components/layout/header'
import { getTopOpportunities, getCategories, getZones } from '@/lib/data'
import { fmtScore, fmtPct, fmtGrowth, scoreBg, confidenceBadge, currentPeriod } from '@/lib/utils'
import Link from 'next/link'
import { OpportunitiesFilters } from './filters'

export const metadata: Metadata = { title: 'Oportunidades de mercado' }

interface Props {
  searchParams: { department?: string; category_id?: string; period?: string }
}

export default async function OpportunitiesPage({ searchParams }: Props) {
  const session   = await getServerSession(authOptions)
  const period    = searchParams.period ?? currentPeriod()
  const histMonths = session!.user.historicalMonthsAccess

  const [opportunities, categories, zones] = await Promise.all([
    getTopOpportunities({
      periodValue:      period,
      department:       searchParams.department,
      categoryId:       searchParams.category_id ? parseInt(searchParams.category_id) : undefined,
      limit:            50,
      historicalMonths: histMonths,
    }),
    getCategories(),
    getZones(),
  ])

  const departments = [...new Set(zones.map(z => z.department))].sort()

  return (
    <>
      <Header
        title="Oportunidades de mercado"
        subtitle="Sectores y zonas con mayor potencial según demanda activa"
      />

      <main className="flex-1 p-8 space-y-6">

        <OpportunitiesFilters departments={departments} categories={categories} />

        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="font-semibold text-slate-800">
                {opportunities.length} oportunidades encontradas
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Solo celdas con confianza medium o high · ordenadas por Market Opportunity Score
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-muted">
                <tr>
                  <th className="th">#</th>
                  <th className="th">Categoría</th>
                  <th className="th">Zona</th>
                  <th className="th text-right">Oportunidad</th>
                  <th className="th text-right">Actividad</th>
                  <th className="th text-right">Insatisfecha</th>
                  <th className="th text-right">Crecimiento</th>
                  <th className="th text-right">Precio med.</th>
                  <th className="th text-right">% Cierre</th>
                  <th className="th text-center">Confianza</th>
                  <th className="th text-right">n</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {opportunities.map((opp, i) => (
                  <tr key={i} className="hover:bg-surface-muted transition-colors">
                    <td className="td text-slate-400 text-xs w-8">{i + 1}</td>
                    <td className="td">
                      <div className="font-medium text-slate-900 leading-tight">{opp.category}</div>
                      <div className="text-xs text-slate-400">{opp.category_path.split(' / ').slice(0, -1).join(' / ')}</div>
                    </td>
                    <td className="td">
                      <div className="text-slate-800">{opp.zone}</div>
                      <div className="text-xs text-slate-400">{opp.municipality}, {opp.department}</div>
                    </td>
                    <td className="td text-right">
                      <span className={`badge font-semibold ${scoreBg(opp.market_opportunity_score)}`}>
                        {fmtScore(opp.market_opportunity_score)}
                      </span>
                    </td>
                    <td className="td text-right text-slate-600 tabular-nums">
                      {fmtScore(opp.demand_activity_index)}
                    </td>
                    <td className="td text-right text-slate-600 tabular-nums">
                      {fmtScore(opp.unmet_demand_index)}
                    </td>
                    <td className="td text-right font-medium tabular-nums">
                      <span className={
                        (opp.category_growth_score ?? 0) > 0 ? 'text-emerald-600' : 'text-red-500'
                      }>
                        {fmtGrowth(opp.category_growth_score)}
                      </span>
                    </td>
                    <td className="td text-right font-mono text-sm">
                      {opp.price_acceptance_p50 != null
                        ? `Q${opp.price_acceptance_p50.toLocaleString('es-GT')}`
                        : '—'
                      }
                    </td>
                    <td className="td text-right tabular-nums">{fmtPct(opp.transaction_confirmation_rate)}</td>
                    <td className="td text-center">
                      <span className={`badge ${confidenceBadge(opp.data_confidence)}`}>
                        {opp.data_confidence}
                      </span>
                    </td>
                    <td className="td text-right text-xs text-slate-400 tabular-nums">
                      {opp.sample_size ?? '—'}
                    </td>
                    <td className="td">
                      <Link
                        href={`/lookup?category_id=${opp.category_id}&zone_id=${opp.zone_id}`}
                        className="text-xs text-brand-600 hover:underline whitespace-nowrap"
                      >
                        Detalle →
                      </Link>
                    </td>
                  </tr>
                ))}
                {opportunities.length === 0 && (
                  <tr>
                    <td colSpan={12} className="td text-center text-slate-400 py-12">
                      No se encontraron oportunidades para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 bg-surface-muted border-t border-surface-border rounded-b-xl">
            <p className="text-xs text-slate-400">
              Market Opportunity Score 0-100 · Solo celdas con n≥5 (k-anonimidad aplicada) ·
              Los datos son señales de demanda y no constituyen recomendaciones de crédito.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
