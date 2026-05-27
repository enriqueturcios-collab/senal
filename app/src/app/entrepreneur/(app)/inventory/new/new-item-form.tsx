'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Category { id: number; name: string }

export function NewItemForm({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    price: '',
    currency: 'GTQ',
    stock_quantity: '1',
    condition: 'new',
  })

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(f => ({ ...f, [key]: e.target.value }))
    }
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags(ts => [...ts, t])
    }
    setTagInput('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/entrepreneur/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          category_id: form.category_id ? Number(form.category_id) : null,
          price: form.price ? Number(form.price) : null,
          stock_quantity: Number(form.stock_quantity),
          tags,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return }
      router.push('/entrepreneur/inventory')
      router.refresh()
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = `w-full rounded-xl px-3 py-2.5 text-[13px] text-signal-text
    outline-none transition-shadow focus:ring-2 focus:ring-[#5F6F52]/30`
  const inputStyle = { backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-[11px] font-semibold text-signal-text-muted mb-1.5 uppercase tracking-wider">
          Título *
        </label>
        <input value={form.title} onChange={set('title')} required
          placeholder="ej. Consultoría de marketing digital"
          className={inputCls} style={inputStyle} />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-signal-text-muted mb-1.5 uppercase tracking-wider">
          Descripción
        </label>
        <textarea value={form.description} onChange={set('description')} rows={3}
          placeholder="Describí brevemente tu producto o servicio…"
          className={inputCls + ' resize-none'} style={inputStyle} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-signal-text-muted mb-1.5 uppercase tracking-wider">
            Categoría
          </label>
          <select value={form.category_id} onChange={set('category_id')}
            className={inputCls} style={inputStyle}>
            <option value="">Sin categoría</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-signal-text-muted mb-1.5 uppercase tracking-wider">
            Condición
          </label>
          <select value={form.condition} onChange={set('condition')}
            className={inputCls} style={inputStyle}>
            <option value="new">Nuevo</option>
            <option value="used">Usado</option>
            <option value="refurbished">Reacondicionado</option>
            <option value="service">Servicio</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-signal-text-muted mb-1.5 uppercase tracking-wider">
            Precio
          </label>
          <div className="flex gap-2">
            <select value={form.currency} onChange={set('currency')}
              className="rounded-xl px-2 py-2.5 text-[12px] text-signal-text outline-none w-20"
              style={inputStyle}>
              <option value="GTQ">GTQ</option>
              <option value="USD">USD</option>
            </select>
            <input type="number" min="0" step="0.01" value={form.price} onChange={set('price')}
              placeholder="0.00"
              className={inputCls + ' flex-1'} style={inputStyle} />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-signal-text-muted mb-1.5 uppercase tracking-wider">
            Stock disponible
          </label>
          <input type="number" min="0" value={form.stock_quantity} onChange={set('stock_quantity')}
            className={inputCls} style={inputStyle} />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-[11px] font-semibold text-signal-text-muted mb-1.5 uppercase tracking-wider">
          Etiquetas (hasta 10)
        </label>
        <div className="flex gap-2">
          <input value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
            placeholder="ej. diseño gráfico"
            className={inputCls + ' flex-1'} style={inputStyle} />
          <button type="button" onClick={addTag}
            className="px-3 py-2 rounded-xl text-[12px] font-semibold text-white"
            style={{ backgroundColor: '#5F6F52' }}>
            +
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map(t => (
              <span key={t} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#F1ECE2', color: '#7A7468' }}>
                {t}
                <button type="button" onClick={() => setTags(ts => ts.filter(x => x !== t))}
                        className="text-[10px] hover:text-signal-text">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-[12px] font-semibold rounded-xl px-4 py-3"
           style={{ backgroundColor: '#FDF3EE', border: '1px solid #F0D9CE', color: '#B8795B' }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => router.back()}
          className="flex-1 py-3 rounded-xl text-[13px] font-semibold transition-colors"
          style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8', color: '#4D4A43' }}>
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 py-3 rounded-xl text-[13px] font-semibold text-white
                     hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ backgroundColor: '#5F6F52' }}>
          {loading ? 'Guardando…' : 'Guardar item'}
        </button>
      </div>
    </form>
  )
}
