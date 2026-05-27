import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireEntrepreneurAccess } from '@/lib/entitlements/feature-gate'
import { query } from '@/db'
import { NewOfferForm } from './new-offer-form'

export default async function NewOfferPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  await requireEntrepreneurAccess(session.user.id)

  const [categories, municipalities] = await Promise.all([
    query<{ id: number; name: string }>(`SELECT id, name FROM app.categories ORDER BY name`, []),
    query<{ id: number; name: string }>(`SELECT id, name FROM app.municipalities ORDER BY name`, []),
  ])

  return (
    <div className="max-w-xl mx-auto px-5 md:px-8 py-8 pb-28">
      <div className="mb-7">
        <h1 className="text-[22px] font-bold text-signal-text" style={{ letterSpacing: '-0.02em' }}>
          Nueva oferta
        </h1>
        <p className="text-[12px] text-signal-text-muted mt-0.5">
          Publicá lo que ofrecés en el marketplace
        </p>
      </div>
      <NewOfferForm categories={categories} municipalities={municipalities} />
    </div>
  )
}
