import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { queryOne } from '@/db'
import { TopBar } from '@/components/layout/top-bar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { updateConsent } from '@/actions/users'
import { cn } from '@/lib/utils'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = await queryOne<{
    id: string; display_name: string; email: string; bio: string | null
    role: string; created_at: string
    consent_analytics: string; consent_b2b_aggregate: string
  }>(`
    SELECT id, display_name, email, bio, role, created_at::text,
           consent_analytics, consent_b2b_aggregate
    FROM app.users WHERE id = $1
  `, [session.user.id])

  if (!user) redirect('/login')

  const roleLabel: Record<string, string> = {
    buyer: 'Comprador', seller: 'Proveedor', both: 'Comprador y proveedor',
  }

  async function toggleConsent(type: 'consent_analytics' | 'consent_b2b_aggregate', current: string) {
    'use server'
    const newValue = current === 'granted' ? 'denied' : 'granted'
    await updateConsent(session!.user.id, type, newValue as 'granted' | 'denied')
  }

  return (
    <>
      <TopBar />

      <main className="pb-24 px-4 py-5 space-y-6">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-bold">
              {user.display_name[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{user.display_name}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">{roleLabel[user.role] ?? user.role}</p>
            </div>
          </div>

          {user.bio && (
            <p className="text-sm text-gray-600">{user.bio}</p>
          )}
        </div>

        {/* Privacy & consent settings */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-1">Privacidad y datos</h3>
          <p className="text-xs text-gray-400 mb-4">
            Tus datos personales nunca se venden. Estos permisos controlan si tus demandas
            contribuyen a estadísticas de mercado completamente anonimizadas.
          </p>

          <div className="space-y-3">
            <ConsentRow
              label="Estadísticas de mercado"
              description="Tus demandas se incluyen en análisis agregados sin datos personales."
              granted={user.consent_analytics === 'granted'}
              onToggle={toggleConsent.bind(null, 'consent_analytics', user.consent_analytics)}
            />
            <ConsentRow
              label="Datos para instituciones financieras"
              description="Datos agregados por zona y categoría se comparten con bancos y cooperativas."
              granted={user.consent_b2b_aggregate === 'granted'}
              onToggle={toggleConsent.bind(null, 'consent_b2b_aggregate', user.consent_b2b_aggregate)}
            />
          </div>
        </section>

        {/* Sign out */}
        <Link
          href="/api/auth/signout"
          className="block text-center text-sm text-red-600 py-3 border border-red-200 rounded-xl hover:bg-red-50"
        >
          Cerrar sesión
        </Link>
      </main>

      <BottomNav />
    </>
  )
}

function ConsentRow({
  label,
  description,
  granted,
  onToggle,
}: {
  label: string
  description: string
  granted: boolean
  onToggle: () => Promise<void>
}) {
  return (
    <form action={onToggle} className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        type="submit"
        className={cn(
          'flex-shrink-0 w-11 h-6 rounded-full transition-colors relative mt-0.5',
          granted ? 'bg-brand-500' : 'bg-gray-200'
        )}
      >
        <span className={cn(
          'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all',
          granted ? 'left-[22px]' : 'left-0.5'
        )} />
      </button>
    </form>
  )
}
