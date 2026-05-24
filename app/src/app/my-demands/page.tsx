import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getMyDemands } from '@/lib/data'
import { TopBar } from '@/components/layout/top-bar'
import { BottomNav } from '@/components/layout/bottom-nav'
import {
  cn, fmtCurrency, timeAgo,
  STATUS_LABELS, STATUS_COLORS,
  URGENCY_LABELS, URGENCY_COLORS,
} from '@/lib/utils'

export default async function MyDemandsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const demands = await getMyDemands(session.user.id)

  return (
    <>
      <TopBar />

      <main className="pb-24 px-4 py-5">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-gray-900">Mis demandas</h1>
          <Link
            href="/demand/new"
            className="bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-brand-600"
          >
            + Nueva
          </Link>
        </div>

        {demands.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-2">Sin demandas aún</p>
            <Link href="/demand/new" className="text-brand-500 text-sm">
              Publica tu primera demanda
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {demands.map(d => (
              <Link key={d.id} href={`/demand/${d.id}`} className="block">
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[d.status])}>
                      {STATUS_LABELS[d.status]}
                    </span>
                    <span className="text-xs text-gray-400">{timeAgo(d.created_at)}</span>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{d.title}</h3>
                  <p className="text-xs text-gray-500 mb-3">{d.category}</p>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex gap-3">
                      <span className={cn(URGENCY_COLORS[d.urgency], 'px-2 py-0.5 rounded-full text-xs font-medium')}>
                        {URGENCY_LABELS[d.urgency]}
                      </span>
                      {(d.budget_min || d.budget_max) && (
                        <span className="text-gray-600">
                          {fmtCurrency(d.budget_min ?? d.budget_max, d.currency)}
                        </span>
                      )}
                    </div>
                    <span className={cn('font-medium', d.offer_count > 0 ? 'text-brand-600' : 'text-gray-400')}>
                      {d.offer_count} ofertas
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
