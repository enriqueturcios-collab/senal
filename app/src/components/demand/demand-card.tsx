import Link from 'next/link'
import { cn, fmtCurrency, timeAgo, URGENCY_LABELS, URGENCY_COLORS } from '@/lib/utils'

interface DemandCardProps {
  id: string
  title: string
  description: string
  category: string
  budget_min: number | null
  budget_max: number | null
  currency: string
  zone: string | null
  municipality: string | null
  urgency: string
  offer_count: number
  buyer_name: string
  is_anonymous: boolean
  created_at: string
}

export function DemandCard(props: DemandCardProps) {
  const {
    id, title, description, category,
    budget_min, budget_max, currency,
    zone, municipality, urgency, offer_count,
    buyer_name, created_at,
  } = props

  const budget =
    budget_min || budget_max
      ? budget_min && budget_max
        ? `${fmtCurrency(budget_min, currency)} – ${fmtCurrency(budget_max, currency)}`
        : fmtCurrency(budget_min ?? budget_max, currency)
      : null

  return (
    <Link href={`/demand/${id}`} className="block">
      <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow active:scale-[0.99] transition-transform">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              URGENCY_COLORS[urgency]
            )}
          >
            {URGENCY_LABELS[urgency] ?? urgency}
          </span>
          <span className="text-xs text-gray-400">{timeAgo(created_at)}</span>
        </div>

        <h3 className="font-semibold text-gray-900 leading-snug mb-1 line-clamp-2">
          {title}
        </h3>

        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
          {description}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {category}
            </span>
            {(zone || municipality) && (
              <span>{zone ?? municipality}</span>
            )}
          </div>

          {budget && (
            <span className="font-medium text-gray-700">{budget}</span>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
          <span>{buyer_name}</span>
          <span className={cn(
            'font-medium',
            offer_count > 0 ? 'text-brand-600' : 'text-gray-400'
          )}>
            {offer_count} {offer_count === 1 ? 'oferta' : 'ofertas'}
          </span>
        </div>
      </article>
    </Link>
  )
}
