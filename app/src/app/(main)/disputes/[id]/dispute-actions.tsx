'use client'

import { useState } from 'react'
import {
  replyToDispute, resolveDispute,
  markUnresolved, withdrawDispute,
} from '@/actions/reputation'

export function DisputeActions({
  disputeId, userId, isComplainant, isRespondent, hasReply,
}: {
  disputeId: string; userId: string
  isComplainant: boolean; isRespondent: boolean; hasReply: boolean
}) {
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [replyText, setReply]   = useState('')
  const [noteText, setNote]     = useState('')
  const [view, setView] = useState<'idle' | 'reply' | 'resolve' | 'unresolved' | 'withdraw'>('idle')

  async function act(fn: () => Promise<{ error?: string; success?: boolean }>) {
    setLoading(true); setError('')
    const res = await fn()
    if ('error' in res && res.error) setError(res.error)
    setLoading(false)
  }

  const btn = `text-[12px] font-semibold px-4 py-2.5 rounded-xl transition-all`
  const inp = `w-full rounded-xl px-3 py-2.5 text-[13px] text-signal-text outline-none
               resize-none focus:ring-2 focus:ring-[#5F6F52]/30`
  const inpStyle = { backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }

  return (
    <div className="rounded-2xl p-4 space-y-3"
         style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>

      {view === 'idle' && (
        <div className="flex flex-wrap gap-2">
          {isRespondent && !hasReply && (
            <button onClick={() => setView('reply')} className={btn}
                    style={{ backgroundColor: '#EEF1EA', color: '#3A5A30', border: '1px solid rgba(95,111,82,0.25)' }}>
              Responder
            </button>
          )}
          {isComplainant && (
            <button onClick={() => setView('resolve')} className={btn}
                    style={{ backgroundColor: '#EEF1EA', color: '#3A5A30', border: '1px solid rgba(95,111,82,0.25)' }}>
              Marcar como resuelta
            </button>
          )}
          <button onClick={() => setView('unresolved')} className={btn}
                  style={{ backgroundColor: '#FDF3EE', color: '#B8795B', border: '1px solid rgba(184,121,91,0.25)' }}>
            Sin resolución
          </button>
          {isComplainant && (
            <button onClick={() => setView('withdraw')} className={btn}
                    style={{ backgroundColor: '#F5F2EE', color: '#A7A196', border: '1px solid #DED6C8' }}>
              Retirar denuncia
            </button>
          )}
        </div>
      )}

      {view === 'reply' && (
        <div className="space-y-3">
          <p className="text-[12px] font-semibold text-signal-text">Tu respuesta (pública)</p>
          <textarea rows={4} value={replyText} onChange={e => setReply(e.target.value)}
                    placeholder="Describí tu versión de los hechos..."
                    className={inp} style={inpStyle} />
          <Buttons loading={loading} onCancel={() => setView('idle')}
                   onConfirm={() => act(() => replyToDispute(userId, disputeId, replyText))}
                   confirmLabel="Enviar respuesta" />
        </div>
      )}

      {view === 'resolve' && (
        <div className="space-y-3">
          <p className="text-[12px] font-semibold text-signal-text">
            ¿Cómo se resolvió? (opcional, público)
          </p>
          <textarea rows={3} value={noteText} onChange={e => setNote(e.target.value)}
                    placeholder="ej. El proveedor devolvió el pago, re-hizo el trabajo..."
                    className={inp} style={inpStyle} />
          <Buttons loading={loading} onCancel={() => setView('idle')}
                   onConfirm={() => act(() => resolveDispute(userId, disputeId, noteText))}
                   confirmLabel="Confirmar resolución" confirmColor="#5F6F52" />
        </div>
      )}

      {view === 'unresolved' && (
        <div className="space-y-3">
          <p className="text-[12px] text-signal-text">
            Al marcar como <strong>sin resolución</strong>, la disputa queda permanentemente
            visible en el perfil del acusado. Esta acción no se puede deshacer.
          </p>
          <Buttons loading={loading} onCancel={() => setView('idle')}
                   onConfirm={() => act(() => markUnresolved(userId, disputeId))}
                   confirmLabel="Confirmar sin resolución" confirmColor="#B8795B" />
        </div>
      )}

      {view === 'withdraw' && (
        <div className="space-y-3">
          <p className="text-[12px] text-signal-text">
            Al retirar la denuncia, desaparece del perfil del acusado y queda registrada
            como retirada en tu historial.
          </p>
          <Buttons loading={loading} onCancel={() => setView('idle')}
                   onConfirm={() => act(() => withdrawDispute(userId, disputeId))}
                   confirmLabel="Retirar denuncia" confirmColor="#A7A196" />
        </div>
      )}

      {error && (
        <p className="text-[11px] font-semibold" style={{ color: '#B8795B' }}>{error}</p>
      )}
    </div>
  )
}

function Buttons({ loading, onCancel, onConfirm, confirmLabel, confirmColor = '#5F6F52' }: {
  loading: boolean; onCancel: () => void; onConfirm: () => void
  confirmLabel: string; confirmColor?: string
}) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onCancel} disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold"
              style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8', color: '#4D4A43' }}>
        Cancelar
      </button>
      <button type="button" onClick={onConfirm} disabled={loading}
              className="btn-primary flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: confirmColor }}>
        {loading ? 'Guardando…' : confirmLabel}
      </button>
    </div>
  )
}
