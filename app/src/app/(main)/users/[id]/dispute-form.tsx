'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { openDispute } from '@/actions/reputation'

export function DisputeForm({
  complainantId, respondentId, offerId, offerTitle,
}: {
  complainantId: string; respondentId: string
  offerId: string; offerTitle: string
}) {
  const router  = useRouter()
  const [open,    setOpen]    = useState(false)
  const [text,    setText]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await openDispute(complainantId, respondentId, offerId, text)
    if ('error' in res && res.error) { setError(res.error); setLoading(false); return }
    if ('disputeId' in res) router.push(`/disputes/${res.disputeId}`)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
              className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
              style={{ backgroundColor: '#FDF3EE', border: '1px solid rgba(184,121,91,0.25)', color: '#B8795B' }}>
        Abrir disputa
      </button>
    )
  }

  const inp = `w-full rounded-xl px-3 py-2.5 text-[13px] text-signal-text outline-none
               resize-none focus:ring-2 focus:ring-[#5F6F52]/30`
  const inpStyle = { backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }

  return (
    <form onSubmit={submit} className="rounded-2xl p-4 space-y-3 animate-pop"
          style={{ backgroundColor: '#FFFDF8', border: '1.5px solid rgba(184,121,91,0.3)' }}>
      <div>
        <p className="text-[13px] font-bold text-signal-text mb-0.5">Abrir disputa</p>
        <p className="text-[11px] text-signal-text-muted">
          Sobre: <span className="font-semibold">{offerTitle}</span>
          {' '}— será pública en el perfil del acusado inmediatamente.
        </p>
      </div>

      <textarea rows={4} value={text} onChange={e => setText(e.target.value)} required
                placeholder="Describí qué pasó: qué se acordó, qué no se cumplió..."
                className={inp} style={inpStyle} />

      {error && <p className="text-[11px]" style={{ color: '#B8795B' }}>{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={() => { setOpen(false); setText(''); setError('') }}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold"
                style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8', color: '#4D4A43' }}>
          Cancelar
        </button>
        <button type="submit" disabled={loading || !text.trim()}
                className="btn-primary flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: '#B8795B' }}>
          {loading ? 'Abriendo…' : 'Abrir disputa →'}
        </button>
      </div>
    </form>
  )
}
