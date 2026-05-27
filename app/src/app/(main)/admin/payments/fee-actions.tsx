'use client'

import { useState } from 'react'
import { approvePayment, rejectPayment } from '@/actions/payments'

export function AdminFeeActions({ feeId }: { feeId: string }) {
  const [state,   setState]   = useState<'idle' | 'rejecting'>('idle')
  const [note,    setNote]    = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  async function approve() {
    setLoading(true); setError('')
    const r = await approvePayment(feeId)
    if ('error' in r) { setError(r.error ?? 'Error'); setLoading(false); return }
    setDone(true)
  }

  async function reject() {
    if (!note.trim()) { setError('Escribí una nota para el usuario'); return }
    setLoading(true); setError('')
    const r = await rejectPayment(feeId, note.trim())
    if ('error' in r) { setError(r.error ?? 'Error'); setLoading(false); return }
    setDone(true)
  }

  if (done) {
    return (
      <p className="text-[12px] font-semibold text-center py-1" style={{ color: '#5F6F52' }}>
        ✓ Listo
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {state === 'rejecting' ? (
        <>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Motivo del rechazo (visible para el usuario)…"
            rows={2}
            className="w-full rounded-xl px-3 py-2 text-[12px] text-signal-text resize-none
                       focus:outline-none focus:ring-1"
            style={{ backgroundColor: '#F7F3EC', border: '1px solid #DED6C8' }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setState('idle')}
              className="flex-1 py-2 rounded-xl text-[12px] font-medium"
              style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8', color: '#7A7468' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={reject}
              disabled={loading}
              className="flex-1 py-2 rounded-xl text-[12px] font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: '#B8795B' }}
            >
              {loading ? 'Rechazando…' : 'Confirmar rechazo'}
            </button>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setState('rejecting')}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
            style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8', color: '#7A7468' }}
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={approve}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: '#5F6F52' }}
          >
            {loading ? 'Aprobando…' : 'Aprobar ✓'}
          </button>
        </div>
      )}

      {error && (
        <p className="text-[11px] font-medium" style={{ color: '#B8795B' }}>{error}</p>
      )}
    </div>
  )
}
