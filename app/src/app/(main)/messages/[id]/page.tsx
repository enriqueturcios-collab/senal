import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { query, queryOne } from '@/db'
import { timeAgo, cn } from '@/lib/utils'

interface PageProps { params: { id: string } }

export default async function ConversationPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const conv = await queryOne<{
    id: string
    buyer_id: string; seller_id: string
    demand_id: string; demand_title: string
    other_name: string
  }>(`
    SELECT
      c.id, c.buyer_id, c.seller_id, c.demand_id,
      d.title AS demand_title,
      CASE WHEN c.buyer_id = $2 THEN su.display_name ELSE bu.display_name END AS other_name
    FROM app.conversations c
    JOIN app.demands d ON d.id = c.demand_id
    JOIN app.users bu  ON bu.id = c.buyer_id
    JOIN app.users su  ON su.id = c.seller_id
    WHERE c.id = $1 AND (c.buyer_id = $2 OR c.seller_id = $2)
  `, [params.id, session.user.id])

  if (!conv) notFound()

  await queryOne(
    'UPDATE app.messages SET read_at = now() WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL',
    [params.id, session.user.id]
  )

  const messages = await query<{
    id: string; sender_id: string; sender_name: string
    content: string; sent_at: string
  }>(`
    SELECT m.id, m.sender_id, u.display_name AS sender_name,
           m.content_encrypted AS content, m.sent_at::text
    FROM app.messages m
    JOIN app.users u ON u.id = m.sender_id
    WHERE m.conversation_id = $1
    ORDER BY m.sent_at ASC
    LIMIT 200
  `, [params.id])

  async function sendMessage(fd: FormData) {
    'use server'
    const content = String(fd.get('content') ?? '').trim()
    if (!content || content.length > 2000) return
    await queryOne(
      'INSERT INTO app.messages (conversation_id, sender_id, content_encrypted) VALUES ($1,$2,$3)',
      [params.id, session!.user.id, content]
    )
    await queryOne(
      'UPDATE app.conversations SET last_msg_at = now() WHERE id = $1',
      [params.id]
    )
    revalidatePath(`/messages/${params.id}`)
  }

  const initials = conv.other_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex flex-col" style={{ height: '100dvh', backgroundColor: '#F7F3EA' }}>

      {/* Header */}
      <header className="shrink-0 glass-warm px-5 py-4 flex items-center gap-4 z-10"
              style={{
                backgroundColor: 'rgba(255,253,248,0.92)',
                borderBottom: '1px solid #DED6C8',
              }}>
        <Link href="/messages"
          className="w-8 h-8 flex items-center justify-center rounded-xl
                     hover:bg-signal-surface-muted transition-colors text-signal-text-muted">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="w-9 h-9 rounded-full flex items-center justify-center
                        text-[13px] font-bold shrink-0 text-white"
             style={{ backgroundColor: '#5F6F52' }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-signal-text truncate">{conv.other_name}</p>
          <Link href={`/demand/${conv.demand_id}`}
            className="text-[11px] truncate block transition-colors"
            style={{ color: '#5F6F52' }}>
            {conv.demand_title}
          </Link>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-[13px] text-signal-text-muted py-12">
            Sin mensajes. Sé el primero en escribir.
          </p>
        )}

        {messages.map(m => {
          const isMine = m.sender_id === session.user.id
          return (
            <div key={m.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
              <div className="max-w-[72%] rounded-2xl px-4 py-2.5"
                   style={isMine
                     ? {
                         backgroundColor: '#5F6F52',
                         color: '#FFFDF8',
                         borderBottomRightRadius: '6px',
                       }
                     : {
                         backgroundColor: '#FFFDF8',
                         border: '1px solid #DED6C8',
                         color: '#171714',
                         borderBottomLeftRadius: '6px',
                         boxShadow: '0 1px 4px rgba(46,42,36,0.05)',
                       }
                   }>
                <p className="text-[14px] leading-relaxed">{m.content}</p>
                <p className="text-[10px] mt-1"
                   style={{ color: isMine ? 'rgba(255,253,248,0.6)' : '#A7A196' }}>
                  {timeAgo(m.sent_at)}
                </p>
              </div>
            </div>
          )
        })}
      </main>

      {/* Input */}
      <div className="shrink-0 glass-warm px-5 py-4"
           style={{ backgroundColor: 'rgba(255,253,248,0.92)', borderTop: '1px solid #DED6C8' }}>
        <form action={sendMessage} className="flex gap-2">
          <input
            name="content" type="text" required maxLength={2000}
            placeholder="Escribe un mensaje…" autoComplete="off"
            className="flex-1 rounded-xl px-4 py-2.5 text-[14px] text-signal-text
                       outline-none placeholder:text-signal-ash transition-all"
            style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}
          />
          <button type="submit"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white
                       hover:opacity-90 active:scale-[0.96] transition-all shadow-button shrink-0"
            style={{ backgroundColor: '#5F6F52' }}>
            <svg className="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>

    </div>
  )
}
