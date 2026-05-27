import { getInstitutionalSession } from '@/lib/institutional-auth'
import { getAccessLogs } from '@/lib/institutional-data'

export default async function AccessLogsPage() {
  const session = await getInstitutionalSession()
  if (!session) return null

  const logs = await getAccessLogs(session.iid, 50)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F3EA' }}>
      <div className="max-w-5xl mx-auto px-6 py-8 pb-16">
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-signal-ash mb-1">Auditoría</p>
          <h1 className="text-[28px] font-bold text-signal-text" style={{ letterSpacing: '-0.025em' }}>
            Log de acceso
          </h1>
          <p className="text-[14px] text-signal-text-muted mt-1">
            Registro de todas las consultas realizadas por tu institución.
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', boxShadow: '0 2px 8px rgba(46,42,36,0.04)' }}>
          {logs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[14px] text-signal-text-muted">Sin registros de acceso aún.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead style={{ backgroundColor: '#F1ECE2' }}>
                  <tr>
                    {['Endpoint', 'Método', 'Status', 'Filas', 'Fecha y hora'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-signal-ash font-semibold uppercase tracking-wider text-[10px]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1ECE2' }}>
                      <td className="px-5 py-3 font-medium text-signal-text">{log.endpoint}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                              style={{ backgroundColor: '#EEF1EA', color: '#5F6F52' }}>
                          {log.http_method}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`font-semibold`}
                              style={{ color: log.http_status < 300 ? '#5F6F52' : '#B8795B' }}>
                          {log.http_status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-signal-text-muted">{log.response_rows ?? '—'}</td>
                      <td className="px-5 py-3 text-signal-text-muted">
                        {new Date(log.accessed_at).toLocaleString('es-GT')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
