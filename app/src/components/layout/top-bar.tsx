import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function TopBar() {
  const session = await getServerSession(authOptions)

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold text-brand-600 tracking-tight">
        señal
      </Link>

      <div className="flex items-center gap-3">
        {session ? (
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold"
          >
            {session.user.name?.[0]?.toUpperCase() ?? '?'}
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Entrar
          </Link>
        )}
      </div>
    </header>
  )
}
