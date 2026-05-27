import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NotificationBell } from '@/components/notifications/bell'

export async function TopBar() {
  const session = await getServerSession(authOptions)
  const initials = session?.user.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : null

  return (
    <header className="sticky top-0 z-40 glass-warm px-5 h-14 flex items-center justify-between"
            style={{
              backgroundColor: 'rgba(247,243,234,0.88)',
              borderBottom: '1px solid #DED6C8',
            }}>
      <Link href="/">
        <span className="text-[20px] font-bold tracking-[-0.03em] text-signal-text">
          signal
        </span>
      </Link>

      <div className="flex items-center gap-1">
        <NotificationBell />
        <Link
          href="/institutional/dashboard"
          className="w-9 h-9 flex items-center justify-center rounded-xl
                     hover:bg-signal-surface-muted transition-colors"
          aria-label="Demand Intelligence"
          title="Portal institucional"
        >
          <svg className="w-[17px] h-[17px]" style={{ color: '#7A7468' }}
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
            style={{ backgroundColor: '#5F6F52' }}
          >
            {initials ?? '?'}
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-sm font-semibold text-signal-text-soft
                       hover:text-signal-text transition-colors px-3 py-1.5"
          >
            Entrar
          </Link>
        )}
      </div>
    </header>
  )
}
