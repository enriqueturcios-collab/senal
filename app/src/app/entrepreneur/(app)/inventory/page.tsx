import { ElementalGradient } from '@/components/ui/elemental-gradient'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireEntrepreneurAccess } from '@/lib/entitlements/feature-gate'
import { hasFeature, PLAN_DEFINITIONS } from '@/lib/entitlements/entrepreneur-plans'
import { query } from '@/db'
import { fmtCurrency, timeAgo } from '@/lib/utils'
import { InventoryActions } from './inventory-actions'

export default async function InventoryPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const ent  = await requireEntrepreneurAccess(session.user.id)
  const plan = ent.plan
  const def  = PLAN_DEFINITIONS[plan]
  const canManage = hasFeature(plan, 'inventory_manager')
  const canImport = hasFeature(plan, 'inventory_csv_import')
  const itemLimit = def.limits.inventory_items

  const items = await query<{
    id: string; title: string; description: string | null
    category: string | null; price: number | null; currency: string
    stock_quantity: number; condition: string; is_active: boolean
    tags_json: string; created_at: string
  }>(`
    SELECT i.id, i.title, LEFT(i.description, 100) AS description,
           c.name AS category, i.price, i.currency,
           i.stock_quantity, i.condition, i.is_active,
           i.tags_json::text AS tags_json,
           i.created_at::text
    FROM entrepreneur.inventory_items i
    LEFT JOIN app.categories c ON c.id = i.category_id
    WHERE i.user_id = $1
    ORDER BY i.is_active DESC, i.created_at DESC
  `, [session.user.id])

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 pb-28">

      <div className="relative rounded-2xl overflow-hidden mb-6 h-28">
        <ElementalGradient />
        <div className="absolute inset-0 bg-black/45 flex flex-col justify-end px-5 pb-4">
          <h1 className="text-[22px] font-bold text-white" style={{ letterSpacing: '-0.025em' }}>Inventario</h1>
          <p className="text-[12px] text-white/55 mt-0.5">
            {items.length} items{itemLimit > 0 && ` · límite ${itemLimit} en tu plan`}
          </p>
        </div>
      </div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div />
        <div className="flex items-center gap-2">
          {canImport && (
            <Link href="/entrepreneur/inventory/import"
                  className="text-[12px] font-semibold px-3 py-2 rounded-xl transition-colors"
                  style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8', color: '#4D4A43' }}>
              Importar CSV
            </Link>
          )}
          {canManage && itemLimit > 0 && items.length < itemLimit && (
            <Link href="/entrepreneur/inventory/new"
                  className="text-[12px] font-semibold px-4 py-2 rounded-xl text-white
                             hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#5F6F52' }}>
              + Agregar
            </Link>
          )}
        </div>
      </div>

      {/* Upgrade prompt */}
      {!canManage && (
        <div className="rounded-2xl p-6 mb-7 text-center"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <p className="text-[15px] font-semibold text-signal-text mb-2">Gestión de inventario</p>
          <p className="text-[13px] text-signal-text-muted mb-4 max-w-xs mx-auto">
            Activá Starter para registrar los productos y servicios que ofrecés y recibir matches automáticos.
          </p>
          <Link href="/entrepreneur/pricing"
                className="inline-block text-white font-semibold text-[13px] px-5 py-2.5 rounded-xl
                           hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#5F6F52' }}>
            Ver planes
          </Link>
        </div>
      )}

      {/* Usage bar */}
      {canManage && itemLimit > 0 && (
        <div className="rounded-2xl p-4 mb-6"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-semibold text-signal-text">Capacidad</p>
            <p className="text-[11px] text-signal-text-muted">{items.length} / {itemLimit}</p>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#EAE3D6' }}>
            <div className="h-full rounded-full transition-all"
                 style={{
                   width: `${Math.min(100, (items.length / itemLimit) * 100)}%`,
                   backgroundColor: items.length / itemLimit > 0.8 ? '#B8795B' : '#5F6F52',
                 }} />
          </div>
          {items.length >= itemLimit && (
            <p className="text-[11px] mt-2" style={{ color: '#B8795B' }}>
              Límite alcanzado.{' '}
              <Link href="/entrepreneur/pricing" className="underline font-semibold">
                Actualizá para más items
              </Link>
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {canManage && items.length === 0 && (
        <div className="rounded-2xl p-10 text-center"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <p className="text-[14px] font-semibold text-signal-text mb-2">Sin items aún</p>
          <p className="text-[12px] text-signal-text-muted mb-5 max-w-xs mx-auto">
            Registrá los productos o servicios que ofrecés para que Signal los vincule a demandas activas.
          </p>
          <Link href="/entrepreneur/inventory/new"
                className="inline-block text-white font-semibold text-[13px] px-5 py-2.5 rounded-xl
                           hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#5F6F52' }}>
            Agregar primer item
          </Link>
        </div>
      )}

      {/* Item list */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id}
                 className="rounded-2xl p-4"
                 style={{
                   backgroundColor: item.is_active ? '#FFFDF8' : '#F7F3EA',
                   border: '1px solid #DED6C8',
                   opacity: item.is_active ? 1 : 0.65,
                 }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {item.category && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#F1ECE2', color: '#7A7468' }}>
                        {item.category}
                      </span>
                    )}
                    {!item.is_active && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#EAE3D6', color: '#A7A196' }}>
                        Inactivo
                      </span>
                    )}
                    <span className="text-[10px] text-signal-ash ml-auto">{timeAgo(item.created_at)}</span>
                  </div>
                  <p className="text-[14px] font-semibold text-signal-text leading-snug mb-1">
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="text-[12px] text-signal-text-soft leading-relaxed">
                      {item.description}{item.description.length === 100 ? '…' : ''}
                    </p>
                  )}
                  {(() => { const tags = JSON.parse(item.tags_json || '[]') as string[]; return tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.slice(0, 4).map((t, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: '#F1ECE2', color: '#7A7468' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )})()}
                </div>
                <div className="text-right shrink-0">
                  {item.price && (
                    <p className="text-[15px] font-bold text-signal-text">
                      {fmtCurrency(item.price, item.currency)}
                    </p>
                  )}
                  <p className="text-[11px] text-signal-text-muted mt-0.5">
                    Stock: {item.stock_quantity}
                  </p>
                </div>
              </div>
              {canManage && (
                <InventoryActions itemId={item.id} isActive={item.is_active} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
