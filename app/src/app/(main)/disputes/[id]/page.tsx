import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDisputeDetail } from '@/lib/data'
import { DISPUTE_STATUS_LABEL, DISPUTE_STATUS_STYLE } from '@/lib/reputation'
import { DisputeActions } from './dispute-actions'

export default async function DisputePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const dispute = await getDisputeDetail(params.id)
  if (!dispute) notFound()

  const isComplainant = session?.user.id === dispute.complainant_id
  const isRespondent  = session?.user.id === dispute.respondent_id
  const st = DISPUTE_STATUS_STYLE[dispute.status] ?? DISPUTE_STATUS_STYLE.open

  return (
    <div className="min-h-screen bg-signal-bg pb-28">
      <div className="max-w-xl mx-auto px-5 md:px-8 py-8 animate-page-enter space-y-4">

        <Link href={`/users/${dispute.respondent_id}`}
              className="inline-flex items-center gap-1.5 text-[12px] text-signal-text-muted
                         hover:text-signal-text transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Perfil de {dispute.respondent_name}
        </Link>

        {/* Header */}
        <div className="rounded-2xl p-5 space-y-3"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-1.5"
                 style={{ color: '#A7A196' }}>
                Disputa
              </p>
              <p className="text-[15px] font-bold text-signal-text leading-snug">
                {dispute.offer_title}
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
                  style={{ backgroundColor: st.bg, color: st.color }}>
              {DISPUTE_STATUS_LABEL[dispute.status]}
            </span>
          </div>

          <div className="flex gap-4 text-[11px] text-signal-text-muted pt-1"
               style={{ borderTop: '1px solid #EAE3D6' }}>
            <span>
              Denunciante:{' '}
              <Link href={`/users/${dispute.complainant_id}`}
                    className="font-semibold text-signal-text hover:underline">
                {dispute.complainant_name}
              </Link>
            </span>
            <span>
              Acusado:{' '}
              <Link href={`/users/${dispute.respondent_id}`}
                    className="font-semibold text-signal-text hover:underline">
                {dispute.respondent_name}
              </Link>
            </span>
          </div>
        </div>

        {/* Complainant's description */}
        <div className="rounded-2xl p-5 space-y-2"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <p className="text-[11px] font-bold uppercase tracking-widest"
             style={{ color: '#A7A196' }}>
            Denuncia — {dispute.complainant_name}
          </p>
          <p className="text-[14px] text-signal-text leading-relaxed">{dispute.description}</p>
        </div>

        {/* Respondent reply */}
        {dispute.respondent_reply ? (
          <div className="rounded-2xl p-5 space-y-2"
               style={{ backgroundColor: '#F7F9F5', border: '1px solid rgba(95,111,82,0.2)' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest"
               style={{ color: '#5F6F52' }}>
              Respuesta — {dispute.respondent_name}
            </p>
            <p className="text-[14px] text-signal-text leading-relaxed">{dispute.respondent_reply}</p>
          </div>
        ) : (
          dispute.status === 'open' && (
            <p className="text-[12px] text-signal-text-muted px-1">
              {dispute.respondent_name} aún no ha respondido.
            </p>
          )
        )}

        {/* Resolution note */}
        {dispute.resolution_note && (
          <div className="rounded-2xl p-4"
               style={{ backgroundColor: '#EEF1EA', border: '1px solid rgba(95,111,82,0.2)' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-1"
               style={{ color: '#5F6F52' }}>
              Nota de resolución
            </p>
            <p className="text-[13px] text-signal-text">{dispute.resolution_note}</p>
          </div>
        )}

        {/* Actions for parties */}
        {session && (isComplainant || isRespondent) && dispute.status === 'open' && (
          <DisputeActions
            disputeId={dispute.id}
            userId={session.user.id}
            isComplainant={isComplainant}
            isRespondent={isRespondent}
            hasReply={!!dispute.respondent_reply}
          />
        )}

      </div>
    </div>
  )
}
