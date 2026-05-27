'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface Category { id: number; name: string; level: number }

export function FeedFilters({ categories }: { categories: Category[] }) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const active       = searchParams.get('cat') ? Number(searchParams.get('cat')) : null

  const set = useCallback((catId: number | null) => {
    const p = new URLSearchParams(searchParams.toString())
    catId ? p.set('cat', String(catId)) : p.delete('cat')
    p.delete('page')
    router.push(`/?${p.toString()}`)
  }, [router, searchParams])

  const top = categories.filter(c => c.level === 0)

  return (
    <div className="flex gap-2 overflow-x-auto hide-scroll pb-0.5">
      <button
        onClick={() => set(null)}
        className="shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium
                   transition-all duration-150 active:scale-[0.97]"
        style={{
          backgroundColor: active === null ? '#4D4A43' : '#F1ECE2',
          color: active === null ? '#FFFDF8' : '#5F5B52',
          border: active === null ? '1px solid #4D4A43' : '1px solid #DED6C8',
        }}
      >
        Todo
      </button>
      {top.map(cat => (
        <button
          key={cat.id}
          onClick={() => set(cat.id)}
          className="shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium
                     transition-all duration-150 active:scale-[0.97]"
          style={{
            backgroundColor: active === cat.id ? '#4D4A43' : '#F1ECE2',
            color: active === cat.id ? '#FFFDF8' : '#5F5B52',
            border: active === cat.id ? '1px solid #4D4A43' : '1px solid #DED6C8',
          }}
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
    const p = new URLSearchParams(searchParams.toString())
    q.trim() ? p.set('q', q.trim()) : p.delete('q')
    p.delete('page')
    router.push(`/?${p.toString()}`)
  }

  return (
    <form onSubmit={handleSearch} className="relative">
      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-[15px] h-[15px] pointer-events-none"
           style={{ color: '#A7A196' }}
           fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="11" cy="11" r="8" />
        <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
      </svg>
      <input
        name="q"
        type="search"
        defaultValue={searchParams.get('q') ?? ''}
        placeholder="Buscar demandas…"
        className="w-full rounded-full pl-10 pr-4 py-2.5 text-[13px] text-signal-text
                   outline-none placeholder:text-signal-ash
                   transition-all duration-150"
        style={{
          backgroundColor: '#F1ECE2',
          border: '1px solid #DED6C8',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = '#5F6F52')}
        onBlur={e  => (e.currentTarget.style.borderColor = '#DED6C8')}
      />
    </form>
  )
}
