export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getInstitutionalSession } from '@/lib/institutional-auth'
import { InstSidebar } from '@/components/institutional/inst-sidebar'
import { ElementalGradient } from '@/components/ui/elemental-gradient'
import { queryOne } from '@/db'

export default async function InstitutionalLayout({ children }: { children: React.ReactNode }) {
  const session = await getInstitutionalSession()
  if (!session) redirect('/institutional/login')

  // Get institution plan tier
  const inst = await queryOne<{ inst_name: string; plan_tier: string }>(`
    SELECT i.name AS inst_name, p.tier AS plan_tier
    FROM b2b.institutions i
    JOIN b2b.plans p ON p.id = i.plan_id
    WHERE i.id = $1
  `, [session.iid])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F3EA' }}>
      <InstSidebar
        name={session.name}
        instName={inst?.inst_name ?? 'Institución'}
        planTier={inst?.plan_tier ?? 'basic'}
      />

      {/* Top bar */}
      <div className="fixed top-0 inset-x-0 z-30 h-14 flex items-center justify-between px-4 overflow-hidden"
           style={{ borderBottom: '1px solid rgba(0,0,0,0.15)' }}>
        <ElementalGradient />
        <div className="absolute inset-0 bg-black/45" />

        <div className="relative w-9" />

        <div className="relative flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
          <span className="text-[12px] font-semibold uppercase tracking-widest text-white/80">
            Demand Intelligence
          </span>
        </div>

        <Link href="/"
              className="relative flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-xl
                         transition-colors text-white/80 hover:text-white hover:bg-white/10">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Signal
        </Link>
      </div>

      {/* Content pushed below the top bar */}
      <div className="pt-14">
        {children}
      </div>
    </div>
  )
}
