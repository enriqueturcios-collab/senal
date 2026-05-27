import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireEntrepreneurAccess } from '@/lib/entitlements/feature-gate'
import { hasFeature, PLAN_DEFINITIONS } from '@/lib/entitlements/entrepreneur-plans'
import { query } from '@/db'
import { NewAlertForm } from './new-alert-form'

export default async function NewAlertPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const ent = await requireEntrepreneurAccess(session.user.id)
  if (!hasFeature(ent.plan, 'alert_rules')) redirect('/entrepreneur/alerts')

  const ruleLimit = PLAN_DEFINITIONS[ent.plan].limits.alert_rules
  const existing = await query<{ id: string }>(`
    SELECT id FROM entrepreneur.alert_rules WHERE user_id = $1
  `, [session.user.id])

  if (ruleLimit > 0 && existing.length >= ruleLimit) redirect('/entrepreneur/alerts')

  const categories = await query<{ id: number; name: string }>(`
    SELECT id, name FROM app.categories ORDER BY name
  `, [])

  return (
    <div className="max-w-xl mx-auto px-5 md:px-8 py-8 pb-28">
      <div className="mb-7">
        <h1 className="text-[22px] font-bold text-signal-text" style={{ letterSpacing: '-0.02em' }}>
          Nueva regla de alerta
        </h1>
        <p className="text-[12px] text-signal-text-muted mt-0.5">
          Signal te avisará cuando aparezcan demandas que coincidan
        </p>
      </div>
      <NewAlertForm categories={categories} />
    </div>
  )
}
