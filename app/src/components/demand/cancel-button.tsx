'use client'

import { useState } from 'react'
import { cancelDemand } from '@/actions/demands'

export function CancelDemandButton({
  userId,
  demandId,
}: {
  userId: string
  demandId: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!confirm('¿Cancelar esta demanda?')) return
    setLoading(true)
    await cancelDemand(userId, demandId)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full border border-red-200 text-red-600 py-2.5 rounded-xl text-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Cancelando…' : 'Cancelar demanda'}
    </button>
  )
}
