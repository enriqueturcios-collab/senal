import Link from 'next/link'
import { fmtCurrency, timeAgo } from '@/lib/utils'

interface DemandCardProps {
  id: string; title: string; description: string; category: string
  budget_min: number | null; budget_max: number | null; currency: string
  zone: string | null; municipality: string | null
  urgency: string; offer_count: number
  buyer_name: string; is_anonymous: boolean; created_at: string
  image_urls?: string[]
}

function getCatStyle(cat: string): { bg: string; text: string } {
  const goods    = ['Productos','Alimentación','Vehículos']
  const services = ['Servicios','Empleos y Trabajo','Inmuebles']
  const pro      = ['Tecnología','Educación','Salud y Bienestar']
  if (goods.includes(cat))    return { bg: 'rgba(184,148,111,0.12)', text: '#8A684B' }
  if (services.includes(cat)) return { bg: 'rgba(95,111,82,0.12)',   text: '#5F6F52' }
  if (pro.includes(cat))      return { bg: 'rgba(184,121,91,0.12)',  text: '#B8795B' }
  return { bg: '#EAE3D6', text: '#7A7468' }
}

const URGENCY_LEFT: Record<string, string> = {
  immediate: '#B8795B',
  high:      '#B8946F',
  medium:    '#A8B39A',
  low:       '#DED6C8',
}

function isRecent(created_at: string) {
  return Date.now() - new Date(created_at).getTime() < 2 * 60 * 60 * 1000
}

export function DemandCard(props: DemandCardProps) {
  const { id, title, description, category, budget_min, budget_max,
          currency, zone, municipality, urgency, offer_count, created_at,
          image_urls } = props

  const budget = budget_min || budget_max
    ? budget_min && budget_max
      ? `${fmtCurrency(budget_min, currency)} – ${fmtCurrency(budget_max, currency)}`
      : fmtCurrency((budget_min ?? budget_max)!, currency)
    : null

  const location = zone ?? municipality
  const catStyle = getCatStyle(category)
  const fresh    = isRecent(created_at)
  const urgColor = URGENCY_LEFT[urgency] ?? '#DED6C8'

  return (
    <Link href={`/demand/${id}`} className="block group">
      <div className="rounded-2xl p-5 transition-all duration-200 ease-out
                      hover:-translate-y-0.5 hover:shadow-card-hover"
           style={{
             backgroundColor: '#FFFDF8',
             border: '1px solid #DED6C8',
             boxShadow: '0 2px 8px rgba(46,42,36,0.05)',
             borderLeft: `3px solid ${urgColor}`,
           }}>

        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: catStyle.bg, color: catStyle.text }}>
              {category}
            </span>
            {fresh && (
              <span className="flex items-center gap-1 text-[11px] font-semibold"
                    style={{ color: '#5F6F52' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: '#5F6F52' }} />
                Nuevo
              </span>
            )}
          </div>
          <span className="text-[11px] text-signal-text-muted shrink-0 mt-0.5">
            {timeAgo(created_at)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-semibold text-signal-text leading-snug line-clamp-2 mb-2"
            style={{ letterSpacing: '-0.01em' }}>
          {title}
        </h3>

        {/* Description */}
        <p className="text-[13px] text-signal-text-soft line-clamp-2 leading-relaxed mb-3">
          {description}
        </p>

        {/* Images */}
        {image_urls && image_urls.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-hidden">
            {image_urls.slice(0, 3).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt=""
                   className="w-16 h-16 rounded-xl object-cover shrink-0"
                   style={{ border: '1px solid #DED6C8' }} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3.5"
             style={{ borderTop: '1px solid #EAE3D6' }}>
          <div className="flex items-center gap-2 min-w-0">
            {location && (
              <span className="text-[12px] text-signal-text-muted truncate">{location}</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {budget && (
              <span className="text-[13px] font-semibold text-signal-text">{budget}</span>
            )}
            {offer_count > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: 'rgba(95,111,82,0.12)', color: '#5F6F52' }}>
                {offer_count} {offer_count === 1 ? 'oferta' : 'ofertas'}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
