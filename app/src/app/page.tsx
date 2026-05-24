import { Suspense } from 'react'
import Link from 'next/link'
import { getFeedDemands, getCategories } from '@/lib/data'
import { DemandCard } from '@/components/demand/demand-card'
import { TopBar } from '@/components/layout/top-bar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { FeedFilters, SearchBar } from './feed-filters'

interface PageProps {
  searchParams: { cat?: string; q?: string; page?: string }
}

export default async function HomePage({ searchParams }: PageProps) {
  const categoryId = searchParams.cat ? Number(searchParams.cat) : undefined
  const search     = searchParams.q   || undefined
  const page       = searchParams.page ? Number(searchParams.page) : 1

  const [{ rows, total }, categories] = await Promise.all([
    getFeedDemands({ categoryId, search, page }),
    getCategories(),
  ])

  const totalPages = Math.ceil(total / 20)

  return (
    <>
      <TopBar />

      <main className="pb-24">
        <div className="px-4 py-4 space-y-3">
          <Suspense>
            <SearchBar />
          </Suspense>

          <Suspense>
            <FeedFilters categories={categories} />
          </Suspense>
        </div>

        <div className="px-4 space-y-3">
          {rows.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg mb-2">Sin resultados</p>
              <p className="text-sm">Prueba con otro filtro o{' '}
                <Link href="/demand/new" className="text-brand-500">publica la primera demanda</Link>.
              </p>
            </div>
          ) : (
            rows.map(d => <DemandCard key={d.id} {...d} />)
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 py-8 px-4">
            {page > 1 && (
              <Link
                href={`/?${new URLSearchParams({ ...(searchParams), page: String(page - 1) })}`}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:border-brand-400"
              >
                Anterior
              </Link>
            )}
            <span className="text-sm text-gray-500">{page} / {totalPages}</span>
            {page < totalPages && (
              <Link
                href={`/?${new URLSearchParams({ ...(searchParams), page: String(page + 1) })}`}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:border-brand-400"
              >
                Siguiente
              </Link>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </>
  )
}
