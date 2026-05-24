'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { createDemand } from '@/actions/demands'

interface Category { id: number; parent_id: number | null; name: string; level: number }
interface Zone { id: number; name: string; municipality: string; department: string }

export function NewDemandForm({
  categories,
  zones,
}: {
  categories: Category[]
  zones: Zone[]
}) {
  const { data: session } = useSession()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedCat, setSelectedCat] = useState<number | null>(null)

  const topLevel     = categories.filter(c => c.level === 0)
  const subCategories = selectedCat
    ? categories.filter(c => c.parent_id === selectedCat)
    : []

  // Group zones by department
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

    const fd = new FormData(e.currentTarget)
    const result = await createDemand(session.user.id, fd)

    if (result && 'error' in result) {
      setError(result.error)
      setLoading(false)
    }
    // On success, createDemand redirects — no need to handle
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-24">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ¿Qué necesitas? <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          type="text"
          required
          minLength={5}
          maxLength={120}
          placeholder="Ej: Instalación de piso cerámico 50m²"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción <span className="text-red-500">*</span>
        </label>
        <textarea
          name="description"
          required
          minLength={20}
          maxLength={2000}
          rows={4}
          placeholder="Detalla lo que necesitas: materiales, medidas, fechas, condiciones especiales…"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría <span className="text-red-500">*</span>
          </label>
          <select
            name="category_id"
            required
            onChange={e => setSelectedCat(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">Seleccionar</option>
            {topLevel.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {subCategories.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subcategoría</label>
            <select
              name="subcategory_id"
              className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">Todas</option>
              {subCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
        <select
          name="zone_id"
          className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto mín.</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Q</span>
            <input
              name="budget_min"
              type="number"
              min={0}
              placeholder="0"
              className="w-full border border-gray-300 rounded-xl pl-7 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto máx.</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Q</span>
            <input
              name="budget_max"
              type="number"
              min={0}
              placeholder="Sin límite"
              className="w-full border border-gray-300 rounded-xl pl-7 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      <input type="hidden" name="currency" value="GTQ" />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Urgencia <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'low',       label: 'Sin prisa',    desc: 'Cuando puedan' },
            { value: 'medium',    label: 'Esta semana',  desc: 'Próximos días' },
            { value: 'high',      label: 'Urgente',      desc: 'Hoy o mañana' },
            { value: 'immediate', label: 'Inmediato',    desc: 'Ahora mismo' },
          ].map(opt => (
            <label
              key={opt.value}
              className="flex items-center gap-3 border border-gray-200 rounded-xl p-3 cursor-pointer has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
            >
              <input
                type="radio"
                name="urgency"
                value={opt.value}
                required
                className="accent-brand-500"
              />
              <div>
                <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                <div className="text-xs text-gray-400">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Etiquetas
          <span className="text-gray-400 font-normal ml-1 text-xs">(separadas por coma, máx. 5)</span>
        </label>
        <input
          name="tags"
          type="text"
          placeholder="Ej: urgente, residencial, pintura"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="is_anonymous"
          value="true"
          className="w-4 h-4 accent-brand-500"
        />
        <span className="text-sm text-gray-700">
          Publicar de forma anónima
          <span className="block text-xs text-gray-400">Tu nombre no aparecerá en el feed</span>
        </span>
      </label>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4 safe-bottom">
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-500 text-white font-semibold py-3 rounded-xl hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Publicando…' : 'Publicar demanda'}
        </button>
      </div>
    </form>
  )
}
