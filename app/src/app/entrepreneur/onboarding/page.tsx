export const dynamic = 'force-dynamic'

import { ElementalGradient } from '@/components/ui/elemental-gradient'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ensureEntrepreneurProfile } from '@/lib/entitlements/feature-gate'
import { query } from '@/db'
import { OnboardingWizard } from './onboarding-wizard'

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login?callbackUrl=/entrepreneur/onboarding')

  const ent = await ensureEntrepreneurProfile(session.user.id, session.user.name ?? session.user.email)

  const categories = await query<{ id: number; name: string }>(`
    SELECT id, name FROM app.categories ORDER BY name
  `, [])

  const municipalities = await query<{ id: number; name: string }>(`
    SELECT id, name FROM app.municipalities ORDER BY name
  `, [])

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F7F3EA' }}>
      {/* Header with gradient */}
      <div className="relative h-24 shrink-0 overflow-hidden">
        <ElementalGradient />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <span className="text-[20px] font-bold tracking-[-0.03em] text-white">signal</span>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-5 py-4 pb-16">
        <div className="w-full max-w-lg">
          <OnboardingWizard
            defaultBusinessName={ent.businessName ?? session.user.name ?? ''}
            categories={categories}
            municipalities={municipalities}
          />
        </div>
      </div>
    </div>
  )
}
