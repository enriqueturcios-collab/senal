import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getMyOffers } from '@/lib/data'
import { TopBar } from '@/components/layout/top-bar'
import { BottomNav } from '@/components/layout/bottom-nav'
import {
  cn, fmtCurrency, timeAgo,
  OFFER_STATUS_LABELS, OFFER_STATUS_COLORS,
  STATUS_LABELS, STATUS_COLORS,
} from '@/lib/utils'

export default async function MyOffersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const offers = await getMyOffers(session.user.id)

  return (
    <>
      <TopBar />

      <main className="pb-24 px-4 py-5">
        <h1 className="text-xl font-bold text-gray-900 mb-5">Mis ofertas</h1>

        {offers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-2">Sin ofertas aún</p>
            <Link href="/" className="text-brand-500 text-sm">
              Explorar demandas
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {offers.map(o => (
              <Link key={o.offer_id} href={`/demand/${o.demand_id}`} className="block">
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', OFFER_STATUS_COLORS[o.status])}>
                      {OFFER_STATUS_LABELS[o.status] ?? o.status}
                    </span>
                    <span className="text-xs text-gray-400">{timeAgo(o.created_at)}</span>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-0.5 line-clamp-2">{o.demand_title}</h3>
                  <p className="text-xs text-gray-500 mb-3">{o.category}</p>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <span>Demanda: </span>
                      <span className={cn('font-medium px-1.5 py-0.5 rounded-full', STATUS_COLORS[o.demand_status])}>
                        {STATUS_LABELS[o.demand_status]}
                      </span>
                    </div>
                    <span className="font-semibold text-gray-800 text-sm">
                      {fmtCurrency(o.price, o.currency)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </>
  )
}
