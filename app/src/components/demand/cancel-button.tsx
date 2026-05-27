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
      className="w-full py-2.5 rounded-xl text-[13px] hover:opacity-90
                 disabled:opacity-50 transition-all"
      style={{
        border: '1px solid rgba(184,121,91,0.3)',
        color: '#B8795B',
        backgroundColor: 'rgba(184,121,91,0.06)',
      }}
    >
      {loading ? 'Cancelando…' : 'Cancelar demanda'}
    </button>
  )
}
