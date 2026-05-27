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
      {/* Header */}
      <div className="flex items-center justify-center px-5 py-5 shrink-0">
        <span className="text-[20px] font-bold tracking-[-0.03em] text-signal-text">signal</span>
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
