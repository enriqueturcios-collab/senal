'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUploadControlled } from '@/components/ui/image-upload-controlled'

interface Category     { id: number; name: string }
interface Municipality { id: number; name: string }

const CONDITION_OPTIONS = [
  { value: 'service',     label: 'Servicio' },
  { value: 'new',         label: 'Producto nuevo' },
  { value: 'used',        label: 'Producto usado' },
  { value: 'refurbished', label: 'Reacondicionado' },
]

const EXPIRY_OPTIONS = [
  { value: 15,  label: '15 días' },
  { value: 30,  label: '1 mes' },
  { value: 60,  label: '2 meses' },
  { value: 0,   label: 'Sin vencimiento' },
]

export function NewOfferForm({ categories, municipalities }: {
  categories: Category[]; municipalities: Municipality[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '', description: '', category_id: '',
    price: '', max_price: '', currency: 'GTQ',
    condition: 'service', expires_days: 30,
  })
  const [tagInput, setTagInput]           = useState('')
  const [tags, setTags]                   = useState<string[]>([])
  const [selectedMunis, setSelectedMunis] = useState<number[]>([])
  const [images, setImages]               = useState<string[]>([])

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t) && tags.length < 10) setTags(ts => [...ts, t])
    setTagInput('')
  }
  function toggleMuni(id: number) {
    setSelectedMunis(ms => ms.includes(id) ? ms.filter(m => m !== id) : [...ms, id])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/entrepreneur/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          category_id:      form.category_id ? Number(form.category_id) : null,
          price:            form.price       ? Number(form.price)       : null,
          max_price:        form.max_price   ? Number(form.max_price)   : null,
          tags,
          municipality_ids: selectedMunis,
          expires_days:     form.expires_days || null,
          images,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return }
      router.push(`/offers/${data.id}`)
      router.refresh()
    } catch { setError('Error de red') }
    finally { setLoading(false) }
  }

  const inp = `w-full rounded-xl px-3 py-2.5 text-[13px] text-signal-text outline-none
               focus:ring-2 focus:ring-[#5F6F52]/30`
  const inpStyle = { backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }
  const lbl = `block text-[11px] font-semibold text-signal-text-muted mb-1.5 uppercase tracking-wider`

  return (
    <form onSubmit={submit} className="space-y-5">

      {/* Título */}
      <div>
        <label className={lbl}>Título *</label>
        <input value={form.title} onChange={set('title')} required
          placeholder="ej. Diseño de logo profesional, Instalación eléctrica residencial…"
          className={inp} style={inpStyle} />
      </div>

      {/* Descripción */}
      <div>
        <label className={lbl}>Descripción</label>
        <textarea value={form.description} onChange={set('description')} rows={4}
          placeholder="Describí qué ofrecés, qué incluye, tiempos de entrega, experiencia…"
          className={inp + ' resize-none'} style={inpStyle} />
      </div>

      {/* Fotos */}
      <div>
        <label className={lbl}>Fotos</label>
        <ImageUploadControlled urls={images} onChange={setImages} max={6} />
      </div>

      {/* Categoría + Condición */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Categoría</label>
          <select value={form.category_id} onChange={set('category_id')} className={inp} style={inpStyle}>
            <option value="">Sin categoría</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Tipo</label>
          <select value={form.condition} onChange={set('condition')} className={inp} style={inpStyle}>
            {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Precio */}
      <div>
        <label className={lbl}>Precio (rango opcional)</label>
        <div className="flex gap-2 items-center">
          <select value={form.currency} onChange={set('currency')}
            className="rounded-xl px-2 py-2.5 text-[12px] outline-none w-20" style={inpStyle}>
            <option value="GTQ">GTQ</option>
            <option value="USD">USD</option>
          </select>
          <input type="number" min="0" step="0.01" value={form.price} onChange={set('price')}
            placeholder="Desde" className={inp + ' flex-1'} style={inpStyle} />
          <span className="text-signal-ash text-[12px]">–</span>
          <input type="number" min="0" step="0.01" value={form.max_price} onChange={set('max_price')}
            placeholder="Hasta" className={inp + ' flex-1'} style={inpStyle} />
        </div>
        <p className="text-[10px] text-signal-ash mt-1">Dejá ambos en blanco para "precio a convenir"</p>
      </div>

      {/* Tags */}
      <div>
        <label className={lbl}>Keywords / etiquetas</label>
        <div className="flex gap-2">
          <input value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
            placeholder="ej. urgente, entrega inmediata, garantía..."
            className={inp + ' flex-1'} style={inpStyle} />
          <button type="button" onClick={addTag}
            className="px-3 py-2 rounded-xl text-[12px] font-semibold text-white"
            style={{ backgroundColor: '#5F6F52' }}>+</button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map(t => (
              <span key={t} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full animate-pop"
                    style={{ backgroundColor: 'rgba(95,111,82,0.1)', color: '#5F6F52' }}>
                {t}
                <button type="button" onClick={() => setTags(ts => ts.filter(x => x !== t))}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Cobertura */}
      <div>
        <label className={lbl}>Municipios de cobertura</label>
        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
          {municipalities.map(m => (
            <button key={m.id} type="button" onClick={() => toggleMuni(m.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-[12px] font-medium"
              style={{
                backgroundColor: selectedMunis.includes(m.id) ? '#EEF1EA' : '#FFFDF8',
                border: `1px solid ${selectedMunis.includes(m.id) ? 'rgba(95,111,82,0.3)' : '#DED6C8'}`,
                color: selectedMunis.includes(m.id) ? '#5F6F52' : '#4D4A43',
              }}>
              {selectedMunis.includes(m.id) && <span className="text-[10px]">✓</span>}
              {m.name}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setSelectedMunis(municipalities.map(m => m.id))}
          className="mt-2 text-[11px] font-semibold underline" style={{ color: '#A7A196' }}>
          Seleccionar todos
        </button>
      </div>

      {/* Vencimiento */}
      <div>
        <label className={lbl}>Vencimiento de la oferta</label>
        <div className="flex flex-wrap gap-2">
          {EXPIRY_OPTIONS.map(o => (
            <button key={o.value} type="button"
              onClick={() => setForm(f => ({ ...f, expires_days: o.value }))}
              className="text-[12px] font-medium px-3 py-1.5 rounded-full"
              style={{
                backgroundColor: form.expires_days === o.value ? '#EEF1EA' : '#F1ECE2',
                border: `1px solid ${form.expires_days === o.value ? 'rgba(95,111,82,0.3)' : '#DED6C8'}`,
                color: form.expires_days === o.value ? '#5F6F52' : '#7A7468',
              }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-[12px] font-semibold rounded-xl px-4 py-3"
           style={{ backgroundColor: '#FDF3EE', border: '1px solid #F0D9CE', color: '#B8795B' }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => router.back()}
          className="flex-1 py-3 rounded-xl text-[13px] font-semibold"
          style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8', color: '#4D4A43' }}>
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="btn-primary flex-1 py-3 rounded-xl text-[13px] font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: '#5F6F52' }}>
          {loading ? 'Publicando…' : 'Publicar oferta →'}
        </button>
      </div>
    </form>
  )
}
