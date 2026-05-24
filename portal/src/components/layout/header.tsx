'use client'
import { signOut, useSession } from 'next-auth/react'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const { data: session } = useSession()

  return (
    <header className="bg-white border-b border-surface-border px-8 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-500">{session?.user?.name}</span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-sm text-slate-400 hover:text-slate-700 transition-colors"
        >
          Salir
        </button>
      </div>
    </header>
  )
}
