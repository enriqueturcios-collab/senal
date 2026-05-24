import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { query } from '@/db'
import { TopBar } from '@/components/layout/top-bar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { timeAgo } from '@/lib/utils'

export default async function MessagesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const conversations = await query<{
    id: string
    other_user_name: string
    demand_title: string
    demand_id: string
    last_message: string | null
    last_at: string
    unread_count: number
  }>(`
    SELECT
      c.id,
      CASE WHEN c.buyer_id = $1 THEN su.display_name ELSE bu.display_name END AS other_user_name,
      d.title AS demand_title,
      c.demand_id,
      (SELECT content FROM app.messages WHERE conversation_id = c.id ORDER BY sent_at DESC LIMIT 1) AS last_message,
      c.updated_at::text AS last_at,
      (SELECT COUNT(*) FROM app.messages WHERE conversation_id = c.id AND sender_id != $1 AND read_at IS NULL)::int AS unread_count
    FROM app.conversations c
    JOIN app.demands d ON d.id = c.demand_id
    JOIN app.users bu  ON bu.id = c.buyer_id
    JOIN app.users su  ON su.id = c.seller_id
    WHERE c.buyer_id = $1 OR c.seller_id = $1
    ORDER BY c.updated_at DESC
    LIMIT 50
  `, [session.user.id])

  return (
    <>
      <TopBar />

      <main className="pb-24 px-4 py-5">
        <h1 className="text-xl font-bold text-gray-900 mb-5">Mensajes</h1>

        {conversations.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-2">Sin mensajes aún</p>
            <p className="text-sm">Los chats aparecen cuando el comprador inicia contacto.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map(c => (
              <Link key={c.id} href={`/messages/${c.id}`} className="block">
                <div className="flex items-start gap-3 bg-white rounded-xl px-4 py-3 hover:bg-gray-50 border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {c.other_user_name[0]?.toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.other_user_name}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(c.last_at)}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{c.demand_title}</p>
                    {c.last_message && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{c.last_message}</p>
                    )}
                  </div>

                  {c.unread_count > 0 && (
                    <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center flex-shrink-0">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </>
  )
}
