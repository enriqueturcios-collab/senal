import { getInstitutionalSession } from '@/lib/institutional-auth'
import { logInstitutionalAccess } from '@/lib/institutional-data'
import { query } from '@/db'

interface Alert {
  id: string
  alert_type: string
  severity: string
  title: string
  description: string | null
  metrics: Record<string, unknown> | null
  created_at: string
  read_at: string | null
  dismissed_at: string | null
}

async function getAlerts(institutionId: string): Promise<Alert[]> {
  return query<Alert>(`
    SELECT id::text, alert_type, severity, title, description,
           metrics, created_at::text, read_at::text, dismissed_at::text
    FROM b2b.market_alerts
    WHERE institution_id = $1
      AND dismissed_at IS NULL
    ORDER BY created_at DESC
    LIMIT 50
  `, [institutionId])
}

const SEVERITY_CONFIG = {
  warning: { label: 'Advertencia', bg: 'rgba(184,121,91,0.1)', border: 'rgba(184,121,91,0.25)', text: '#B8795B', dot: '#B8795B' },
  info:    { label: 'Info',        bg: 'rgba(95,111,82,0.08)',  border: 'rgba(95,111,82,0.2)',   text: '#5F6F52', dot: '#5F6F52' },
  error:   { label: 'Crítico',     bg: 'rgba(155,58,58,0.08)', border: 'rgba(155,58,58,0.2)',   text: '#9B3A3A', dot: '#9B3A3A' },
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  demand_spike:       'Pico de demanda',
  unmet_demand:       'Demanda insatisfecha',
  price_change:       'Cambio de precios',
  market_saturation:  'Saturación de mercado',
  seasonal_pattern:   'Patrón estacional',
  new_competitor:     'Nuevo competidor',
  liquidity_drop:     'Caída de liquidez',
}

function AlertCard({ alert }: { alert: Alert }) {
  const sev = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.info
  const isUnread = !alert.read_at
  const dateStr = new Date(alert.created_at).toLocaleDateString('es-GT', {
    year: 'numeric', month: 'short', day: 'numeric'
  })

  return (
    <div className="rounded-2xl p-5"
         style={{
           backgroundColor: '#FFFDF8',
           border: `1px solid ${sev.border}`,
           boxShadow: '0 2px 8px rgba(46,42,36,0.04)',
         }}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sev.dot }} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: sev.text }}>
                {sev.label}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(46,42,36,0.06)', color: '#7A7468' }}>
                {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
              </span>
              {isUnread && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#B8946F' }} title="No leída" />
              )}
            </div>
          </div>
        </div>
        <span className="text-[11px] shrink-0" style={{ color: '#A7A196' }}>{dateStr}</span>
      </div>

      <h3 className="text-[15px] font-bold text-signal-text mb-2" style={{ letterSpacing: '-0.01em' }}>
        {alert.title}
      </h3>

      {alert.description && (
        <p className="text-[13px] leading-relaxed mb-3" style={{ color: '#4D4A43' }}>
          {alert.description}
        </p>
      )}

      {alert.metrics && Object.keys(alert.metrics).length > 0 && (
        <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: '1px solid #EAE3D6' }}>
          {Object.entries(alert.metrics).slice(0, 4).map(([key, val]) => {
            if (Array.isArray(val)) return null
            return (
              <div key={key} className="px-3 py-1.5 rounded-lg text-[11px]"
                   style={{ backgroundColor: sev.bg, color: sev.text }}>
                <span className="font-semibold capitalize">{key.replace(/_/g, ' ')}: </span>
                <span>{typeof val === 'number' ? (val > 1 ? val : `${Math.round((val as number) * 100)}%`) : String(val)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default async function AlertsPage() {
  const session = await getInstitutionalSession()
  if (!session) return null

  const alerts = await getAlerts(session.iid)
  const unreadCount = alerts.filter(a => !a.read_at).length

  void logInstitutionalAccess({
    institutionId: session.iid,
    userId: session.uid,
    endpoint: '/institutional/alerts',
    responseRows: alerts.length,
  })

  const warnings = alerts.filter(a => a.severity === 'warning')
  const infos    = alerts.filter(a => a.severity === 'info')
  const errors   = alerts.filter(a => a.severity === 'error')
  const grouped  = [...errors, ...warnings, ...infos]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F3EA' }}>
      <div className="max-w-3xl mx-auto px-6 py-8 pb-16">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#A7A196' }}>
              Demand Intelligence
            </p>
            <h1 className="text-[28px] font-bold text-signal-text" style={{ letterSpacing: '-0.025em' }}>
              Alertas de mercado
            </h1>
            <p className="text-[14px] text-signal-text-muted mt-1">
              Cambios y señales relevantes detectadas por Signal.
            </p>
          </div>
          {unreadCount > 0 && (
            <div className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold"
                 style={{ backgroundColor: 'rgba(184,121,91,0.12)', color: '#B8795B' }}>
              {unreadCount} sin leer
            </div>
          )}
        </div>

        {/* Summary strip */}
        {alerts.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Críticas', count: errors.length, color: '#9B3A3A' },
              { label: 'Advertencias', count: warnings.length, color: '#B8795B' },
              { label: 'Informativas', count: infos.length, color: '#5F6F52' },
            ].map(item => (
              <div key={item.label} className="rounded-2xl px-4 py-3 text-center"
                   style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
                <p className="text-[24px] font-bold leading-none" style={{ color: item.color }}>{item.count}</p>
                <p className="text-[11px] mt-1" style={{ color: '#A7A196' }}>{item.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Alerts list */}
        {grouped.length === 0 ? (
          <div className="rounded-2xl p-12 text-center"
               style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                 style={{ backgroundColor: '#EEF1EA' }}>
              <svg className="w-6 h-6" style={{ color: '#5F6F52' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[16px] font-semibold text-signal-text mb-2">Sin alertas activas</p>
            <p className="text-[13px]" style={{ color: '#A7A196' }}>
              No hay alertas de mercado para tu institución en este momento.
              Signal monitorea continuamente y te avisará cuando detecte cambios relevantes.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}

        <div className="mt-8 rounded-2xl p-4"
             style={{ backgroundColor: '#EEF1EA', border: '1px solid rgba(95,111,82,0.2)' }}>
          <p className="text-[12px]" style={{ color: '#4D4A43' }}>
            <span className="font-semibold" style={{ color: '#5F6F52' }}>Sobre las alertas: </span>
            Signal genera alertas automáticas basadas en cambios estadísticos significativos en el marketplace.
            Las alertas son indicativas y deben interpretarse con el contexto del analista.
          </p>
        </div>
      </div>
    </div>
  )
}
