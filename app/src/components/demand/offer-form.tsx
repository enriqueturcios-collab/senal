'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { submitOffer } from '@/actions/offers'
import { ImageUpload } from '@/components/ui/image-upload'
import { MarketPriceCard } from '@/components/ui/market-price-card'

const inputCls = `w-full rounded-xl px-3 py-2.5 text-[14px] text-signal-text
  outline-none transition-all duration-150`
const inputStyle = { backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }
const focusFn = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = '#5F6F52'
  e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(95,111,82,0.08)'
}
const blurFn = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = '#DED6C8'
  e.currentTarget.style.boxShadow   = 'none'
}

export function OfferForm({ demandId, categoryId }: { demandId: string; categoryId?: number }) {
  const { data: session } = useSession()
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)

  if (success) {
    return (
      <div className="rounded-2xl p-5 text-center"
           style={{ backgroundColor: '#EEF1EA', border: '1px solid rgba(95,111,82,0.2)' }}>
        <p className="font-semibold" style={{ color: '#5F6F52' }}>¡Oferta enviada!</p>
        <p className="text-[13px] mt-1" style={{ color: '#7B8A65' }}>
          El comprador recibirá tu propuesta.
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-white font-semibold py-3.5 rounded-xl
                   hover:opacity-90 transition-all shadow-button text-[14px]"
        style={{ backgroundColor: '#5F6F52' }}
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
    <form onSubmit={handleSubmit} className="rounded-2xl p-5 space-y-4 shadow-card"
          style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
      <h3 className="font-semibold text-signal-text">Tu oferta</h3>

      {error && (
        <div className="rounded-xl px-3 py-2.5"
             style={{ backgroundColor: 'rgba(184,121,91,0.08)', border: '1px solid rgba(184,121,91,0.2)' }}>
          <p className="text-[13px]" style={{ color: '#B8795B' }}>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] text-signal-text-muted mb-1.5">
            Precio <span style={{ color: '#B8795B' }}>*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-signal-ash">Q</span>
            <input name="price" type="number" required min={1} step={0.01} placeholder="0.00"
                   className={`${inputCls} pl-7`} style={inputStyle}
                   onFocus={focusFn} onBlur={blurFn} />
          </div>
        </div>
        <div>
          <label className="block text-[12px] text-signal-text-muted mb-1.5">Días estimados</label>
          <input name="estimated_days" type="number" min={1} max={365} placeholder="Opcional"
                 className={inputCls} style={inputStyle}
                 onFocus={focusFn} onBlur={blurFn} />
        </div>
      </div>

      <input type="hidden" name="currency" value="GTQ" />

      {categoryId && (
        <MarketPriceCard categoryId={categoryId} />
      )}

      <div>
        <label className="block text-[12px] text-signal-text-muted mb-1.5">
          Descripción de tu propuesta
        </label>
        <textarea name="description" rows={3}
          placeholder="Cuéntale al comprador cómo lo harías, qué incluye tu precio, experiencia relevante…"
          className={`${inputCls} resize-none`} style={inputStyle}
          onFocus={focusFn} onBlur={blurFn} />
      </div>

      <div>
        <label className="block text-[12px] text-signal-text-muted mb-1.5">
          Fotos de referencia
        </label>
        <ImageUpload max={3} label="Añadir fotos" />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={() => setOpen(false)}
          className="flex-1 py-2.5 rounded-xl text-[13px] text-signal-text-soft
                     hover:bg-signal-surface-muted transition-colors"
          style={{ border: '1px solid #DED6C8' }}>
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 text-white font-medium py-2.5 rounded-xl text-[13px]
                     hover:opacity-90 disabled:opacity-50 transition-all shadow-button"
          style={{ backgroundColor: '#5F6F52' }}>
          {loading ? 'Enviando…' : 'Enviar oferta'}
        </button>
      </div>
    </form>
  )
}
