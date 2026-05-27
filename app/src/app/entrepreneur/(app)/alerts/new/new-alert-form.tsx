'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Category { id: number; name: string }

export function NewAlertForm({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kwInput, setKwInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [selectedCats, setSelectedCats] = useState<number[]>([])
  const [name, setName] = useState('')
  const [urgencies, setUrgencies] = useState<string[]>([])
  const [budgetMin, setBudgetMin] = useState('')

  function addKeyword() {
    const kw = kwInput.trim().toLowerCase()
    if (kw && !keywords.includes(kw) && keywords.length < 10) {
      setKeywords(ks => [...ks, kw])
    }
    setKwInput('')
  }

  function toggleCat(id: number) {
    setSelectedCats(cs => cs.includes(id) ? cs.filter(c => c !== id) : [...cs, id])
  }

  function toggleUrgency(u: string) {
    setUrgencies(us => us.includes(u) ? us.filter(x => x !== u) : [...us, u])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Nombre requerido'); return }
    if (keywords.length === 0 && selectedCats.length === 0) {
      setError('Agregá al menos una keyword o categoría'); return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/entrepreneur/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          keywords,
          category_ids: selectedCats,
          urgency_filter: urgencies,
          budget_min: budgetMin ? Number(budgetMin) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return }
      router.push('/entrepreneur/alerts')
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

  const URGENCY_OPTIONS = [
    { value: 'immediate', label: 'Inmediata' },
    { value: 'high',      label: 'Alta' },
    { value: 'medium',    label: 'Media' },
    { value: 'low',       label: 'Baja' },
  ]

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className="block text-[11px] font-semibold text-signal-text-muted mb-1.5 uppercase tracking-wider">
          Nombre de la regla *
        </label>
        <input value={name} onChange={e => setName(e.target.value)} required
          placeholder="ej. Demandas de diseño urgentes"
          className={inputCls} style={inputStyle} />
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-[11px] font-semibold text-signal-text-muted mb-1.5 uppercase tracking-wider">
          Keywords (opcional)
        </label>
        <div className="flex gap-2">
          <input value={kwInput} onChange={e => setKwInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }}
            placeholder="ej. carpintería, muebles"
            className={inputCls + ' flex-1'} style={inputStyle} />
          <button type="button" onClick={addKeyword}
            className="px-3 py-2 rounded-xl text-[12px] font-semibold text-white"
            style={{ backgroundColor: '#5F6F52' }}>+</button>
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {keywords.map(kw => (
              <span key={kw} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(95,111,82,0.1)', color: '#5F6F52' }}>
                {kw}
                <button type="button" onClick={() => setKeywords(ks => ks.filter(k => k !== kw))}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Categories */}
      <div>
        <label className="block text-[11px] font-semibold text-signal-text-muted mb-2 uppercase tracking-wider">
          Categorías (opcional)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {categories.map(c => (
            <button key={c.id} type="button" onClick={() => toggleCat(c.id)}
              className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors"
              style={{
                backgroundColor: selectedCats.includes(c.id) ? '#EEF1EA' : '#F1ECE2',
                border: `1px solid ${selectedCats.includes(c.id) ? 'rgba(95,111,82,0.3)' : '#DED6C8'}`,
                color: selectedCats.includes(c.id) ? '#5F6F52' : '#7A7468',
              }}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Urgency filter */}
      <div>
        <label className="block text-[11px] font-semibold text-signal-text-muted mb-2 uppercase tracking-wider">
          Urgencia (dejar vacío = todas)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {URGENCY_OPTIONS.map(u => (
            <button key={u.value} type="button" onClick={() => toggleUrgency(u.value)}
              className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors"
              style={{
                backgroundColor: urgencies.includes(u.value) ? '#EEF1EA' : '#F1ECE2',
                border: `1px solid ${urgencies.includes(u.value) ? 'rgba(95,111,82,0.3)' : '#DED6C8'}`,
                color: urgencies.includes(u.value) ? '#5F6F52' : '#7A7468',
              }}>
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {/* Budget min */}
      <div>
        <label className="block text-[11px] font-semibold text-signal-text-muted mb-1.5 uppercase tracking-wider">
          Presupuesto mínimo (GTQ)
        </label>
        <input type="number" min="0" value={budgetMin} onChange={e => setBudgetMin(e.target.value)}
          placeholder="0 = sin mínimo"
          className={inputCls} style={inputStyle} />
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
          {loading ? 'Guardando…' : 'Crear regla'}
        </button>
      </div>
    </form>
  )
}
