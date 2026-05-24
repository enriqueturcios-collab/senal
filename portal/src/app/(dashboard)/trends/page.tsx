import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Header } from '@/components/layout/header'
import { getDemandTrend, getCategories } from '@/lib/data'
import { DemandTrendChart } from '@/components/charts/demand-trend-chart'
import { TrendsFilters } from './trends-filters'

export const metadata: Metadata = { title: 'Tendencias' }

interface Props {
  searchParams: { category_ids?: string; months?: string }
}

export default async function TrendsPage({ searchParams }: Props) {
  const session   = await getServerSession(authOptions)
  const maxMonths = session!.user.historicalMonthsAccess

  const categoryIds = searchParams.category_ids
    ? searchParams.category_ids.split(',').map(Number).filter(Boolean)
    : undefined

  const months = Math.min(parseInt(searchParams.months ?? '12'), maxMonths)

  const [trend, categories] = await Promise.all([
    getDemandTrend({ categoryIds, months }),
    getCategories(),
  ])

  return (
    <>
      <Header
        title="Tendencias de demanda"
        subtitle="Series históricas por categoría y zona"
      />

      <main className="flex-1 p-8 space-y-6">
        <TrendsFilters categories={categories} maxMonths={maxMonths} />

        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-800">Demanda mensual</h2>
            <span className="text-xs text-slate-400">Últimos {months} meses · nivel nacional</span>
          </div>
          <div className="card-body">
            {trend.length > 0
              ? <DemandTrendChart data={trend} height={340} />
              : (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                  Sin datos para el período seleccionado.
                </div>
              )
            }
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Detalle mensual</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="th">Categoría</th>
                  <th className="th">Período</th>
                  <th className="th text-right">Demandas</th>
                  <th className="th text-right">Transacciones</th>
                  <th className="th text-right">Tasa cierre</th>
                  <th className="th text-right">% Insatisfecha</th>
                  <th className="th text-right">Crecimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {trend.slice(0, 60).map((row, i) => (
                  <tr key={i} className="hover:bg-surface-muted">
                    <td className="td font-medium">{row.category}</td>
                    <td className="td text-slate-500">{row.period_start?.slice(0, 7)}</td>
                    <td className="td text-right tabular-nums">{row.demand_count ?? '—'}</td>
                    <td className="td text-right tabular-nums">{row.transaction_count ?? '—'}</td>
                    <td className="td text-right tabular-nums">
                      {row.transaction_rate != null ? `${(row.transaction_rate * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="td text-right tabular-nums">
                      {row.unmet_rate != null ? `${(row.unmet_rate * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className={`td text-right tabular-nums font-medium ${
                      (row.growth_pct ?? 0) > 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {row.growth_pct != null
                        ? `${row.growth_pct > 0 ? '+' : ''}${row.growth_pct.toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  )
}
