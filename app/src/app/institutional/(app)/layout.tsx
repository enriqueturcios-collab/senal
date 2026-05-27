import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getInstitutionalSession } from '@/lib/institutional-auth'
import { InstSidebar } from '@/components/institutional/inst-sidebar'
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

      {/* Top bar — always visible: hamburger space + back to Signal */}
      <div className="fixed top-0 inset-x-0 z-30 h-14 flex items-center justify-between px-4"
           style={{ backgroundColor: 'rgba(247,243,234,0.92)', borderBottom: '1px solid #DED6C8', backdropFilter: 'blur(8px)' }}>
        {/* Left: hamburger placeholder (the button is rendered by InstSidebar) */}
        <div className="w-9" />

        {/* Center: portal label */}
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#5F6F52' }} />
          <span className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: '#5F6F52' }}>
            Demand Intelligence
          </span>
        </div>

        {/* Right: back to Signal */}
        <Link href="/"
              className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-xl
                         transition-colors hover:bg-signal-surface-muted"
              style={{ color: '#4D4A43' }}>
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
