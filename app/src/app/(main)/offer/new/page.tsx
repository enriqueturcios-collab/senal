import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/db'
import { NewOfferForm } from './new-offer-form'

export default async function NewOfferPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login?callbackUrl=/offer/new')

  const [categories, municipalities] = await Promise.all([
    query<{ id: number; name: string }>(`SELECT id, name FROM app.categories ORDER BY name`, []),
    query<{ id: number; name: string }>(`SELECT id, name FROM app.municipalities ORDER BY name`, []),
  ])

  return (
    <div className="min-h-screen bg-signal-bg pb-28">
      <div className="max-w-xl mx-auto px-5 md:px-8 py-8 animate-page-enter">
        <div className="mb-7">
          <h1 className="text-[22px] font-bold text-signal-text" style={{ letterSpacing: '-0.02em' }}>
            Publicar oferta
          </h1>
          <p className="text-[12px] text-signal-text-muted mt-0.5">
            Aparecé en el marketplace y que los compradores te encuentren
          </p>
        </div>
        <NewOfferForm categories={categories} municipalities={municipalities} />
      </div>
    </div>
  )
}
