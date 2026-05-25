'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { currentPeriod, prevPeriod } from '@/lib/utils'

interface Category { id: number; name: string; level: number }
interface Props { departments: string[]; categories: Category[] }

export function OpportunitiesFilters({ departments, categories }: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [dept,  setDept ] = useState(searchParams.get('department')  ?? '')
  const [catId, setCatId] = useState(searchParams.get('category_id') ?? '')
  const [period, setPeriod] = useState(searchParams.get('period')    ?? currentPeriod())

  function apply() {
    const params = new URLSearchParams()
    if (dept)   params.set('department',  dept)
    if (catId)  params.set('category_id', catId)
    if (period) params.set('period',      period)
    router.push(`/opportunities?${params.toString()}`)
  }

  const periods = Array.from({ length: 12 }, (_, i) => prevPeriod(i))
  const leafCats = categories.filter(c => c.level > 0)

  return (
    <div className="card p-4 flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-36">
        <label className="block text-xs font-medium text-slate-500 mb-1">Período</label>
        <select value={period} onChange={e => setPeriod(e.target.value)} className="select text-sm">
          {periods.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="flex-1 min-w-36">
        <label className="block text-xs font-medium text-slate-500 mb-1">Departamento</label>
        <select value={dept} onChange={e => setDept(e.target.value)} className="select text-sm">
          <option value="">Todos</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="flex-1 min-w-48">
        <label className="block text-xs font-medium text-slate-500 mb-1">Categoría</label>
        <select value={catId} onChange={e => setCatId(e.target.value)} className="select text-sm">
          <option value="">Todas</option>
          {leafCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <button onClick={apply} className="btn-primary text-sm">
        Aplicar filtros
      </button>
      {(dept || catId) && (
        <button
          onClick={() => { setDept(''); setCatId(''); router.push('/opportunities') }}
          className="btn-secondary text-sm"
        >
          Limpiar
        </button>
      )}
    </div>
  )
}
