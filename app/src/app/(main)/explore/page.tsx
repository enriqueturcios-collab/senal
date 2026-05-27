import { Suspense } from 'react'
import Link from 'next/link'
import { getCategories } from '@/lib/data'
import { searchExplore } from '@/lib/data'
import { DemandCard } from '@/components/demand/demand-card'
import { FeedSkeleton } from '@/components/demand/demand-card-skeleton'

interface PageProps {
  searchParams: { q?: string; cat?: string }
}

async function Results({ q, categoryId }: { q: string; categoryId?: number }) {
  const { results, alternatives, isAlternative } = await searchExplore({ q, categoryId, limit: 20 })

  if (!q && results.length === 0) {
    return (
      <div className="text-center py-20 text-signal-text-muted text-[14px]">
        Escribe algo para explorar demandas.
      </div>
    )
  }

  // No query → trending
  if (!q) {
    return (
      <div>
        <p className="text-[12px] font-semibold text-signal-text-muted uppercase tracking-widest mb-4">
          Tendencias
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {results.map(d => <DemandCard key={d.id} {...d} />)}
        </div>
      </div>
    )
  }

  // Exact results found
  if (results.length > 0) {
    return (
      <div>
        <p className="text-[13px] text-signal-text-muted mb-5">
          <span className="font-semibold text-signal-text">{results.length}</span>{' '}
          resultado{results.length !== 1 ? 's' : ''} para{' '}
          <span className="font-semibold text-signal-text">"{q}"</span>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {results.map(d => <DemandCard key={d.id} {...d} />)}
        </div>
      </div>
    )
  }

  // No exact results but alternatives found
  if (isAlternative && alternatives.length > 0) {
    return (
      <div>
        {/* Zero-results message */}
        <div className="rounded-2xl p-6 mb-7 text-center"
             style={{ backgroundColor: '#F5EDE6', border: '1px solid rgba(184,121,91,0.2)' }}>
          <p className="text-[15px] font-semibold text-signal-text mb-1">
            Sin resultados exactos para "{q}"
          </p>
          <p className="text-[13px] text-signal-text-muted">
            Pero estas demandas podrían interesarte:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alternatives.map(d => <DemandCard key={d.id} {...d} />)}
        </div>
      </div>
    )
  }

  // Nothing at all
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
           style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}>
        <svg className="w-6 h-6 text-signal-ash" fill="none" viewBox="0 0 24 24"
             stroke="currentColor" strokeWidth={1.5}>
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
      </div>
      <p className="text-[15px] font-semibold text-signal-text mb-1">
        Sin resultados para "{q}"
      </p>
      <p className="text-[13px] text-signal-text-muted mb-6 max-w-xs">
        Intenta con términos más generales, o publica una demanda para que los proveedores te encuentren.
      </p>
      <Link
        href="/demand/new"
        className="text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl
                   hover:opacity-90 transition-all shadow-button"
        style={{ backgroundColor: '#4D4A43' }}
      >
        Publicar demanda
      </Link>
    </div>
  )
}

export default async function ExplorePage({ searchParams }: PageProps) {
  const q          = searchParams.q ?? ''
  const categoryId = searchParams.cat ? Number(searchParams.cat) : undefined
  const categories = await getCategories()
  const top        = categories.filter(c => c.level === 0)

  return (
    <div className="min-h-screen bg-signal-bg">
      <div className="max-w-3xl mx-auto px-5 md:px-8 pt-6 pb-28">

        {/* Search bar — GET form, SSR-friendly */}
        <form method="GET" action="/explore" className="relative mb-5">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-[17px] h-[17px] pointer-events-none"
               style={{ color: '#A7A196' }}
               fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          {categoryId && (
            <input type="hidden" name="cat" value={categoryId} />
          )}
          <input
            name="q"
            type="search"
            defaultValue={q}
            autoFocus={!q}
            autoComplete="off"
            placeholder="Busca productos, servicios, trabajo…"
            className="w-full rounded-2xl pl-11 pr-28 py-4 text-[15px] text-signal-text
                       outline-none placeholder:text-signal-ash transition-all"
            style={{
              backgroundColor: '#FFFDF8',
              border: '1px solid #DED6C8',
              boxShadow: '0 2px 12px rgba(46,42,36,0.06)',
            }}
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2
                       text-white text-[13px] font-semibold px-4 py-2 rounded-xl
                       hover:opacity-90 transition-all shadow-button"
            style={{ backgroundColor: '#4D4A43' }}
          >
            Buscar
          </button>
        </form>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto hide-scroll pb-0.5 mb-6">
          <Link
            href={q ? `/explore?q=${encodeURIComponent(q)}` : '/explore'}
            className="shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium
                       transition-all duration-150"
            style={{
              backgroundColor: !categoryId ? '#4D4A43' : '#F1ECE2',
              color: !categoryId ? '#FFFDF8' : '#5F5B52',
              border: !categoryId ? '1px solid #4D4A43' : '1px solid #DED6C8',
            }}
          >
            Todo
          </Link>
          {top.map(cat => (
            <Link
              key={cat.id}
              href={q
                ? `/explore?q=${encodeURIComponent(q)}&cat=${cat.id}`
                : `/explore?cat=${cat.id}`}
              className="shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium
                         transition-all duration-150"
              style={{
                backgroundColor: categoryId === cat.id ? '#4D4A43' : '#F1ECE2',
                color: categoryId === cat.id ? '#FFFDF8' : '#5F5B52',
                border: categoryId === cat.id ? '1px solid #4D4A43' : '1px solid #DED6C8',
              }}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Results */}
        <Suspense fallback={<FeedSkeleton />}>
          <Results q={q} categoryId={categoryId} />
        </Suspense>

      </div>
    </div>
  )
}
