import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Header } from '@/components/layout/header'
import { getUsageSummary } from '@/lib/data'

export const metadata: Metadata = { title: 'Mi cuenta' }

export default async function AccountPage() {
  const session = await getServerSession(authOptions)
  const usage   = await getUsageSummary(session!.user.institutionId)

  const PLAN_FEATURES: Record<string, string[]> = {
    basic:      ['Dashboard general', 'Reportes mensuales', 'Acceso limitado por zona y categoría'],
    pro:        ['Dashboard avanzado', 'Reportes semanales', 'Filtros completos', 'Exportación de datos agregados'],
    enterprise: ['API programática', 'Integraciones con sistemas internos', 'Reportes personalizados', 'Analítica histórica (36 meses)', 'Soporte dedicado'],
    research:   ['Reportes macro', 'Análisis sectorial', 'Series históricas (60 meses)', 'API con scope national:read'],
  }

  const features = PLAN_FEATURES[session!.user.plan] ?? []

  function usageBar(used: number, limit: number | null) {
    if (limit === null) return null
    const pct = Math.min((used / limit) * 100, 100)
    const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-400' : 'bg-brand-500'
    return (
      <div className="mt-1 h-1.5 bg-surface-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    )
  }

  return (
    <>
      <Header title="Mi cuenta" subtitle="Plan, uso y configuración institucional" />

      <main className="flex-1 p-8 space-y-6 max-w-4xl">

        {/* Institución y plan */}
        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-800 text-lg">{session!.user.institutionName}</h2>
              <p className="text-sm text-slate-500">{session!.user.email}</p>
            </div>
            <span className="badge bg-brand-100 text-brand-700 text-sm font-semibold uppercase tracking-wide px-3 py-1">
              {session!.user.plan}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Rol</span>
              <p className="font-medium capitalize text-slate-900 mt-0.5">{session!.user.role}</p>
            </div>
            <div>
              <span className="text-slate-500">Acceso histórico</span>
              <p className="font-medium text-slate-900 mt-0.5">{session!.user.historicalMonthsAccess} meses</p>
            </div>
            <div>
              <span className="text-slate-500">Scopes de API</span>
              <p className="font-medium text-slate-900 mt-0.5">
                {session!.user.allowedScopes.length > 0
                  ? session!.user.allowedScopes.join(', ')
                  : 'No aplica (plan sin API)'}
              </p>
            </div>
          </div>
        </div>

        {/* Uso del mes */}
        {usage && (
          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 mb-4">
              Uso del mes — {new Date().toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  label: 'API calls',
                  used:  usage.api_calls_used,
                  limit: usage.api_calls_limit,
                },
                {
                  label: 'Reportes descargados',
                  used:  usage.report_downloads_used,
                  limit: usage.report_downloads_limit,
                },
                {
                  label: 'Consultas al dashboard',
                  used:  usage.dashboard_queries_used,
                  limit: usage.dashboard_queries_limit,
                },
              ].map(({ label, used, limit }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-0.5">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-mono font-semibold text-slate-700">
                      {used.toLocaleString('es-GT')}
                      {limit !== null && ` / ${limit.toLocaleString('es-GT')}`}
                    </span>
                  </div>
                  {limit !== null ? usageBar(used, limit) : (
                    <p className="text-xs text-slate-400 mt-1">Sin límite</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features del plan */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Incluido en tu plan</h3>
          <ul className="space-y-2">
            {features.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                </svg>
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-surface-border">
            <p className="text-xs text-slate-400">
              Para cambios de plan, acceso a API o soporte, contacta a tu ejecutivo de cuenta en
              <a href="mailto:institucional@senal.app" className="text-brand-600 ml-1 hover:underline">
                institucional@senal.app
              </a>
            </p>
          </div>
        </div>

      </main>
    </>
  )
}
