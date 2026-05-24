import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Header } from '@/components/layout/header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { DemandTrendChart } from '@/components/charts/demand-trend-chart'
import { CategoryBarChart } from '@/components/charts/category-bar-chart'
import {
  getOverviewKpis, getTopOpportunities,
  getDemandTrend, getDemandByCategory,
} from '@/lib/data'
import { fmt, fmtPct, fmtScore, fmtGrowth, scoreBg, confidenceBadge, currentPeriod } from '@/lib/utils'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Overview' }

export default async function DashboardPage() {
  const session   = await getServerSession(authOptions)
  const period    = currentPeriod()
  const histMonths = session!.user.historicalMonthsAccess

  const [kpis, opportunities, trend, byCategory] = await Promise.all([
    getOverviewKpis(session!.user.institutionId, period),
    getTopOpportunities({ periodValue: period, limit: 8, historicalMonths: histMonths }),
    getDemandTrend({ months: 6 }),
    getDemandByCategory(period, 8),
  ])

  return (
    <>
      <Header
        title="Overview"
        subtitle={`Inteligencia de demanda — ${new Date().toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })}`}
      />

      <main className="flex-1 p-8 space-y-8">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Demanda activa"
            value={fmt(kpis?.total_demand)}
            change={kpis?.demand_growth != null ? `${Math.abs(kpis.demand_growth).toFixed(1)}%` : undefined}
            changePositive={(kpis?.demand_growth ?? 0) >= 0}
            sub="demandas publicadas este mes"
            accent="blue"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
          />
          <KpiCard
            label="Tasa de cierre"
            value={fmtPct(kpis?.transaction_rate)}
            sub="demandas que derivaron en transacción"
            accent="green"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          />
          <KpiCard
            label="Mejor oportunidad"
            value={fmtScore(kpis?.top_opportunity)}
            sub="score máximo del mes (0-100)"
            accent="amber"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>}
          />
          <KpiCard
            label="Demanda insatisfecha"
            value={fmtPct(kpis?.unmet_demand_rate)}
            sub="demandas sin oferta recibida"
            accent="red"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>}
          />
        </section>

        {/* Charts row */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 card">
            <div className="card-header">
              <h2 className="font-semibold text-slate-800">Tendencia de demanda</h2>
              <span className="text-xs text-slate-400">Últimos 6 meses</span>
            </div>
            <div className="card-body pt-4">
              <DemandTrendChart data={trend} />
            </div>
          </div>

          <div className="lg:col-span-2 card">
            <div className="card-header">
              <h2 className="font-semibold text-slate-800">Por categoría</h2>
              <span className="text-xs text-slate-400">Este mes</span>
            </div>
            <div className="card-body pt-4">
              <CategoryBarChart data={byCategory} />
            </div>
          </div>
        </section>

        {/* Top opportunities table */}
        <section className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-800">Top oportunidades de mercado</h2>
            <Link href="/dashboard/opportunities" className="text-sm text-brand-600 hover:underline">
              Ver todas →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-muted">
                <tr>
                  <th className="th">Categoría</th>
                  <th className="th">Zona</th>
                  <th className="th text-right">Oportunidad</th>
                  <th className="th text-right">Crecimiento</th>
                  <th className="th text-right">Precio med.</th>
                  <th className="th text-right">Tasa cierre</th>
                  <th className="th text-center">Confianza</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {opportunities.map((opp, i) => (
                  <tr key={i} className="hover:bg-surface-muted transition-colors">
                    <td className="td">
                      <div className="font-medium text-slate-900">{opp.category}</div>
                      <div className="text-xs text-slate-400">{opp.category_path.split(' / ')[0]}</div>
                    </td>
                    <td className="td">
                      <div>{opp.zone}</div>
                      <div className="text-xs text-slate-400">{opp.municipality}</div>
                    </td>
                    <td className="td text-right">
                      <span className={`badge ${scoreBg(opp.market_opportunity_score)}`}>
                        {fmtScore(opp.market_opportunity_score)}
                      </span>
                    </td>
                    <td className="td text-right">
                      <span className={opp.category_growth_score != null && opp.category_growth_score > 0
                        ? 'text-emerald-600 font-medium'
                        : 'text-red-500 font-medium'
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
                    <td className="td text-right">{fmtPct(opp.transaction_confirmation_rate)}</td>
                    <td className="td text-center">
                      <span className={`badge ${confidenceBadge(opp.data_confidence)}`}>
                        {opp.data_confidence}
                      </span>
                    </td>
                    <td className="td">
                      <Link
                        href={`/dashboard/lookup?category_id=${opp.category_id}&zone_id=${opp.zone_id}`}
                        className="text-xs text-brand-600 hover:underline whitespace-nowrap"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-surface-muted border-t border-surface-border rounded-b-xl">
            <p className="text-xs text-slate-400">
              Señal es una plataforma de inteligencia de demanda. Los datos son señales de mercado
              y no constituyen recomendaciones de aprobación crediticia. Su institución es responsable
              de las decisiones finales de crédito.
            </p>
          </div>
        </section>

      </main>
    </>
  )
}
