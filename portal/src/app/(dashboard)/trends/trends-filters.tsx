'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface Category { id: number; name: string; level: number }
interface Props { categories: Category[]; maxMonths: number }

export function TrendsFilters({ categories, maxMonths }: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [selected, setSelected] = useState<number[]>(
    (searchParams.get('category_ids') ?? '').split(',').map(Number).filter(Boolean)
  )
  const [months, setMonths] = useState(searchParams.get('months') ?? '12')

  const leafCats = categories.filter(c => c.level > 0)

  function toggle(id: number) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id].slice(0, 6))
  }

  function apply() {
    const params = new URLSearchParams()
    if (selected.length) params.set('category_ids', selected.join(','))
    params.set('months', months)
    router.push(`/dashboard/trends?${params.toString()}`)
  }

  const monthOptions = [3, 6, 12, 24, 36].filter(m => m <= maxMonths)

  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-slate-500 mb-1">Meses de historial</label>
          <select value={months} onChange={e => setMonths(e.target.value)} className="select text-sm">
            {monthOptions.map(m => (
              <option key={m} value={m}>Últimos {m} meses</option>
            ))}
          </select>
        </div>
        <button onClick={apply} className="btn-primary text-sm">Ver tendencia</button>
        {selected.length > 0 && (
          <button onClick={() => { setSelected([]); router.push('/dashboard/trends') }} className="btn-secondary text-sm">
            Limpiar
          </button>
        )}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Filtrar por categorías (máx. 6)</p>
        <div className="flex flex-wrap gap-2">
          {leafCats.slice(0, 20).map(c => (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className={`badge cursor-pointer transition-colors ${
                selected.includes(c.id)
                  ? 'bg-brand-100 text-brand-700 border border-brand-300'
                  : 'bg-surface-muted text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
