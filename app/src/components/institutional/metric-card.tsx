interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: string
  small?: boolean
}

export function MetricCard({ label, value, sub, accent = '#5F6F52', small = false }: MetricCardProps) {
  return (
    <div className="rounded-2xl px-5 py-4 flex flex-col gap-1"
         style={{
           backgroundColor: '#FFFDF8',
           border: '1px solid #DED6C8',
           boxShadow: '0 2px 8px rgba(46,42,36,0.04)',
           borderTop: `3px solid ${accent}`,
         }}>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-signal-ash">{label}</p>
      <p className={`font-bold text-signal-text leading-none`}
         style={{ fontSize: small ? '22px' : '32px', letterSpacing: '-0.03em', color: accent === '#5F6F52' ? '#171714' : accent }}>
        {value}
      </p>
      {sub && <p className="text-[12px] text-signal-text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

export function ConfidenceBadge({ level }: { level: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    high:   { label: 'Confianza alta',   bg: 'rgba(95,111,82,0.12)',   text: '#5F6F52' },
    medium: { label: 'Confianza media',  bg: 'rgba(184,148,111,0.12)', text: '#8A684B' },
    low:    { label: 'Confianza baja',   bg: 'rgba(167,161,150,0.15)', text: '#7A7468' },
  }
  const s = map[level] ?? map.low
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: s.bg, color: s.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.text }} />
      {s.label}
    </span>
  )
}

export function InstitutionalDisclaimer() {
  return (
    <div className="rounded-2xl px-5 py-4 flex items-start gap-3"
         style={{ backgroundColor: '#F5EDE6', border: '1px solid rgba(184,121,91,0.2)' }}>
      <span className="text-[18px] shrink-0 mt-0.5">⚠</span>
      <p className="text-[12px] text-signal-text-muted leading-relaxed">
        <span className="font-semibold text-signal-text">Aviso legal: </span>
        Esta información es inteligencia agregada de mercado y{' '}
        <strong>no constituye recomendación crediticia ni decisión automática de crédito.</strong>{' '}
        Los datos son estadísticos y agregados. No se expone información personal identificable.
        El uso de esta plataforma está sujeto al contrato de licencia de datos.
      </p>
    </div>
  )
}

// Simple CSS bar chart — no libraries needed
export function BarChart({ data, maxValue, color = '#5F6F52', height = 80 }: {
  data: { label: string; value: number }[]
  maxValue?: number
  color?: string
  height?: number
}) {
  const max = maxValue ?? Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1.5 w-full" style={{ height }}>
      {data.map(({ label, value }) => {
        const pct = (value / max) * 100
        return (
          <div key={label} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <span className="text-[9px] text-signal-ash font-medium truncate w-full text-center hidden sm:block">
              {value}
            </span>
            <div className="w-full rounded-t-md transition-all duration-300"
                 style={{ height: `${Math.max(pct * (height - 20) / 100, 2)}px`, backgroundColor: color, opacity: 0.85 }} />
            <span className="text-[8px] text-signal-ash truncate w-full text-center"
                  style={{ fontSize: '9px' }}>
              {label.length > 8 ? label.slice(0, 7) + '…' : label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function IndexGauge({ value, label, color }: { value: number; label: string; color: string }) {
  const pct = Math.min(Math.max(value, 0), 100)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-signal-text-soft">{label}</span>
        <span className="text-[13px] font-bold" style={{ color }}>{pct.toFixed(0)}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#EAE3D6' }}>
        <div className="h-full rounded-full transition-all duration-500"
             style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}
