import { ElementalGradient } from '@/components/ui/elemental-gradient'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { queryOne } from '@/db'
import { getUserReputation } from '@/lib/data'
import { computeTier, DISPUTE_STATUS_LABEL, DISPUTE_STATUS_STYLE } from '@/lib/reputation'
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

  const rep  = await getUserReputation(session.user.id)
  const tier = computeTier(rep.trade_count, rep.vouch_count, rep.disputes_unresolved)

  const roleLabel: Record<string, string> = {
    buyer: 'Comprador', seller: 'Proveedor', both: 'Comprador y proveedor',
  }

  async function toggleConsent(type: 'consent_analytics' | 'consent_b2b_aggregate', current: string) {
    'use server'
    const newValue = current === 'granted' ? 'denied' : 'granted'
    await updateConsent(session!.user.id, type, newValue as 'granted' | 'denied')
  }

  const initials = user.display_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <main className="min-h-screen bg-signal-bg pb-28 px-5 py-6 md:px-8 space-y-4">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Gradient header */}
        <div className="relative rounded-2xl overflow-hidden h-24">
          <ElementalGradient />
          <div className="absolute inset-0 bg-black/45 flex items-end px-5 pb-4">
            <h1 className="text-[22px] font-bold text-white" style={{ letterSpacing: '-0.025em' }}>Mi perfil</h1>
          </div>
        </div>

        {/* Profile card */}
        <div className="rounded-2xl p-5 shadow-card"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center
                            text-xl font-bold text-white"
                 style={{ backgroundColor: '#5F6F52' }}>
              {initials}
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-signal-text">{user.display_name}</h2>
              <p className="text-[13px] text-signal-text-muted">{user.email}</p>
              <p className="text-[11px] text-signal-ash mt-0.5">{roleLabel[user.role] ?? user.role}</p>
            </div>
          </div>

          {user.bio && (
            <p className="text-[13px] text-signal-text-soft">{user.bio}</p>
          )}
        </div>

        {/* Reputation */}
        <section className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest px-1"
             style={{ color: '#A7A196' }}>
            Mi reputación en la red
          </p>

          <div className="grid grid-cols-3 gap-2">
            {[
              { value: rep.trade_count, label: 'Tratos' },
              { value: rep.vouch_count, label: 'Avales' },
              { value: tier, label: 'Nivel' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3 text-center"
                   style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
                <p className="text-[20px] font-bold text-signal-text"
                   style={{ letterSpacing: '-0.02em' }}>
                  {s.value}
                </p>
                <p className="text-[10px] text-signal-text-muted mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {rep.vouches.length > 0 && (
            <div className="rounded-2xl overflow-hidden"
                 style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest px-4 pt-3.5 pb-2"
                 style={{ color: '#A7A196' }}>
                Avalado por
              </p>
              {rep.vouches.map((v, i) => (
                <Link key={v.voucher_id} href={`/users/${v.voucher_id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-signal-surface-muted
                                 transition-colors"
                      style={{ borderTop: i > 0 ? '1px solid #F0EBE2' : 'none' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center
                                  text-[9px] font-bold text-white shrink-0"
                       style={{ backgroundColor: '#5F6F52' }}>
                    {v.voucher_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <p className="text-[13px] font-medium text-signal-text flex-1">{v.voucher_name}</p>
                  <svg className="w-3 h-3 text-signal-ash" fill="none" viewBox="0 0 24 24"
                       stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}

          {/* Disputes as respondent */}
          {rep.disputes.length > 0 && (
            <div className="rounded-2xl overflow-hidden"
                 style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest px-4 pt-3.5 pb-2"
                 style={{ color: '#A7A196' }}>
                Disputas abiertas contra mí
              </p>
              {rep.disputes.map((d, i) => {
                const ds = DISPUTE_STATUS_STYLE[d.status]
                return (
                  <Link key={d.id} href={`/disputes/${d.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-signal-surface-muted transition-colors"
                        style={{ borderTop: i > 0 ? '1px solid #F0EBE2' : 'none' }}>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                          style={{ backgroundColor: ds.bg, color: ds.color }}>
                      {DISPUTE_STATUS_LABEL[d.status]}
                    </span>
                    <p className="text-[12px] text-signal-text flex-1 truncate">{d.description}</p>
                    <svg className="w-3 h-3 text-signal-ash shrink-0" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )
              })}
            </div>
          )}

          <Link href={`/users/${user.id}`}
                className="block text-center text-[12px] font-semibold py-2.5 rounded-xl
                           transition-colors hover:opacity-80"
                style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8', color: '#5F6F52' }}>
            Ver mi perfil público →
          </Link>
        </section>

        {/* Privacy & consent */}
        <section className="rounded-2xl p-5 shadow-card"
                 style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <h3 className="font-semibold text-signal-text mb-1">Privacidad y datos</h3>
          <p className="text-[12px] text-signal-text-muted mb-4">
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

        {/* Quick links */}
        <div className="rounded-2xl overflow-hidden shadow-card"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <Link href="/my-demands"
                className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-signal-surface-muted"
                style={{ borderBottom: '1px solid #EAE3D6' }}>
            <span className="text-[14px] font-medium text-signal-text">Mis demandas</span>
            <svg className="w-4 h-4 text-signal-ash" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href="/my-offers"
                className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-signal-surface-muted">
            <span className="text-[14px] font-medium text-signal-text">Mis ofertas</span>
            <svg className="w-4 h-4 text-signal-ash" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Entrepreneur portal */}
        <Link href="/entrepreneur/dashboard"
              className="block rounded-2xl p-5 transition-all hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #4D4A43 0%, #3A3830 100%)',
                boxShadow: '0 2px 12px rgba(46,42,36,0.15)',
              }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-bold text-[14px]" style={{ letterSpacing: '-0.01em' }}>
                Signal Entrepreneur
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Gestioná tu negocio y encontrá clientes
              </p>
            </div>
            <svg className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} fill="none"
                 viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        {/* Sign out */}
        <Link
          href="/api/auth/signout"
          className="block text-center text-[13px] py-3 rounded-xl transition-colors
                     hover:opacity-80"
          style={{
            color: '#B8795B',
            border: '1px solid rgba(184,121,91,0.25)',
            backgroundColor: 'rgba(184,121,91,0.05)',
          }}
        >
          Cerrar sesión
        </Link>
      </div>
    </main>
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
    <form action={onToggle} className="flex items-start justify-between gap-4 py-1">
      <div className="flex-1">
        <p className="text-[13px] font-medium text-signal-text">{label}</p>
        <p className="text-[11px] text-signal-text-muted mt-0.5">{description}</p>
      </div>
      <button
        type="submit"
        className="flex-shrink-0 w-11 h-6 rounded-full transition-colors relative mt-0.5"
        style={{ backgroundColor: granted ? '#5F6F52' : '#DED6C8' }}
      >
        <span className={cn(
          'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-button transition-all',
          granted ? 'left-[22px]' : 'left-0.5'
        )} />
      </button>
    </form>
  )
}
