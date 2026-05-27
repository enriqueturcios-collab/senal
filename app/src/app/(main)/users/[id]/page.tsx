import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { queryOne } from '@/db'
import { getUserReputation } from '@/lib/data'
import { computeTier, TIER_STYLE, DISPUTE_STATUS_LABEL, DISPUTE_STATUS_STYLE } from '@/lib/reputation'
import { VouchButton } from './vouch-button'
import { DisputeForm } from './dispute-form'

export default async function PublicUserPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  const user = await queryOne<{
    id: string; display_name: string; bio: string | null; created_at: string
  }>(`
    SELECT id, display_name, bio, created_at::text
    FROM app.users
    WHERE id = $1 AND status = 'active' AND deleted_at IS NULL
  `, [params.id])

  if (!user) notFound()

  const rep = await getUserReputation(params.id, session?.user.id)
  const tier = computeTier(rep.trade_count, rep.vouch_count, rep.disputes_unresolved)
  const tc   = TIER_STYLE[tier]
  const initials = user.display_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-signal-bg pb-28">
      <div className="max-w-xl mx-auto px-5 md:px-8 py-8 animate-page-enter space-y-4">

        <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] text-signal-text-muted
                                   hover:text-signal-text transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </Link>

        {/* Identity */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center
                            text-xl font-bold text-white shrink-0"
                 style={{ backgroundColor: '#5F6F52' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-[18px] font-bold text-signal-text">{user.display_name}</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: tc.bg, color: tc.color }}>
                  {tier}
                </span>
              </div>
              {user.bio && <p className="text-[13px] text-signal-text-soft">{user.bio}</p>}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard value={rep.trade_count}   label="Tratos" />
          <StatCard value={rep.vouch_count}   label="Avales" />
          <StatCard value={rep.disputes_open + rep.disputes_unresolved} label="Disputas activas"
                    warn={rep.disputes_unresolved > 0} />
        </div>

        {/* Avales */}
        <Section title="Avalado por">
          {rep.vouches.length === 0 ? (
            <EmptyRow text="Sin avales aún" sub="Los avales aparecen después de tratos verificados." />
          ) : rep.vouches.map((v, i) => (
            <Link key={v.voucher_id} href={`/users/${v.voucher_id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-signal-surface-muted transition-colors"
                  style={{ borderTop: i > 0 ? '1px solid #F0EBE2' : 'none' }}>
              <Avatar name={v.voucher_name} />
              <p className="text-[13px] font-semibold text-signal-text flex-1">{v.voucher_name}</p>
              <Chevron />
            </Link>
          ))}
        </Section>

        {/* Aval CTA */}
        {session && rep.canVouch && (
          <VouchButton
            voucherId={session.user.id}
            voucheeId={user.id}
            voucheeName={user.display_name}
            tradeId={rep.canVouch.tradeId}
          />
        )}

        {/* Disputes */}
        {rep.disputes.length > 0 && (
          <Section title="Historial de disputas">
            {rep.disputes.map((d, i) => {
              const ds = DISPUTE_STATUS_STYLE[d.status]
              return (
                <Link key={d.id} href={`/disputes/${d.id}`}
                      className="block px-5 py-4 hover:bg-signal-surface-muted transition-colors"
                      style={{ borderTop: i > 0 ? '1px solid #F0EBE2' : 'none' }}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-[12px] text-signal-text-muted">
                      Denunciado por{' '}
                      <span className="font-semibold text-signal-text">{d.complainant_name}</span>
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                          style={{ backgroundColor: ds.bg, color: ds.color }}>
                      {DISPUTE_STATUS_LABEL[d.status]}
                    </span>
                  </div>
                  <p className="text-[13px] text-signal-text line-clamp-2">{d.description}</p>
                  {d.resolution_note && (
                    <p className="text-[11px] text-signal-text-muted mt-1 line-clamp-1">
                      Resolución: {d.resolution_note}
                    </p>
                  )}
                </Link>
              )
            })}
          </Section>
        )}

        {/* Open dispute CTA */}
        {session && session.user.id !== user.id && rep.canDispute && (
          <DisputeForm
            complainantId={session.user.id}
            respondentId={user.id}
            offerId={rep.canDispute.offerId}
            offerTitle={rep.canDispute.offerTitle}
          />
        )}

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden"
         style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
      <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #EAE3D6' }}>
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#A7A196' }}>
          {title}
        </p>
      </div>
      {children}
    </div>
  )
}

function EmptyRow({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="px-5 py-6 text-center">
      <p className="text-[13px] text-signal-text-muted">{text}</p>
      <p className="text-[11px] text-signal-ash mt-1">{sub}</p>
    </div>
  )
}

function StatCard({ value, label, warn }: { value: number; label: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl p-4 text-center"
         style={{ backgroundColor: '#FFFDF8', border: `1px solid ${warn && value > 0 ? 'rgba(184,121,91,0.3)' : '#DED6C8'}` }}>
      <p className="text-[28px] font-bold" style={{
        letterSpacing: '-0.03em',
        color: warn && value > 0 ? '#B8795B' : '#171714',
      }}>
        {value}
      </p>
      <p className="text-[11px] text-signal-text-muted mt-0.5">{label}</p>
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center
                    text-[10px] font-bold text-white shrink-0"
         style={{ backgroundColor: '#5F6F52' }}>
      {name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
    </div>
  )
}

function Chevron() {
  return (
    <svg className="w-3.5 h-3.5 text-signal-ash" fill="none" viewBox="0 0 24 24"
         stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}
