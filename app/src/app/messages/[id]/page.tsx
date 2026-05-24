import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { query, queryOne } from '@/db'
import { BottomNav } from '@/components/layout/bottom-nav'
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

  // Mark messages as read
  await queryOne(
    'UPDATE app.messages SET read_at = now() WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL',
    [params.id, session.user.id]
  )

  const messages = await query<{
    id: string; sender_id: string; sender_name: string
    content: string; sent_at: string
  }>(`
    SELECT m.id, m.sender_id, u.display_name AS sender_name,
           m.content, m.sent_at::text
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
      'INSERT INTO app.messages (conversation_id, sender_id, content) VALUES ($1,$2,$3)',
      [params.id, session!.user.id, content]
    )
    await queryOne(
      'UPDATE app.conversations SET updated_at = now() WHERE id = $1',
      [params.id]
    )
    revalidatePath(`/messages/${params.id}`)
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/messages" className="text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{conv.other_name}</p>
          <Link href={`/demand/${conv.demand_id}`} className="text-xs text-brand-600 truncate block hover:underline">
            {conv.demand_title}
          </Link>
        </div>
      </header>

      <main className="pb-32 px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">Sin mensajes aún. Sé el primero.</p>
        )}

        {messages.map(m => {
          const isMine = m.sender_id === session.user.id
          return (
            <div key={m.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                isMine
                  ? 'bg-brand-500 text-white rounded-br-sm'
                  : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
              )}>
                <p>{m.content}</p>
                <p className={cn('text-xs mt-1', isMine ? 'text-brand-200' : 'text-gray-400')}>
                  {timeAgo(m.sent_at)}
                </p>
              </div>
            </div>
          )
        })}
      </main>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4 safe-bottom">
        <form action={sendMessage} className="flex gap-2">
          <input
            name="content"
            type="text"
            required
            maxLength={2000}
            placeholder="Escribe un mensaje…"
            autoComplete="off"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="w-10 h-10 bg-brand-500 text-white rounded-xl flex items-center justify-center hover:bg-brand-600 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </>
  )
}
