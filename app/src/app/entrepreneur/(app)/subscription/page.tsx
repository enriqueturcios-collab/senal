import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireEntrepreneurAccess } from '@/lib/entitlements/feature-gate'
import { PLAN_DEFINITIONS, PLAN_ORDER, fmtPlanPrice, planIndex } from '@/lib/entitlements/entrepreneur-plans'
import { queryOne } from '@/db'
import { getMyPlanRequest } from '@/actions/subscriptions'
import { PlanUpgradeWidget } from './plan-upgrade'

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: { upgrade?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const ent  = await requireEntrepreneurAccess(session.user.id)
  const plan = ent.plan
  const def  = PLAN_DEFINITIONS[plan]

  // Current subscription details
  const sub = await queryOne<{
    status: string; current_period_end: string | null; cancel_at_period_end: boolean
  }>(`
    SELECT status, current_period_end::text, cancel_at_period_end
    FROM entrepreneur.subscriptions
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `, [session.user.id])

  const upgradeTarget = searchParams.upgrade as string | undefined
  const targetDef = upgradeTarget && PLAN_ORDER.includes(upgradeTarget as any)
    ? PLAN_DEFINITIONS[upgradeTarget as keyof typeof PLAN_DEFINITIONS]
    : null

  const existingRequest = targetDef
    ? await getMyPlanRequest(session.user.id, targetDef.plan)
    : null

  return (
    <div className="max-w-xl mx-auto px-5 md:px-8 py-8 pb-28">

      <div className="mb-7">
        <h1 className="text-[24px] font-bold text-signal-text" style={{ letterSpacing: '-0.02em' }}>
          Suscripción
        </h1>
        <p className="text-[12px] text-signal-text-muted mt-0.5">
          Tu plan actual y opciones de cambio
        </p>
      </div>

      {/* Current plan card */}
      <div className="rounded-2xl p-5 mb-6"
           style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A7A196' }}>
              Plan actual
            </p>
            <p className="text-[20px] font-bold text-signal-text" style={{ letterSpacing: '-0.02em' }}>
              {def.name}
            </p>
            <p className="text-[13px] text-signal-text-muted mt-1">{def.description}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[22px] font-bold text-signal-text" style={{ letterSpacing: '-0.03em' }}>
              {fmtPlanPrice(plan)}
            </p>
          </div>
        </div>

        {sub && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #EAE3D6' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: sub.status === 'active' ? '#5F6F52' : '#B8795B' }} />
              <p className="text-[12px] text-signal-text-muted">
                Estado: <span className="font-semibold text-signal-text capitalize">{sub.status}</span>
                {sub.current_period_end && (
                  <> · Renueva {new Date(sub.current_period_end).toLocaleDateString('es-GT')}</>
                )}
              </p>
            </div>
            {sub.cancel_at_period_end && (
              <p className="text-[11px] mt-1" style={{ color: '#B8795B' }}>
                Tu plan se cancelará al final del período.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Limits summary */}
      <div className="rounded-2xl p-5 mb-6"
           style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#A7A196' }}>
          Límites de tu plan
        </p>
        <div className="space-y-2">
          <LimitRow label="Respuestas / mes"    value={def.limits.monthly_offer_responses} />
          <LimitRow label="Items inventario"    value={def.limits.inventory_items} />
          <LimitRow label="Reglas de alerta"    value={def.limits.alert_rules} />
          {def.limits.team_members > 0 && (
            <LimitRow label="Miembros equipo"   value={def.limits.team_members} />
          )}
        </div>
      </div>

      {/* Upgrade / downgrade options */}
      {plan !== 'scale' && (
        <div className="mb-6">
          <p className="text-[13px] font-semibold text-signal-text mb-3">Opciones de plan</p>
          <div className="space-y-2">
            {PLAN_ORDER.filter(p => planIndex(p) > planIndex(plan)).map(p => {
              const pd = PLAN_DEFINITIONS[p]
              const isTarget = upgradeTarget === p
              return (
                <Link key={p} href={`/entrepreneur/subscription?upgrade=${p}`}
                      className="block rounded-2xl p-4 transition-all hover:-translate-y-0.5"
                      style={{
                        backgroundColor: isTarget ? '#EEF1EA' : '#FFFDF8',
                        border: isTarget ? '1px solid rgba(95,111,82,0.3)' : '1px solid #DED6C8',
                      }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-semibold text-signal-text">{pd.name}</p>
                      <p className="text-[11px] text-signal-text-muted mt-0.5">{pd.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[16px] font-bold text-signal-text">
                        {fmtPlanPrice(p)}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Upgrade action */}
      {targetDef && planIndex(targetDef.plan) > planIndex(plan) && (
        <div className="mb-6">
          <PlanUpgradeWidget
            userId={session.user.id}
            fromPlan={plan}
            toPlan={targetDef.plan}
            planName={targetDef.name}
            amountCents={targetDef.monthly_price_cents}
            existingStatus={existingRequest?.status}
            existingNote={existingRequest?.review_note}
          />
        </div>
      )}

      {/* Cancel */}
      {plan !== 'free' && (
        <div className="text-center">
          <p className="text-[11px] text-signal-text-muted">
            Para cancelar o cambiar a un plan inferior,{' '}
            <a href="mailto:hello@signal.gt?subject=Cambiar%20plan%20Entrepreneur"
               className="underline font-semibold" style={{ color: '#B8795B' }}>
              contactanos
            </a>.
          </p>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/entrepreneur/pricing"
              className="text-[12px] font-semibold" style={{ color: '#5F6F52' }}>
          Ver comparación completa de planes →
        </Link>
      </div>
    </div>
  )
}

function LimitRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-signal-text-muted">{label}</span>
      <span className="text-[13px] font-semibold text-signal-text">
        {value === 0 ? 'No incluido' : value.toLocaleString()}
      </span>
    </div>
  )
}
