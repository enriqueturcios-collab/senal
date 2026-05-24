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
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-gray-900">Nueva demanda</h1>
      </header>

      <main className="px-4 py-5">
        <NewDemandForm categories={categories} zones={zones} />
      </main>
    </>
  )
}
