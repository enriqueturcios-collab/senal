import Link from 'next/link'
import { fmtCurrency, timeAgo } from '@/lib/utils'

interface TrendingCardProps {
  id: string; title: string; category: string
  budget_min: number | null; budget_max: number | null; currency: string
  urgency: string; offer_count: number; view_count: number; created_at: string
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
const URGENCY_LABEL: Record<string, string> = {
  immediate: 'Inmediato', high: 'Urgente', medium: 'Normal', low: 'Sin prisa',
}

function isRecent(created_at: string) {
  return Date.now() - new Date(created_at).getTime() < 2 * 60 * 60 * 1000
}

export function TrendingCard(props: TrendingCardProps) {
  const { id, title, category, budget_min, budget_max, currency,
          urgency, offer_count, view_count, created_at, image_urls } = props

  const budget = budget_min || budget_max
    ? budget_min && budget_max
      ? `${fmtCurrency(budget_min, currency)} – ${fmtCurrency(budget_max, currency)}`
      : fmtCurrency((budget_min ?? budget_max)!, currency)
    : null

  const catStyle  = getCatStyle(category)
  const urgColor  = URGENCY_LEFT[urgency] ?? '#DED6C8'
  const urgLabel  = URGENCY_LABEL[urgency] ?? 'Normal'
  const fresh     = isRecent(created_at)

  const coverImg = image_urls?.[0]

  return (
    <Link href={`/demand/${id}`} className="block group shrink-0 w-64">
      <div className="h-full rounded-2xl overflow-hidden transition-all duration-200 ease-out
                      hover:-translate-y-0.5 hover:shadow-card-hover"
           style={{
             backgroundColor: '#FFFDF8',
             border: '1px solid #DED6C8',
             boxShadow: '0 2px 8px rgba(46,42,36,0.05)',
             borderLeft: `3px solid ${urgColor}`,
           }}>

        {/* Cover image */}
        {coverImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImg} alt="" className="w-full h-36 object-cover" />
        ) : (
          <div className="w-full h-20 flex items-center justify-center"
               style={{ backgroundColor: getCatGradient(category) }}>
            <CategoryIcon category={category} />
          </div>
        )}

        <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: catStyle.bg, color: catStyle.text }}>
            {category}
          </span>
          {fresh ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold"
                  style={{ color: '#5F6F52' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: '#5F6F52' }} />
              Nuevo
            </span>
          ) : (
            <span className="text-[10px] text-signal-text-muted">{timeAgo(created_at)}</span>
          )}
        </div>

        <h3 className="text-[14px] font-semibold text-signal-text leading-snug line-clamp-2 mb-3"
            style={{ letterSpacing: '-0.01em' }}>
          {title}
        </h3>

        <div className="pt-3 flex flex-col gap-2" style={{ borderTop: '1px solid #EAE3D6' }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-signal-text-muted">{urgLabel}</span>
            {budget && (
              <span className="text-[12px] font-bold text-signal-text">{budget}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-signal-ash">{view_count} vistas</span>
            {offer_count > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(95,111,82,0.12)', color: '#5F6F52' }}>
                {offer_count} {offer_count === 1 ? 'oferta' : 'ofertas'}
              </span>
            )}
          </div>
        </div>
        </div>
      </div>
    </Link>
  )
}

function getCatGradient(cat: string): string {
  const goods    = ['Productos','Alimentación','Vehículos']
  const services = ['Servicios','Empleos y Trabajo','Inmuebles']
  if (goods.includes(cat))    return 'rgba(184,148,111,0.15)'
  if (services.includes(cat)) return 'rgba(95,111,82,0.12)'
  return 'rgba(184,121,91,0.10)'
}

function CategoryIcon({ category }: { category: string }) {
  const color = getCatGradient(category).includes('111,82') ? '#5F6F52'
    : getCatGradient(category).includes('148,111') ? '#B8946F' : '#B8795B'
  return (
    <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24"
         stroke={color} strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}
