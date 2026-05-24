import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDemandDetail } from '@/lib/data'
import {
  cn, fmtCurrency, timeAgo,
  URGENCY_LABELS, URGENCY_COLORS,
  STATUS_LABELS, STATUS_COLORS,
  OFFER_STATUS_LABELS, OFFER_STATUS_COLORS,
} from '@/lib/utils'
import { OfferForm } from '@/components/demand/offer-form'
import { OfferList } from '@/components/demand/offer-actions'
import { CancelDemandButton } from '@/components/demand/cancel-button'

interface PageProps { params: { id: string } }

export default async function DemandDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  const { demand, offers, myOffer } = await getDemandDetail(
    params.id,
    session?.user.id
  )

  if (!demand) notFound()

  const isBuyer   = session?.user.id === demand.buyer_id
  const isSeller  = session && !isBuyer
  const canOffer  = isSeller && demand.status === 'open' && !myOffer
  const canCancel = isBuyer && ['open', 'in_progress'].includes(demand.status)

  const budget =
    demand.budget_min || demand.budget_max
      ? demand.budget_min && demand.budget_max
        ? `${fmtCurrency(demand.budget_min, demand.currency)} – ${fmtCurrency(demand.budget_max, demand.currency)}`
        : fmtCurrency(demand.budget_min ?? demand.budget_max, demand.currency)
      : null

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-gray-900 flex-1 truncate">{demand.title}</h1>
      </header>

      <main className="px-4 py-5 pb-32 space-y-5">
        {/* Status + urgency badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', STATUS_COLORS[demand.status])}>
            {STATUS_LABELS[demand.status]}
          </span>
          <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', URGENCY_COLORS[demand.urgency])}>
            {URGENCY_LABELS[demand.urgency]}
          </span>
          <span className="text-xs text-gray-400 ml-auto">{timeAgo(demand.created_at)}</span>
        </div>

        {/* Title & description */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{demand.title}</h2>
          <p className="text-gray-600 leading-relaxed">{demand.description}</p>
        </div>

        {/* Tags */}
        {demand.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {demand.tags.map(tag => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Metadata */}
        <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
          <InfoRow label="Categoría" value={demand.category_path || demand.category} />
          {(demand.zone || demand.municipality) && (
            <InfoRow
              label="Zona"
              value={[demand.zone, demand.municipality, demand.department].filter(Boolean).join(', ')}
            />
          )}
          {budget && <InfoRow label="Presupuesto" value={budget} />}
          <InfoRow label="Publicado por" value={demand.buyer_name} />
          <InfoRow label="Ofertas" value={String(demand.offer_count)} />
          <InfoRow label="Vistas" value={String(demand.view_count)} />
        </div>

        {/* My offer status (if seller already offered) */}
        {myOffer && (
          <div className={cn(
            'rounded-xl p-4 border',
            OFFER_STATUS_COLORS[myOffer.status],
            'border-current/20'
          )}>
            <p className="font-medium">Tu oferta: {fmtCurrency(myOffer.price, demand.currency)}</p>
            <p className="text-sm mt-0.5">
              Estado: {OFFER_STATUS_LABELS[myOffer.status] ?? myOffer.status}
            </p>
          </div>
        )}

        {/* Offer form (for sellers who haven't offered yet) */}
        {canOffer && <OfferForm demandId={demand.id} />}

        {!session && demand.status === 'open' && (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-center">
            <p className="text-sm text-brand-700 mb-3">Inicia sesión para hacer una oferta</p>
            <Link
              href="/login"
              className="inline-block bg-brand-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-brand-600"
            >
              Entrar
            </Link>
          </div>
        )}

        {/* Offers list (buyer only) */}
        {isBuyer && offers.length > 0 && (
          <OfferList
            offers={offers}
            demandId={demand.id}
            buyerId={demand.buyer_id}
            demandStatus={demand.status}
          />
        )}

        {/* Cancel demand */}
        {canCancel && (
          <CancelDemandButton userId={session!.user.id} demandId={demand.id} />
        )}
      </main>
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
    </div>
  )
}
