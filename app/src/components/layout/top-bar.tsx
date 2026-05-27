import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NotificationBell } from '@/components/notifications/bell'
import { ElementalGradient } from '@/components/ui/elemental-gradient'

export async function TopBar() {
  const session = await getServerSession(authOptions)
  const initials = session?.user.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : null

  return (
    <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-5 relative overflow-hidden"
            style={{ borderBottom: '1px solid rgba(0,0,0,0.15)' }}>
      {/* Gradient background */}
      <ElementalGradient />
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <Link href="/" className="relative">
        <span className="text-[20px] font-bold tracking-[-0.03em] text-white">
          signal
        </span>
      </Link>

      <div className="relative flex items-center gap-1">
        <NotificationBell />
        <Link
          href="/institutional/dashboard"
          className="w-9 h-9 flex items-center justify-center rounded-xl
                     hover:bg-white/10 transition-colors"
          aria-label="Demand Intelligence"
          title="Portal institucional"
        >
          <svg className="w-[17px] h-[17px] text-white/70"
               fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z
                     M15 19V9a2 2 0 00-2-2h-2a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z
                     M21 19V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
          </svg>
        </Link>
        {session ? (
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full flex items-center justify-center
                       text-xs font-bold text-white
                       hover:opacity-80 transition-opacity"
            style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
          >
            {initials ?? '?'}
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-sm font-semibold text-white/80
                       hover:text-white transition-colors px-3 py-1.5"
          >
            Entrar
          </Link>
        )}
      </div>
    </header>
  )
}
