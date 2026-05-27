'use client'

import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { createDemand } from '@/actions/demands'
import { ImageUpload } from '@/components/ui/image-upload'
import { MarketPriceCard } from '@/components/ui/market-price-card'

interface Category { id: number; parent_id: number | null; name: string; level: number }
interface Zone { id: number; name: string; municipality: string; department: string }

const inputCls = `w-full rounded-xl px-4 py-3 text-[14px] text-signal-text
  outline-none placeholder:text-signal-ash transition-all duration-150`
const selectCls = `w-full rounded-xl px-3 py-3 text-[14px] text-signal-text
  outline-none transition-all duration-150 cursor-pointer`
const labelCls = 'block text-[13px] font-medium text-signal-text-soft mb-1.5'
const inputStyle = { backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }

export function NewDemandForm({
  categories,
  zones,
}: {
  categories: Category[]
  zones: Zone[]
}) {
  const { data: session } = useSession()
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [selectedCat, setSelectedCat] = useState<number | null>(null)
  const [priceKeywords, setPriceKeywords] = useState('')
  const keywordsDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const topLevel      = categories.filter(c => c.level === 0)
  const subCategories = selectedCat
    ? categories.filter(c => c.parent_id === selectedCat)
    : []

  const deptMap = new Map<string, Zone[]>()
  for (const z of zones) {
    const key = z.department
    if (!deptMap.has(key)) deptMap.set(key, [])
    deptMap.get(key)!.push(z)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!session) return
    setError('')
    setLoading(true)

    const fd     = new FormData(e.currentTarget)
    const result = await createDemand(session.user.id, fd)

    if (result && 'error' in result) {
      setError(result.error)
      setLoading(false)
    }
  }

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#5F6F52'
    e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(95,111,82,0.08)'
  }
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#DED6C8'
    e.currentTarget.style.boxShadow   = 'none'
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-28">
      {error && (
        <div className="rounded-xl px-4 py-3"
             style={{ backgroundColor: 'rgba(184,121,91,0.08)', border: '1px solid rgba(184,121,91,0.2)' }}>
          <p className="text-[13px] font-medium" style={{ color: '#B8795B' }}>{error}</p>
        </div>
      )}

      <div>
        <label className={labelCls}>
          ¿Qué necesitas? <span style={{ color: '#B8795B' }}>*</span>
        </label>
        <input
          name="title" type="text" required minLength={5} maxLength={120}
          placeholder="Ej: Instalación de piso cerámico 50m²"
          className={inputCls} style={inputStyle}
          onFocus={focusStyle} onBlur={blurStyle}
          onChange={e => {
            const val = e.target.value
            if (keywordsDebounce.current) clearTimeout(keywordsDebounce.current)
            keywordsDebounce.current = setTimeout(() => setPriceKeywords(val), 700)
          }}
        />
      </div>

      <div>
        <label className={labelCls}>
          Descripción <span style={{ color: '#B8795B' }}>*</span>
        </label>
        <textarea
          name="description" required minLength={20} maxLength={2000} rows={4}
          placeholder="Detalla lo que necesitas: materiales, medidas, fechas, condiciones especiales…"
          className={`${inputCls} resize-none`} style={inputStyle}
          onFocus={focusStyle} onBlur={blurStyle}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>
            Categoría <span style={{ color: '#B8795B' }}>*</span>
          </label>
          <select
            name="category_id" required
            onChange={e => setSelectedCat(Number(e.target.value))}
            className={selectCls} style={inputStyle}
            onFocus={focusStyle} onBlur={blurStyle}
          >
            <option value="">Seleccionar</option>
            {topLevel.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {subCategories.length > 0 && (
          <div>
            <label className={labelCls}>Subcategoría</label>
            <select name="subcategory_id" className={selectCls} style={inputStyle}
                    onFocus={focusStyle} onBlur={blurStyle}>
              <option value="">Todas</option>
              {subCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className={labelCls}>Zona</label>
        <select name="zone_id" className={selectCls} style={inputStyle}
                onFocus={focusStyle} onBlur={blurStyle}>
          <option value="">Todo Guatemala</option>
          {Array.from(deptMap.entries()).map(([dept, zns]) => (
            <optgroup key={dept} label={dept}>
              {zns.map(z => (
                <option key={z.id} value={z.id}>{z.name} — {z.municipality}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Presupuesto mín.</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-signal-ash">Q</span>
            <input name="budget_min" type="number" min={0} placeholder="0"
                   className={`${inputCls} pl-7`} style={inputStyle}
                   onFocus={focusStyle} onBlur={blurStyle} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Presupuesto máx.</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-signal-ash">Q</span>
            <input name="budget_max" type="number" min={0} placeholder="Sin límite"
                   className={`${inputCls} pl-7`} style={inputStyle}
                   onFocus={focusStyle} onBlur={blurStyle} />
          </div>
        </div>
      </div>

      <input type="hidden" name="currency" value="GTQ" />

      <MarketPriceCard
        categoryId={selectedCat ?? undefined}
        keywords={priceKeywords || undefined}
      />

      <div>
        <label className={labelCls}>
          Urgencia <span style={{ color: '#B8795B' }}>*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'low',       label: 'Sin prisa',   desc: 'Cuando puedan' },
            { value: 'medium',    label: 'Esta semana', desc: 'Próximos días' },
            { value: 'high',      label: 'Urgente',     desc: 'Hoy o mañana' },
            { value: 'immediate', label: 'Inmediato',   desc: 'Ahora mismo' },
          ].map(opt => (
            <label
              key={opt.value}
              className="flex items-center gap-3 rounded-xl p-3 cursor-pointer
                         transition-all duration-150"
              style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}
            >
              <input type="radio" name="urgency" value={opt.value} required
                     className="accent-signal-forest" />
              <div>
                <div className="text-[13px] font-medium text-signal-text">{opt.label}</div>
                <div className="text-[11px] text-signal-ash">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>
          Etiquetas
          <span className="text-signal-ash font-normal ml-1 text-[11px]">
            (separadas por coma, máx. 5)
          </span>
        </label>
        <input
          name="tags" type="text"
          placeholder="Ej: urgente, residencial, pintura"
          className={inputCls} style={inputStyle}
          onFocus={focusStyle} onBlur={blurStyle}
        />
      </div>

      <div>
        <label className={labelCls}>Fotos</label>
        <ImageUpload max={4} label="Añadir fotos" />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" name="is_anonymous" value="true"
               className="w-4 h-4 accent-signal-forest" />
        <span className="text-[13px] text-signal-text-soft">
          Publicar de forma anónima
          <span className="block text-[11px] text-signal-ash">
            Tu nombre no aparecerá en el feed
          </span>
        </span>
      </label>

      {/* Sticky submit */}
      <div className="fixed bottom-0 inset-x-0 p-4 safe-bottom glass-warm"
           style={{ backgroundColor: 'rgba(247,243,234,0.92)', borderTop: '1px solid #DED6C8' }}>
        <button
          type="submit" disabled={loading}
          className="w-full text-white font-semibold py-3.5 rounded-xl
                     hover:opacity-90 disabled:opacity-50 transition-all shadow-button
                     text-[14px]"
          style={{ backgroundColor: '#4D4A43' }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin" />
              Publicando…
            </span>
          ) : 'Publicar demanda'}
        </button>
      </div>
    </form>
  )
}
