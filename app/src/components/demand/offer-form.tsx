'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { submitOffer } from '@/actions/offers'

export function OfferForm({ demandId }: { demandId: string }) {
  const { data: session } = useSession()
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
        <p className="text-emerald-700 font-medium">¡Oferta enviada!</p>
        <p className="text-sm text-emerald-600 mt-1">El comprador recibirá tu propuesta.</p>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-brand-500 text-white font-semibold py-3 rounded-xl hover:bg-brand-600 transition-colors"
      >
        Hacer oferta
      </button>
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!session) return
    setError('')
    setLoading(true)

    const fd     = new FormData(e.currentTarget)
    const result = await submitOffer(session.user.id, demandId, fd)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-gray-900">Tu oferta</h3>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Precio <span className="text-red-500">*</span></label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Q</span>
            <input
              name="price"
              type="number"
              required
              min={1}
              step={0.01}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Días estimados</label>
          <input
            name="estimated_days"
            type="number"
            min={1}
            max={365}
            placeholder="Opcional"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <input type="hidden" name="currency" value="GTQ" />

      <div>
        <label className="block text-xs text-gray-500 mb-1">Descripción de tu propuesta</label>
        <textarea
          name="description"
          rows={3}
          placeholder="Cuéntale al comprador cómo lo harías, qué incluye tu precio, experiencia relevante…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-brand-500 text-white font-medium py-2.5 rounded-lg text-sm hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Enviando…' : 'Enviar oferta'}
        </button>
      </div>
    </form>
  )
}
