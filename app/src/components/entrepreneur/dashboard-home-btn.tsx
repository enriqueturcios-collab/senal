'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function DashboardHomeBtn() {
  const path = usePathname()
  if (path === '/entrepreneur/dashboard') return <div className="w-9" />

  return (
    <Link href="/entrepreneur/dashboard"
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:opacity-80"
          style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}
          title="Dashboard">
      <svg className="w-4 h-4" style={{ color: '#4D4A43' }} fill="none" viewBox="0 0 24 24"
           stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
      </svg>
    </Link>
  )
}
