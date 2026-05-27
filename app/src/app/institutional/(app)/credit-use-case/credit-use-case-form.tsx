'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function CreditUseCaseForm({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter()
  const [q, setQ] = useState(initialQuery)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim()) return
    router.push(`/institutional/credit-use-case?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none"
           style={{ color: '#A7A196' }} fill="none" viewBox="0 0 24 24"
           stroke="currentColor" strokeWidth={2}>
        <circle cx="11" cy="11" r="8" />
        <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder='Ej: "negocio de helados", "taller de reparación de celulares"…'
        className="w-full rounded-2xl pl-11 pr-36 py-4 text-[15px] text-signal-text
                   outline-none placeholder:text-signal-ash transition-all"
        style={{
          backgroundColor: '#FFFDF8',
          border: '1px solid #DED6C8',
          boxShadow: '0 2px 12px rgba(46,42,36,0.06)',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#5F6F52'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(95,111,82,0.08)' }}
        onBlur={e  => { e.currentTarget.style.borderColor = '#DED6C8'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(46,42,36,0.06)' }}
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2
                   text-white text-[13px] font-semibold px-5 py-2 rounded-xl
                   hover:opacity-90 transition-all shadow-button"
        style={{ backgroundColor: '#4D4A43' }}
      >
        Analizar
      </button>
    </form>
  )
}
