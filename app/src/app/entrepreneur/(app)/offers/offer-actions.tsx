'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function OfferActions({ offerId, isActive }: { offerId: string; isActive: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      await fetch(`/api/entrepreneur/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      })
      router.refresh()
    } finally { setLoading(false) }
  }

  async function remove() {
    if (!confirm('¿Eliminar esta oferta?')) return
    setLoading(true)
    try {
      await fetch(`/api/entrepreneur/offers/${offerId}`, { method: 'DELETE' })
      router.refresh()
    } finally { setLoading(false) }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={toggle} disabled={loading}
        className="text-[11px] font-semibold px-3 py-1.5 rounded-xl disabled:opacity-50"
        style={{
          backgroundColor: isActive ? '#F1ECE2' : '#EEF1EA',
          border: '1px solid #DED6C8',
          color: isActive ? '#7A7468' : '#5F6F52',
        }}>
        {loading ? '…' : isActive ? 'Pausar' : 'Activar'}
      </button>
      <button onClick={remove} disabled={loading}
        className="text-[11px] font-semibold px-3 py-1.5 rounded-xl disabled:opacity-50"
        style={{ backgroundColor: '#FDF3EE', border: '1px solid #F0D9CE', color: '#B8795B' }}>
        Eliminar
      </button>
    </div>
  )
}
