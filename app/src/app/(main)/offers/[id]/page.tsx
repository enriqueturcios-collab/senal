import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query, queryOne } from '@/db'
import { fmtCurrency, timeAgo } from '@/lib/utils'

export default async function PublicOfferPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  const offer = await queryOne<{
    id: string; title: string; description: string | null
    category: string | null; price: number | null; max_price: number | null
    currency: string; condition: string; tags_json: string; images_json: string
    view_count: number; created_at: string; expires_at: string | null
    business_name: string | null; business_type: string | null
    seller_name: string; seller_id: string
    municipality_names: string
  }>(`
    SELECT o.id, o.title, o.description,
           c.name AS category, o.price, o.max_price, o.currency,
           o.condition, o.tags_json::text, o.images_json::text,
           o.view_count, o.created_at::text, o.expires_at::text,
           p.business_name, p.business_type,
           u.display_name AS seller_name, u.id AS seller_id,
           COALESCE(
             (SELECT string_agg(m.name, ', ')
              FROM app.municipalities m
              WHERE m.id::text = ANY(
                SELECT jsonb_array_elements_text(o.municipality_ids)
              )), 'Todo el país'
           ) AS municipality_names
    FROM entrepreneur.proactive_offers o
    JOIN entrepreneur.profiles p ON p.id = o.profile_id
    JOIN app.users u ON u.id = o.user_id
    LEFT JOIN app.categories c ON c.id = o.category_id
    WHERE o.id = $1 AND o.is_active = true
  `, [params.id])

  if (!offer) notFound()

  // Increment view count (fire and forget)
  query(`UPDATE entrepreneur.proactive_offers SET view_count = view_count + 1 WHERE id = $1`, [params.id])
    .catch(() => {})

  const tags   = JSON.parse(offer.tags_json   || '[]') as string[]
  const images = JSON.parse(offer.images_json || '[]') as string[]

  const priceLabel = offer.price && offer.max_price
    ? `${fmtCurrency(offer.price, offer.currency)} – ${fmtCurrency(offer.max_price, offer.currency)}`
    : offer.price    ? fmtCurrency(offer.price, offer.currency)
    : offer.max_price ? `hasta ${fmtCurrency(offer.max_price, offer.currency)}`
    : 'Precio a convenir'

  const CONDITION_LABEL: Record<string, string> = {
    service: 'Servicio', new: 'Producto nuevo',
    used: 'Producto usado', refurbished: 'Reacondicionado',
  }

  const businessInitials = (offer.business_name ?? offer.seller_name)
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-signal-bg pb-28">
      <div className="max-w-2xl mx-auto px-5 md:px-8 py-8 animate-page-enter">

        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] text-signal-text-muted
                                   hover:text-signal-text mb-6 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver al marketplace
        </Link>

        {/* Offer card */}
        <div className="rounded-2xl overflow-hidden"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>

          {/* Header band */}
          <div className="px-6 pt-6 pb-5" style={{ borderBottom: '1px solid #EAE3D6' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-2 mb-3">
                  {offer.category && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: '#F1ECE2', color: '#7A7468' }}>
                      {offer.category}
                    </span>
                  )}
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: '#EEF1EA', color: '#5F6F52' }}>
                    {CONDITION_LABEL[offer.condition] ?? offer.condition}
                  </span>
                  <span className="text-[11px] text-signal-ash ml-auto self-center">
                    {timeAgo(offer.created_at)}
                  </span>
                </div>
                <h1 className="text-[22px] font-bold text-signal-text leading-snug"
                    style={{ letterSpacing: '-0.02em' }}>
                  {offer.title}
                </h1>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[22px] font-bold text-signal-text" style={{ letterSpacing: '-0.03em' }}>
                  {priceLabel}
                </p>
              </div>
            </div>
          </div>

          {/* Photo gallery */}
          {images.length > 0 && (
            <div className={images.length === 1
              ? 'px-6 pt-5'
              : 'px-6 pt-5 grid gap-2 ' + (images.length >= 3 ? 'grid-cols-3' : 'grid-cols-2')}>
              {images.map((src, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img key={i} src={src} alt=""
                     className={`w-full object-cover rounded-xl ${images.length === 1 ? 'max-h-72' : 'h-36'}`} />
              ))}
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {offer.description && (
              <p className="text-[14px] text-signal-text-soft leading-relaxed">
                {offer.description}
              </p>
            )}

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t, i) => (
                  <span key={i} className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                        style={{ backgroundColor: 'rgba(95,111,82,0.1)', color: '#5F6F52' }}>
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-[12px] text-signal-text-muted pt-1">
              <span>📍 {offer.municipality_names}</span>
              <span>👁 {offer.view_count} vistas</span>
              {offer.expires_at && (
                <span>⏰ Hasta {new Date(offer.expires_at).toLocaleDateString('es-GT')}</span>
              )}
            </div>
          </div>

          {/* Seller + CTA */}
          <div className="px-6 py-5 flex items-center justify-between gap-4"
               style={{ borderTop: '1px solid #EAE3D6', backgroundColor: '#F7F3EA' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center
                              text-[13px] font-bold text-white shrink-0"
                   style={{ backgroundColor: '#5F6F52' }}>
                {businessInitials}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-signal-text">
                  {offer.business_name ?? offer.seller_name}
                </p>
                {offer.business_type && (
                  <p className="text-[11px] text-signal-text-muted capitalize">
                    {offer.business_type.replace('_', ' ')}
                  </p>
                )}
              </div>
            </div>

            {session ? (
              <Link href={`/messages?to=${offer.seller_id}&offer=${offer.id}`}
                    className="btn-primary text-[13px] font-bold text-white px-5 py-2.5 rounded-xl shrink-0"
                    style={{ backgroundColor: '#5F6F52' }}>
                Contactar →
              </Link>
            ) : (
              <Link href={`/login?callbackUrl=/offers/${offer.id}`}
                    className="btn-primary text-[13px] font-bold text-white px-5 py-2.5 rounded-xl shrink-0"
                    style={{ backgroundColor: '#5F6F52' }}>
                Iniciar sesión para contactar
              </Link>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
