import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Header } from '@/components/layout/header'
import { query } from '@/db'
import { NewReportButton } from './new-report-button'

export const metadata: Metadata = { title: 'Reportes' }

const STATUS_STYLES: Record<string, string> = {
  ready:      'bg-emerald-100 text-emerald-700',
  generating: 'bg-amber-100 text-amber-700',
  queued:     'bg-blue-100 text-blue-700',
  failed:     'bg-red-100 text-red-700',
  expired:    'bg-slate-100 text-slate-500',
}

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)

  const reports = await query<{
    id: string; report_type: string; title: string
    status: string; file_format: string; file_size_bytes: number | null
    generated_at: string | null; expires_at: string | null
    created_at: string; download_count: number
  }>(`
    SELECT id, report_type, title, status, file_format, file_size_bytes,
           generated_at::text, expires_at::text, created_at::text, download_count
    FROM b2b.reports
    WHERE institution_id = $1
    ORDER BY created_at DESC
    LIMIT 50
  `, [session!.user.institutionId])

  return (
    <>
      <Header title="Reportes" subtitle="Descarga y solicita reportes de inteligencia de demanda" />

      <main className="flex-1 p-8 space-y-6">

        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-500">{reports.length} reporte(s) en tu cuenta</p>
          <NewReportButton />
        </div>

        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-muted">
                <tr>
                  <th className="th">Reporte</th>
                  <th className="th">Tipo</th>
                  <th className="th text-center">Estado</th>
                  <th className="th">Formato</th>
                  <th className="th">Generado</th>
                  <th className="th">Vence</th>
                  <th className="th text-right">Descargas</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {reports.map(r => (
                  <tr key={r.id} className="hover:bg-surface-muted">
                    <td className="td">
                      <div className="font-medium text-slate-800 max-w-xs truncate">{r.title}</div>
                      <div className="text-xs text-slate-400 font-mono">{r.id.slice(0, 8)}…</div>
                    </td>
                    <td className="td text-slate-500 text-xs">{r.report_type.replace(/_/g, ' ')}</td>
                    <td className="td text-center">
                      <span className={`badge ${STATUS_STYLES[r.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="td text-xs uppercase text-slate-500">{r.file_format}</td>
                    <td className="td text-xs text-slate-500">
                      {r.generated_at ? r.generated_at.slice(0, 16).replace('T', ' ') : '—'}
                    </td>
                    <td className="td text-xs text-slate-500">
                      {r.expires_at ? r.expires_at.slice(0, 10) : '—'}
                    </td>
                    <td className="td text-right text-slate-600">{r.download_count}</td>
                    <td className="td">
                      {r.status === 'ready' && (
                        <button className="text-xs text-brand-600 hover:underline">
                          Descargar
                        </button>
                      )}
                      {r.status === 'generating' && (
                        <span className="text-xs text-amber-500">Procesando…</span>
                      )}
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={8} className="td text-center text-slate-400 py-12">
                      No tienes reportes aún. Solicita uno con el botón &quot;Nuevo reporte&quot;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  )
}
