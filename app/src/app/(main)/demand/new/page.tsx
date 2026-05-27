import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getCategories, getZones } from '@/lib/data'
import { NewDemandForm } from './new-demand-form'

export default async function NewDemandPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [categories, zones] = await Promise.all([getCategories(), getZones()])

  return (
    <>
      <header className="sticky top-0 z-30 glass-warm px-5 py-3.5 flex items-center gap-3"
              style={{
                backgroundColor: 'rgba(247,243,234,0.92)',
                borderBottom: '1px solid #DED6C8',
              }}>
        <Link href="/"
              className="w-8 h-8 flex items-center justify-center rounded-xl
                         hover:bg-signal-surface-muted transition-colors text-signal-text-muted">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-[15px] font-semibold text-signal-text">Nueva demanda</h1>
      </header>

      <main className="px-5 py-6 bg-signal-bg min-h-screen">
        <NewDemandForm categories={categories} zones={zones} />
      </main>
    </>
  )
}
