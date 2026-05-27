import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireEntrepreneurAccess, checkUsageLimit } from '@/lib/entitlements/feature-gate'
import { hasFeature, PLAN_DEFINITIONS } from '@/lib/entitlements/entrepreneur-plans'
import { query } from '@/db'
import { NewItemForm } from './new-item-form'

export default async function NewInventoryItemPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const ent = await requireEntrepreneurAccess(session.user.id)
  if (!hasFeature(ent.plan, 'inventory_manager')) redirect('/entrepreneur/inventory')

  const { allowed } = await checkUsageLimit(session.user.id, ent.plan, 'inventory_items')
  if (!allowed) redirect('/entrepreneur/inventory')

  const categories = await query<{ id: number; name: string }>(`
    SELECT id, name FROM app.categories ORDER BY name
  `, [])

  return (
    <div className="max-w-xl mx-auto px-5 md:px-8 py-8 pb-28">
      <div className="mb-7">
        <h1 className="text-[22px] font-bold text-signal-text" style={{ letterSpacing: '-0.02em' }}>
          Agregar item
        </h1>
        <p className="text-[12px] text-signal-text-muted mt-0.5">
          Producto o servicio que ofrecés
        </p>
      </div>
      <NewItemForm categories={categories} />
    </div>
  )
}
