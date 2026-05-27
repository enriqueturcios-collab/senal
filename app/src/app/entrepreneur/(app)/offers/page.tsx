import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireEntrepreneurAccess } from '@/lib/entitlements/feature-gate'
import { query } from '@/db'
import { fmtCurrency, timeAgo } from '@/lib/utils'
import { OfferActions } from './offer-actions'

export default async function MyOffersEntrepreneurPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  await requireEntrepreneurAccess(session.user.id)

  const offers = await query<{
    id: string; title: string; description: string | null
    category: string | null; price: number | null; max_price: number | null
    currency: string; condition: string; is_active: boolean
    tags_json: string; view_count: number; created_at: string; expires_at: string | null
  }>(`
    SELECT o.id, o.title, LEFT(o.description,120) AS description,
           c.name AS category, o.price, o.max_price, o.currency,
           o.condition, o.is_active, o.tags_json::text,
           o.view_count, o.created_at::text, o.expires_at::text
    FROM entrepreneur.proactive_offers o
    LEFT JOIN app.categories c ON c.id = o.category_id
    WHERE o.user_id = $1
    ORDER BY o.is_active DESC, o.created_at DESC
  `, [session.user.id])

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 pb-28">

      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-[24px] font-bold text-signal-text" style={{ letterSpacing: '-0.02em' }}>
            Mis Ofertas
          </h1>
          <p className="text-[12px] text-signal-text-muted mt-0.5">
            Publicaciones proactivas en el marketplace
          </p>
        </div>
        <Link href="/entrepreneur/offers/new"
                className="btn-primary text-[12px] font-semibold px-4 py-2 rounded-xl text-white shrink-0"
                style={{ backgroundColor: '#5F6F52' }}>
            + Nueva oferta
          </Link>
      </div>

      {offers.length === 0 && (
        <div className="rounded-2xl p-10 text-center"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <p className="text-[40px] mb-3">📣</p>
          <p className="text-[14px] font-semibold text-signal-text mb-2">Sin ofertas publicadas</p>
          <p className="text-[12px] text-signal-text-muted mb-5 max-w-xs mx-auto">
            Creá tu primera oferta y aparecé en el marketplace para que compradores te encuentren.
          </p>
          <Link href="/entrepreneur/offers/new"
                className="btn-primary inline-block text-white font-semibold text-[13px] px-5 py-2.5 rounded-xl"
                style={{ backgroundColor: '#5F6F52' }}>
            Publicar primera oferta
          </Link>
        </div>
      )}

      {offers.length > 0 && (
        <div className="space-y-3 stagger">
          {offers.map(offer => {
            const tags = JSON.parse(offer.tags_json || '[]') as string[]
            const priceLabel = offer.price && offer.max_price
              ? `${fmtCurrency(offer.price, offer.currency)} – ${fmtCurrency(offer.max_price, offer.currency)}`
              : offer.price ? fmtCurrency(offer.price, offer.currency)
              : offer.max_price ? `hasta ${fmtCurrency(offer.max_price, offer.currency)}`
              : null

            return (
              <div key={offer.id}
                   className="interactive-card rounded-2xl p-4"
                   style={{
                     backgroundColor: offer.is_active ? '#FFFDF8' : '#F7F3EA',
                     border: '1px solid #DED6C8',
                     opacity: offer.is_active ? 1 : 0.65,
                   }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {offer.category && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: '#F1ECE2', color: '#7A7468' }}>
                          {offer.category}
                        </span>
                      )}
                      {!offer.is_active && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: '#EAE3D6', color: '#A7A196' }}>
                          Inactiva
                        </span>
                      )}
                      {offer.expires_at && new Date(offer.expires_at) < new Date() && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: '#FDF3EE', color: '#B8795B' }}>
                          Expirada
                        </span>
                      )}
                      <span className="text-[10px] text-signal-ash ml-auto">{timeAgo(offer.created_at)}</span>
                    </div>
                    <p className="text-[14px] font-semibold text-signal-text leading-snug mb-1">
                      {offer.title}
                    </p>
                    {offer.description && (
                      <p className="text-[12px] text-signal-text-soft leading-relaxed">
                        {offer.description}{offer.description.length === 120 ? '…' : ''}
                      </p>
                    )}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tags.slice(0, 4).map((t, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: 'rgba(95,111,82,0.1)', color: '#5F6F52' }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {priceLabel && (
                      <p className="text-[14px] font-bold text-signal-text">{priceLabel}</p>
                    )}
                    <p className="text-[10px] text-signal-text-muted mt-0.5">
                      {offer.view_count} vista{offer.view_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3"
                     style={{ borderTop: '1px solid #EAE3D6' }}>
                  <Link href={`/offers/${offer.id}`}
                        className="text-[11px] font-semibold"
                        style={{ color: '#5F6F52' }}>
                    Ver pública →
                  </Link>
                  <OfferActions offerId={offer.id} isActive={offer.is_active} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
