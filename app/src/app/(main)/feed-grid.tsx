import Link from 'next/link'
import { getFeedDemands } from '@/lib/data'
import { DemandCard } from '@/components/demand/demand-card'

interface FeedGridProps {
  categoryId?: number
  search?: string
  page: number
  searchParams: { cat?: string; q?: string; page?: string }
}

export async function FeedGrid({ categoryId, search, page, searchParams }: FeedGridProps) {
  const { rows, total } = await getFeedDemands({ categoryId, search, page })
  const totalPages = Math.ceil(total / 20)

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
             style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}>
          <svg className="w-6 h-6 text-signal-ash" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={1.5}>
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
        </div>
        <p className="text-[15px] font-semibold text-signal-text mb-1">Sin resultados</p>
        <p className="text-[13px] text-signal-text-muted mb-6 max-w-xs">
          Prueba con otro filtro o sé el primero en publicar.
        </p>
        <Link
          href="/demand/new"
          className="inline-flex items-center gap-2 text-white text-[13px]
                     font-semibold px-5 py-2.5 rounded-xl hover:opacity-90
                     transition-all shadow-button"
          style={{ backgroundColor: '#4D4A43' }}
        >
          + Publicar demanda
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
        {rows.map(d => <DemandCard key={d.id} {...d} />)}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          {page > 1 && (
            <Link
              href={`/?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}
              className="px-4 py-2 text-[13px] font-medium rounded-xl
                         transition-all duration-150 text-signal-text-soft
                         hover:text-signal-text"
              style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}
            >
              ← Anterior
            </Link>
          )}
          <span className="text-[13px] text-signal-text-muted font-medium">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`}
              className="px-4 py-2 text-[13px] font-medium rounded-xl
                         transition-all duration-150 text-signal-text-soft
                         hover:text-signal-text"
              style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}
            >
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </>
  )
}
