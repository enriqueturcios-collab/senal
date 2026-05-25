'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface Category { id: number; name: string; level: number; full_path: string }
interface Zone { id: number; zone: string; department: string; municipality: string }

interface Props {
  categories: Category[]
  zones: Zone[]
}

export function LookupForm({ categories, zones }: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [categoryId, setCategoryId] = useState(searchParams.get('category_id') ?? '')
  const [zoneId,     setZoneId    ] = useState(searchParams.get('zone_id')     ?? '')

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryId || !zoneId) return
    router.push(`/lookup?category_id=${categoryId}&zone_id=${zoneId}`)
  }

  const leafCategories = categories.filter(c => c.level > 0)

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-48">
        <label className="block text-sm font-medium text-slate-700 mb-1">Categoría / Giro de negocio</label>
        <select
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
          className="select"
          required
        >
          <option value="">Selecciona una categoría...</option>
          {leafCategories.map(c => (
            <option key={c.id} value={c.id}>{c.full_path}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-48">
        <label className="block text-sm font-medium text-slate-700 mb-1">Zona geográfica</label>
        <select
          value={zoneId}
          onChange={e => setZoneId(e.target.value)}
          className="select"
          required
        >
          <option value="">Selecciona una zona...</option>
          {zones.map(z => (
            <option key={z.id} value={z.id}>{z.zone} — {z.municipality}, {z.department}</option>
          ))}
        </select>
      </div>

      <button type="submit" className="btn-primary">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        Consultar
      </button>
    </form>
  )
}
