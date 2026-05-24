'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { cn } from '@/lib/utils'

interface Category {
  id: number
  name: string
  level: number
}

export function FeedFilters({ categories }: { categories: Category[] }) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const active       = searchParams.get('cat') ? Number(searchParams.get('cat')) : null

  const setFilter = useCallback(
    (catId: number | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (catId) {
        params.set('cat', String(catId))
      } else {
        params.delete('cat')
      }
      params.delete('page')
      router.push(`/?${params.toString()}`)
    },
    [router, searchParams]
  )

  const topLevel = categories.filter(c => c.level === 0)

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      <button
        onClick={() => setFilter(null)}
        className={cn(
          'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
          active === null
            ? 'bg-brand-500 text-white border-brand-500'
            : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
        )}
      >
        Todo
      </button>

      {topLevel.map(cat => (
        <button
          key={cat.id}
          onClick={() => setFilter(cat.id)}
          className={cn(
            'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
            active === cat.id
              ? 'bg-brand-500 text-white border-brand-500'
              : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}

export function SearchBar() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = new FormData(e.currentTarget).get('q') as string
    const params = new URLSearchParams(searchParams.toString())
    if (q.trim()) {
      params.set('q', q.trim())
    } else {
      params.delete('q')
    }
    params.delete('page')
    router.push(`/?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSearch} className="relative">
      <input
        name="q"
        type="search"
        defaultValue={searchParams.get('q') ?? ''}
        placeholder="Buscar demandas…"
        className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 12a7.5 7.5 0 0012.15 4.65z" />
      </svg>
    </form>
  )
}
