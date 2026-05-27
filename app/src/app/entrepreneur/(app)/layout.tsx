export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ensureEntrepreneurProfile } from '@/lib/entitlements/feature-gate'
import { queryOne } from '@/db'
import { EntrepreneurSidebar } from '@/components/entrepreneur/entrepreneur-sidebar'
import { DashboardHomeBtn } from '@/components/entrepreneur/dashboard-home-btn'
import type { EntrepreneurPlan } from '@/lib/entitlements/entrepreneur-plans'

export default async function EntrepreneurLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login?callbackUrl=/entrepreneur/dashboard')

  // Auto-create free profile if user has none
  const ent = await ensureEntrepreneurProfile(session.user.id, session.user.name ?? session.user.email)

  // Redirect to onboarding if profile is incomplete (no categories set yet)
  const profile = await queryOne<{ primary_category_ids: number[] }>(
    `SELECT primary_category_ids FROM entrepreneur.profiles WHERE user_id = $1`,
    [session.user.id]
  )
  const isIncomplete = !profile?.primary_category_ids?.length
  if (isIncomplete) redirect('/entrepreneur/onboarding')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F3EA' }}>
      <EntrepreneurSidebar
        name={session.user.name ?? session.user.email}
        businessName={ent.businessName}
        plan={ent.plan as EntrepreneurPlan}
      />

      {/* Top bar */}
      <div className="fixed top-0 inset-x-0 z-30 h-14 flex items-center justify-between px-4"
           style={{
             backgroundColor: 'rgba(247,243,234,0.92)',
             borderBottom: '1px solid #DED6C8',
             backdropFilter: 'blur(8px)',
           }}>
        <div className="w-9" />
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#5F6F52' }} />
          <span className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: '#5F6F52' }}>
            Signal Entrepreneur
          </span>
        </div>
        <DashboardHomeBtn />
      </div>

      <div className="pt-14 animate-page-enter">
        {children}
      </div>
    </div>
  )
}
