'use client'

import { useState } from 'react'
import { confirmTrade } from '@/actions/offers'
import { giveVouch } from '@/actions/reputation'

interface Props {
  offerId: string
  userId: string
  role: 'buyer' | 'seller'
  buyerConfirmed: boolean
  sellerConfirmed: boolean
  completed: boolean
  offerPrice?: number
  offerCurrency?: string
  feeStatus?: string | null
  tradeId?: string
  counterpartyId?: string
  counterpartyName?: string | null
  alreadyVouched?: boolean
}

export function TradeConfirmWidget({
  offerId, userId, role,
  buyerConfirmed, sellerConfirmed, completed,
  tradeId, counterpartyId, counterpartyName, alreadyVouched = false,
}: Props) {
  const [loading,        setLoading]        = useState(false)
  const [vouchLoading,   setVouchLoading]   = useState(false)
  const [error,          setError]          = useState('')
  const [localBC,        setLocalBC]        = useState(buyerConfirmed)
  const [localSC,        setLocalSC]        = useState(sellerConfirmed)
  const [localDone,      setLocalDone]      = useState(completed)
  const [vouched,        setVouched]        = useState(alreadyVouched)
  const [vouchDismissed, setVouchDismissed] = useState(false)

  const myConfirmed    = role === 'buyer' ? localBC : localSC
  const otherConfirmed = role === 'buyer' ? localSC : localBC
  const otherLabel     = role === 'buyer' ? 'el proveedor' : 'el comprador'

  async function confirm() {
    setLoading(true); setError('')
    const result = await confirmTrade(userId, offerId)
    if ('error' in result) { setError(result.error ?? 'Error'); setLoading(false); return }
    if (role === 'buyer') setLocalBC(true)
    else                  setLocalSC(true)
    if (result.completed) setLocalDone(true)
    setLoading(false)
  }

  async function vouch() {
    if (!tradeId || !counterpartyId) return
    setVouchLoading(true)
    const result = await giveVouch(userId, counterpartyId, tradeId)
    if ('error' in result) { setError(result.error ?? 'Error'); setVouchLoading(false); return }
    setVouched(true); setVouchLoading(false)
  }

  const showVouchPrompt = localDone
    && tradeId && counterpartyId && counterpartyName
    && !vouched && !vouchDismissed

  if (localDone) {
    return (
      <div className="space-y-2">
        {/* Verified banner */}
        <div className="rounded-2xl px-5 py-4 flex items-center gap-3"
             style={{ backgroundColor: '#EEF1EA', border: '1px solid rgba(95,111,82,0.25)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
               style={{ backgroundColor: '#5F6F52' }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-bold text-signal-text">Trato verificado</p>
            <p className="text-[11px] text-signal-text-muted mt-0.5">
              Ambas partes confirmaron. Este trato forma parte del historial de la red.
            </p>
          </div>
        </div>

        {/* Aval prompt */}
        {showVouchPrompt && (
          <div className="rounded-2xl p-4 animate-pop"
               style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
            <p className="text-[12px] font-bold text-signal-text mb-1">
              ¿Querés avalar a {counterpartyName}?
            </p>
            <p className="text-[11px] text-signal-text-muted mb-3">
              Un aval dice que esta persona es de confianza. Tu nombre aparecerá
              públicamente en su perfil.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setVouchDismissed(true)}
                      className="flex-1 py-2 rounded-xl text-[12px] font-medium"
                      style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8', color: '#7A7468' }}>
                No por ahora
              </button>
              <button type="button" onClick={vouch} disabled={vouchLoading}
                      className="btn-primary flex-1 py-2 rounded-xl text-[12px] font-bold
                                 text-white disabled:opacity-50"
                      style={{ backgroundColor: '#5F6F52' }}>
                {vouchLoading
                  ? <span className="flex items-center justify-center gap-1.5">
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white
                                       rounded-full animate-spin-smooth" />
                      Avalando…
                    </span>
                  : `Avalar a ${counterpartyName!.split(' ')[0]} →`}
              </button>
            </div>
          </div>
        )}

        {/* Already vouched */}
        {vouched && !showVouchPrompt && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
               style={{ backgroundColor: '#F1ECE2' }}>
            <svg className="w-3.5 h-3.5 shrink-0" style={{ color: '#5F6F52' }}
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-[11px] font-medium" style={{ color: '#5F6F52' }}>
              Avalaste a {counterpartyName}
            </p>
          </div>
        )}

        {error && <p className="text-[11px] font-medium" style={{ color: '#B8795B' }}>{error}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-4 space-y-4"
         style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3"
           style={{ color: '#A7A196' }}>
          Confirmación mutua del trato
        </p>
        <div className="flex items-center gap-3">
          <Party label="Comprador" confirmed={localBC} highlight={role === 'buyer'} />
          <div className="flex-1 flex items-center gap-1">
            <Dash filled={localBC} />
            <Dash filled={localBC && localSC} />
            <Dash filled={localBC && localSC} />
            <Dash filled={localSC} />
          </div>
          <Party label="Vendedor" confirmed={localSC} highlight={role === 'seller'} />
        </div>
      </div>

      {myConfirmed ? (
        <p className="text-[12px] text-signal-text-muted">
          Confirmaste tu parte. Esperando que {otherLabel} confirme la suya para cerrar el trato.
        </p>
      ) : otherConfirmed ? (
        <div className="space-y-3">
          <p className="text-[12px] font-medium text-signal-text">
            {role === 'buyer'
              ? 'El proveedor confirmó la entrega. Confirmá la recepción para cerrar el trato.'
              : 'El comprador confirmó la recepción. Confirmá tu entrega para cerrar el trato.'}
          </p>
          <ConfirmButton loading={loading} onClick={confirm} role={role} />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[12px] text-signal-text-muted">
            {role === 'buyer'
              ? 'Confirmá cuando hayas recibido conforme el trabajo o producto.'
              : 'Confirmá cuando hayas entregado el trabajo o producto.'}
          </p>
          <ConfirmButton loading={loading} onClick={confirm} role={role} />
        </div>
      )}

      {error && (
        <p className="text-[11px] font-semibold" style={{ color: '#B8795B' }}>{error}</p>
      )}
    </div>
  )
}

function Party({ label, confirmed, highlight }: {
  label: string; confirmed: boolean; highlight: boolean
}) {
  return (
    <div className="text-center shrink-0 w-20">
      <div className="w-8 h-8 rounded-full mx-auto flex items-center justify-center
                      text-[11px] font-bold transition-all duration-300"
           style={{
             backgroundColor: confirmed ? '#5F6F52' : highlight ? '#F1ECE2' : '#EAE3D6',
             border: highlight && !confirmed ? '1.5px solid #DED6C8' : 'none',
             color: confirmed ? 'white' : '#7A7468',
           }}>
        {confirmed
          ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          : '·'}
      </div>
      <p className="text-[10px] mt-1 font-semibold"
         style={{ color: confirmed ? '#5F6F52' : highlight ? '#4D4A43' : '#A7A196' }}>
        {label}
      </p>
    </div>
  )
}

function Dash({ filled }: { filled: boolean }) {
  return (
    <div className="flex-1 h-px transition-all duration-500"
         style={{ backgroundColor: filled ? '#5F6F52' : '#DED6C8' }} />
  )
}

function ConfirmButton({ loading, onClick, role }: {
  loading: boolean; onClick: () => void; role: 'buyer' | 'seller'
}) {
  const label = role === 'buyer' ? 'Confirmar recepción' : 'Confirmar entrega'
  return (
    <button type="button" onClick={onClick} disabled={loading}
            className="btn-primary w-full py-2.5 rounded-xl text-[13px] font-bold
                       text-white disabled:opacity-50"
            style={{ backgroundColor: '#5F6F52' }}>
      {loading
        ? <span className="flex items-center justify-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white
                             rounded-full animate-spin-smooth" />
            Confirmando…
          </span>
        : `${label} →`}
    </button>
  )
}
