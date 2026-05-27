import Link from 'next/link'
import { fmtCurrency, timeAgo } from '@/lib/utils'

interface OfferCardProps {
  id: string; demand_id: string; demand_title: string; category: string
  seller_name: string; price: number; currency: string
  description: string | null; estimated_days: number | null
  created_at: string; image_urls?: string[]
}

function getCatStyle(cat: string): { bg: string; text: string; accent: string } {
  const goods    = ['Productos','Alimentación','Vehículos']
  const services = ['Servicios','Empleos y Trabajo','Inmuebles']
  const pro      = ['Tecnología','Educación','Salud y Bienestar']
  if (goods.includes(cat))    return { bg: 'rgba(184,148,111,0.12)', text: '#8A684B', accent: '#B8946F' }
  if (services.includes(cat)) return { bg: 'rgba(95,111,82,0.12)',   text: '#5F6F52', accent: '#5F6F52' }
  if (pro.includes(cat))      return { bg: 'rgba(184,121,91,0.12)',  text: '#B8795B', accent: '#B8795B' }
  return { bg: '#EAE3D6', text: '#7A7468', accent: '#B8795B' }
}

export function OfferCard(props: OfferCardProps) {
  const { demand_id, demand_title, category, seller_name,
          price, currency, description, estimated_days, created_at, image_urls } = props

  const initials  = seller_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const catStyle  = getCatStyle(category)
  const coverImg  = image_urls?.[0]

  return (
    <Link href={`/demand/${demand_id}`} className="block group shrink-0 w-64">
      <div className="h-full rounded-2xl overflow-hidden transition-all duration-200 ease-out
                      hover:-translate-y-0.5 hover:shadow-card-hover"
           style={{
             backgroundColor: '#FFFDF8',
             border: '1px solid #DED6C8',
             boxShadow: '0 2px 8px rgba(46,42,36,0.05)',
           }}>

        {/* Cover image or gradient header */}
        {coverImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImg} alt="" className="w-full h-36 object-cover" />
        ) : (
          <div className="w-full h-24 flex items-end px-4 pb-3 relative overflow-hidden"
               style={{ background: `linear-gradient(135deg, ${catStyle.accent}22 0%, ${catStyle.accent}10 100%)` }}>
            {/* Seller avatar overlaid */}
            <div className="w-10 h-10 rounded-full flex items-center justify-center
                            text-[13px] font-bold text-white shadow-sm"
                 style={{ backgroundColor: catStyle.accent }}>
              {initials}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4" style={{ borderTop: `2px solid ${catStyle.accent}` }}>

          {/* Seller row */}
          <div className="flex items-center gap-2 mb-3">
            {coverImg && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center
                              text-[9px] font-bold text-white shrink-0"
                   style={{ backgroundColor: catStyle.accent }}>
                {initials}
              </div>
            )}
            <p className="text-[12px] font-semibold text-signal-text truncate flex-1">
              {seller_name}
            </p>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{ backgroundColor: catStyle.bg, color: catStyle.text }}>
              {category}
            </span>
          </div>

          {/* Price */}
          <p className="text-[22px] font-bold text-signal-text leading-none mb-1"
             style={{ letterSpacing: '-0.025em' }}>
            {fmtCurrency(price, currency)}
          </p>
          {estimated_days && (
            <p className="text-[11px] text-signal-text-muted mb-2">
              Entrega en {estimated_days} {estimated_days === 1 ? 'día' : 'días'}
            </p>
          )}

          {description && (
            <p className="text-[12px] text-signal-text-soft line-clamp-2 leading-relaxed mb-3">
              {description}
            </p>
          )}

          <div className="flex items-center justify-between pt-2.5"
               style={{ borderTop: '1px solid #EAE3D6' }}>
            <p className="text-[11px] text-signal-ash truncate flex-1 mr-2">
              {demand_title}
            </p>
            <span className="text-[10px] text-signal-ash shrink-0">{timeAgo(created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
