'use client'

import { useState, useEffect, useRef } from 'react'

interface PriceData {
  sample_size: number
  median_price: number | null
  p25: number | null; p75: number | null
  p10: number | null; p90: number | null
  avg_price: number | null
  confidence: string
}

interface MarketPriceCardProps {
  categoryId?: number
  keywords?: string
}

function fmtQ(v: number | null | undefined) {
  if (v == null) return '—'
  return `Q${Math.round(v).toLocaleString('es-GT')}`
}

function PriceBar({ value, min, max, color }: { value: number; min: number; max: number; color: string }) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 50
  return (
    <div className="relative h-2 rounded-full w-full" style={{ backgroundColor: '#EAE3D6' }}>
      <div className="absolute top-0 left-0 h-full rounded-full"
           style={{ width: `${Math.min(Math.max(pct, 5), 95)}%`, backgroundColor: color }} />
    </div>
  )
}

export function MarketPriceCard({ categoryId, keywords }: MarketPriceCardProps) {
  const [data, setData]       = useState<PriceData | null>(null)
  const [loading, setLoading] = useState(false)
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!categoryId && !keywords) { setData(null); return }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const params = new URLSearchParams()
      if (categoryId) params.set('category', String(categoryId))
      if (keywords)   params.set('q', keywords)
      try {
        const res  = await fetch(`/api/market-price?${params}`)
        const json = await res.json()
        setData(json)
      } finally {
        setLoading(false)
      }
    }, 600)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [categoryId, keywords])

  if (!categoryId && !keywords) return null
  if (loading) {
    return (
      <div className="rounded-2xl px-4 py-3 flex items-center gap-2"
           style={{ backgroundColor: '#EEF1EA', border: '1px solid rgba(95,111,82,0.2)' }}>
        <div className="w-3.5 h-3.5 border-2 rounded-full border-signal-ash border-t-signal-forest animate-spin shrink-0" />
        <span className="text-[12px] text-signal-text-muted">Calculando precio de mercado…</span>
      </div>
    )
  }
  if (!data || data.sample_size < 2) {
    return (
      <div className="rounded-xl px-4 py-3"
           style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}>
        <p className="text-[12px] text-signal-text-muted">
          Sin suficientes señales de precio en esta categoría aún.
        </p>
      </div>
    )
  }

  const confidenceMap: Record<string, { label: string; color: string }> = {
    high:   { label: 'Confianza alta',  color: '#5F6F52' },
    medium: { label: 'Confianza media', color: '#B8946F' },
    low:    { label: 'Confianza baja',  color: '#A7A196' },
  }
  const conf = confidenceMap[data.confidence] ?? confidenceMap.low

  return (
    <div className="rounded-2xl p-4"
         style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', boxShadow: '0 2px 8px rgba(46,42,36,0.04)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#5F6F52' }} />
          <span className="text-[12px] font-semibold text-signal-text">Referencia de mercado</span>
        </div>
        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: `${conf.color}18`, color: conf.color }}>
          {conf.label} · {data.sample_size} señales
        </span>
      </div>

      {/* Median */}
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-[26px] font-bold text-signal-text" style={{ letterSpacing: '-0.025em' }}>
          {fmtQ(data.median_price)}
        </span>
        <span className="text-[12px] text-signal-ash">mediana observada</span>
      </div>

      {/* Range bar */}
      {data.p10 != null && data.p90 != null && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-signal-ash">{fmtQ(data.p10)}</span>
            <span className="text-[11px] text-signal-ash">{fmtQ(data.p90)}</span>
          </div>
          <PriceBar value={data.median_price ?? 0} min={data.p10} max={data.p90} color="#5F6F52" />
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-signal-ash">P10</span>
            <span className="text-[10px] text-signal-ash">P90</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-3" style={{ borderTop: '1px solid #EAE3D6' }}>
        <div>
          <p className="text-[10px] text-signal-ash">Rango bajo</p>
          <p className="text-[13px] font-semibold text-signal-text">{fmtQ(data.p25)}</p>
        </div>
        <div>
          <p className="text-[10px] text-signal-ash">Rango alto</p>
          <p className="text-[13px] font-semibold text-signal-text">{fmtQ(data.p75)}</p>
        </div>
      </div>
    </div>
  )
}

// Inline version for use inside forms
export function MarketPriceInlineHint({ budgetMax, p25, p75, median }: {
  budgetMax?: number; p25?: number; p75?: number; median?: number
}) {
  if (!median || !budgetMax) return null
  const ratio = budgetMax / median
  if (ratio < 0.5) {
    return (
      <div className="flex items-start gap-2 mt-1.5">
        <span className="text-[14px]" style={{ color: '#B8795B' }}>⚠</span>
        <p className="text-[12px]" style={{ color: '#B8795B' }}>
          Tu presupuesto está {Math.round((1 - ratio) * 100)}% por debajo del precio mediano observado (
          {fmtQ(median)}). Puede que recibas pocas ofertas.
        </p>
      </div>
    )
  }
  if (ratio > 2.5) {
    return (
      <p className="text-[12px] text-signal-ash mt-1.5">
        Tu presupuesto está por encima del rango habitual ({fmtQ(p25)}–{fmtQ(p75)}).
      </p>
    )
  }
  return (
    <p className="text-[12px] mt-1.5" style={{ color: '#5F6F52' }}>
      ✓ Tu presupuesto está dentro del rango observado ({fmtQ(p25)}–{fmtQ(p75)}).
    </p>
  )
}

// Locked version for public users
export function LockedInsightCard({ title, preview }: { title: string; preview?: string }) {
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden"
         style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', boxShadow: '0 2px 8px rgba(46,42,36,0.04)' }}>
      {/* Blurred preview */}
      {preview && (
        <div className="absolute inset-0 flex items-center justify-center"
             style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(247,243,234,0.7)' }} />
      )}
      <div className="relative flex flex-col items-center text-center py-4 gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
             style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}>
          <svg className="w-5 h-5" style={{ color: '#A7A196' }} fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={1.75}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path strokeLinecap="round" d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-signal-text mb-1">{title}</p>
          <p className="text-[12px] text-signal-text-muted">
            Esta información forma parte de{' '}
            <span className="font-semibold" style={{ color: '#5F6F52' }}>Demand Intelligence</span>.
            Solicita acceso institucional para ver datos accionables de mercado.
          </p>
        </div>
        <a href="/institutional/login"
           className="text-white text-[12px] font-semibold px-4 py-2 rounded-xl
                      hover:opacity-90 transition-all shadow-button"
           style={{ backgroundColor: '#4D4A43' }}>
          Acceso institucional
        </a>
      </div>
    </div>
  )
}
