'use client'

import { useState } from 'react'
import { giveVouch } from '@/actions/reputation'

export function VouchButton({ voucherId, voucheeId, voucheeName, tradeId }: {
  voucherId: string
  voucheeId: string
  voucheeName: string
  tradeId: string
}) {
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  async function vouch() {
    setLoading(true)
    setError('')
    const result = await giveVouch(voucherId, voucheeId, tradeId)
    if ('error' in result) { setError(result.error ?? 'Error'); setLoading(false); return }
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="rounded-2xl px-5 py-4 flex items-center gap-3"
           style={{ backgroundColor: '#EEF1EA', border: '1px solid rgba(95,111,82,0.25)' }}>
        <svg className="w-4 h-4 shrink-0" style={{ color: '#5F6F52' }}
             fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <p className="text-[13px] font-semibold" style={{ color: '#5F6F52' }}>
          Avalaste a {voucheeName}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-4 space-y-3"
         style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
      <div>
        <p className="text-[13px] font-bold text-signal-text mb-1">
          ¿Querés avalar a {voucheeName}?
        </p>
        <p className="text-[11px] text-signal-text-muted">
          Tuvieron un trato verificado. Un aval dice que esta persona es de confianza
          y tu nombre aparecerá públicamente en su perfil.
        </p>
      </div>
      <button type="button" onClick={vouch} disabled={loading}
              className="btn-primary w-full py-2.5 rounded-xl text-[13px] font-bold
                         text-white disabled:opacity-50"
              style={{ backgroundColor: '#5F6F52' }}>
        {loading
          ? <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white
                               rounded-full animate-spin-smooth" />
              Avalando…
            </span>
          : `Avalar a ${voucheeName.split(' ')[0]} →`}
      </button>
      {error && <p className="text-[11px]" style={{ color: '#B8795B' }}>{error}</p>}
    </div>
  )
}
