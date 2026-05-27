'use client'

import { useState, useRef } from 'react'
import { submitPlanProof } from '@/actions/subscriptions'

const BANK_NAME    = process.env.NEXT_PUBLIC_SIGNAL_BANK_NAME    ?? 'Banco Industrial'
const BANK_ACCOUNT = process.env.NEXT_PUBLIC_SIGNAL_BANK_ACCOUNT ?? '0530177088'
const BANK_HOLDER  = process.env.NEXT_PUBLIC_SIGNAL_BANK_HOLDER  ?? ''

interface Props {
  userId: string
  fromPlan: string
  toPlan: string
  planName: string
  amountCents: number
  existingStatus?: string | null
  existingNote?: string | null
}

export function PlanUpgradeWidget({
  userId, fromPlan, toPlan, planName, amountCents,
  existingStatus, existingNote,
}: Props) {
  const [status,  setStatus]  = useState(existingStatus ?? null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const amountFormatted = `Q${(amountCents / 100).toFixed(0)}`

  async function upload(file: File) {
    setLoading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Upload fallido')

      const result = await submitPlanProof(toPlan, fromPlan, amountCents, data.url)
      if ('error' in result) throw new Error(result.error)
      setStatus('review')
    } catch (e: any) {
      setError(e.message ?? 'Error al subir el comprobante')
    }
    setLoading(false)
  }

  if (status === 'review') {
    return (
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
               style={{ backgroundColor: '#F7F3EC' }}>
            <svg className="w-4 h-4" style={{ color: '#A7A196' }} fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-bold text-signal-text">Comprobante recibido</p>
            <p className="text-[11px] text-signal-text-muted mt-0.5">
              Revisamos tu transferencia y activamos {planName} en menos de 24h.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setStatus(null); setError('') }}
          className="mt-3 text-[11px] font-medium underline"
          style={{ color: '#A7A196' }}
        >
          Subir otro comprobante
        </button>
      </div>
    )
  }

  if (status === 'approved') {
    return (
      <div className="rounded-2xl p-5 flex items-center gap-3"
           style={{ backgroundColor: '#EEF1EA', border: '1px solid rgba(95,111,82,0.25)' }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
             style={{ backgroundColor: '#5F6F52' }}>
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-bold text-signal-text">Plan activado</p>
          <p className="text-[11px] text-signal-text-muted mt-0.5">Recargá la página para ver tu nuevo plan.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#4D4A43' }}>
      <p className="text-white font-bold text-[15px] mb-1">Activar {planName}</p>
      <p className="text-[12px] mb-5" style={{ color: 'rgba(255,255,255,0.55)' }}>
        {amountFormatted}/mes · Activación en menos de 24h
      </p>

      {/* Bank details */}
      <div className="rounded-xl p-3.5 mb-4 space-y-2"
           style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest"
           style={{ color: 'rgba(255,255,255,0.4)' }}>Datos de transferencia</p>
        <BankRow label="Banco"        value={BANK_NAME} />
        <BankRow label="Cuenta"       value={BANK_ACCOUNT} copyable />
        {BANK_HOLDER && <BankRow label="A nombre de" value={BANK_HOLDER} />}
        <BankRow label="Monto exacto" value={amountFormatted} copyable />
        <BankRow label="Concepto"     value={`Signal ${planName}`} />
      </div>

      {existingNote && status === 'rejected' && (
        <p className="text-[11px] mb-3 px-3 py-2 rounded-xl"
           style={{ backgroundColor: 'rgba(184,121,91,0.2)', color: '#F0C8A8' }}>
          Comprobante rechazado: {existingNote}. Intentá de nuevo.
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) upload(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className="w-full py-3 rounded-xl text-[13px] font-bold text-white
                   hover:opacity-90 transition-opacity disabled:opacity-50"
        style={{ backgroundColor: '#5F6F52' }}
      >
        {loading
          ? <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin-smooth" />
              Subiendo…
            </span>
          : 'Subir comprobante de transferencia →'}
      </button>

      {error && (
        <p className="text-[11px] mt-2 font-medium" style={{ color: '#F0C8A8' }}>{error}</p>
      )}
    </div>
  )
}

function BankRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] shrink-0" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[11px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {value}
        </span>
        {copyable && (
          <button type="button" onClick={copy}
                  className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors"
                  style={{
                    backgroundColor: copied ? 'rgba(95,111,82,0.4)' : 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.7)',
                  }}>
            {copied ? '✓' : 'copiar'}
          </button>
        )}
      </div>
    </div>
  )
}
