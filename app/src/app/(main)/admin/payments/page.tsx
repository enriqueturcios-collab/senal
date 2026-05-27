import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getPendingFees } from '@/actions/payments'
import { getPendingPlanRequests } from '@/actions/subscriptions'
import { fmtCurrency } from '@/lib/utils'
import { PLAN_DEFINITIONS, type EntrepreneurPlan } from '@/lib/entitlements/entrepreneur-plans'
import { AdminFeeActions } from './fee-actions'
import { AdminPlanActions } from './plan-actions'

export default async function AdminPaymentsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') redirect('/')

  const [fees, planRequests] = await Promise.all([
    getPendingFees(),
    getPendingPlanRequests(),
  ])

  const total = fees.length + planRequests.length

  return (
    <main className="min-h-screen bg-signal-bg px-5 py-8 md:px-8 pb-28">
      <div className="max-w-3xl mx-auto">
        <div className="mb-7">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-1"
             style={{ color: '#A7A196' }}>Admin</p>
          <h1 className="text-[24px] font-bold text-signal-text"
              style={{ letterSpacing: '-0.02em' }}>
            Comprobantes pendientes
          </h1>
          <p className="text-[13px] text-signal-text-muted mt-1">
            {total === 0 ? 'Todo revisado.' : `${total} por revisar`}
          </p>
        </div>

        {total === 0 ? (
          <div className="rounded-2xl p-12 text-center"
               style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
            <p className="text-[32px] mb-3">✅</p>
            <p className="text-[14px] font-semibold text-signal-text">Sin comprobantes pendientes</p>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Plan upgrades */}
            {planRequests.map(r => (
              <div key={r.id} className="rounded-2xl overflow-hidden"
                   style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #EAE3D6' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5"
                         style={{ color: '#5F6F52' }}>Upgrade de plan</p>
                      <p className="text-[13px] font-bold text-signal-text">{r.user_name}</p>
                      <p className="text-[11px] text-signal-text-muted">{r.user_email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[15px] font-bold text-signal-text">
                        Q{(r.amount_cents / 100).toFixed(0)}/mes
                      </p>
                      <p className="text-[11px] text-signal-text-muted mt-0.5">
                        {PLAN_DEFINITIONS[r.from_plan as EntrepreneurPlan]?.name ?? r.from_plan}
                        {' → '}
                        <span className="font-semibold text-signal-text">
                          {PLAN_DEFINITIONS[r.to_plan as EntrepreneurPlan]?.name ?? r.to_plan}
                        </span>
                      </p>
                    </div>
                  </div>
                  {r.review_note && (
                    <p className="text-[11px] mt-2 font-medium" style={{ color: '#B8795B' }}>
                      Nota anterior: {r.review_note}
                    </p>
                  )}
                </div>

                <div className="px-5 py-4" style={{ borderBottom: '1px solid #EAE3D6' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
                     style={{ color: '#A7A196' }}>Comprobante</p>
                  <a href={r.proof_url} target="_blank" rel="noreferrer" className="block group">
                    <img src={r.proof_url} alt="Comprobante"
                         className="w-full max-h-64 object-contain rounded-xl border
                                    transition-opacity group-hover:opacity-90"
                         style={{ borderColor: '#DED6C8', backgroundColor: '#F7F3EC' }} />
                  </a>
                </div>

                <div className="px-5 py-4">
                  <AdminPlanActions requestId={r.id} />
                </div>
              </div>
            ))}

            {/* Trade fees */}
            {fees.map(f => (
              <div key={f.id} className="rounded-2xl overflow-hidden"
                   style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #EAE3D6' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5"
                         style={{ color: '#A7A196' }}>Comisión de trato</p>
                      <p className="text-[13px] font-bold text-signal-text">{f.payer_name}</p>
                      <p className="text-[11px] text-signal-text-muted">{f.payer_email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[15px] font-bold text-signal-text">
                        {fmtCurrency(f.amount_cents / 100, f.currency)}
                      </p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#EEF1EA', color: '#5F6F52' }}>
                        {f.role === 'buyer' ? 'Comprador' : 'Vendedor'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-signal-text-muted mt-2">
                    {f.demand_title}
                  </p>
                </div>

                <div className="px-5 py-4" style={{ borderBottom: '1px solid #EAE3D6' }}>
                  <a href={f.proof_url} target="_blank" rel="noreferrer" className="block group">
                    <img src={f.proof_url} alt="Comprobante"
                         className="w-full max-h-64 object-contain rounded-xl border
                                    transition-opacity group-hover:opacity-90"
                         style={{ borderColor: '#DED6C8', backgroundColor: '#F7F3EC' }} />
                  </a>
                </div>

                <div className="px-5 py-4">
                  <AdminFeeActions feeId={f.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
