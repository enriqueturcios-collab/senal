import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { query } from '@/db'
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
      (SELECT content_encrypted FROM app.messages WHERE conversation_id = c.id ORDER BY sent_at DESC LIMIT 1) AS last_message,
      COALESCE(c.last_msg_at, c.created_at)::text AS last_at,
      (SELECT COUNT(*) FROM app.messages WHERE conversation_id = c.id AND sender_id != $1 AND read_at IS NULL)::int AS unread_count
    FROM app.conversations c
    JOIN app.demands d ON d.id = c.demand_id
    JOIN app.users bu  ON bu.id = c.buyer_id
    JOIN app.users su  ON su.id = c.seller_id
    WHERE c.buyer_id = $1 OR c.seller_id = $1
    ORDER BY COALESCE(c.last_msg_at, c.created_at) DESC
    LIMIT 50
  `, [session.user.id])

  return (
    <div className="min-h-screen bg-signal-bg">
      <div className="max-w-2xl mx-auto px-5 md:px-8 pt-10 pb-28">

        <h1 className="text-[26px] font-bold text-signal-text mb-6"
            style={{ letterSpacing: '-0.02em' }}>
          Mensajes
        </h1>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                 style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}>
              <svg className="w-6 h-6 text-signal-ash" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8
                         a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72
                         C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-signal-text mb-1">Sin mensajes aún</p>
            <p className="text-[13px] text-signal-text-muted max-w-xs">
              Los chats aparecen cuando alguien responde a una demanda.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map(c => (
              <Link key={c.id} href={`/messages/${c.id}`} className="block group">
                <div className="flex items-center gap-4 rounded-2xl px-5 py-4 shadow-card
                                transition-all duration-200 hover:-translate-y-0.5
                                hover:shadow-card-hover"
                     style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>

                  <div className="w-10 h-10 rounded-full flex items-center justify-center
                                  text-[13px] font-bold shrink-0 text-white"
                       style={{ backgroundColor: '#5F6F52' }}>
                    {c.other_user_name[0]?.toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-[14px] font-semibold text-signal-text truncate">
                        {c.other_user_name}
                      </p>
                      <span className="text-[11px] text-signal-text-muted shrink-0 ml-2">
                        {timeAgo(c.last_at)}
                      </span>
                    </div>
                    <p className="text-[12px] text-signal-text-muted truncate">{c.demand_title}</p>
                    {c.last_message && (
                      <p className="text-[12px] text-signal-ash truncate mt-0.5">{c.last_message}</p>
                    )}
                  </div>

                  {c.unread_count > 0 && (
                    <span className="w-5 h-5 rounded-full text-white text-[11px] font-bold
                                     flex items-center justify-center shrink-0"
                          style={{ backgroundColor: '#5F6F52' }}>
                      {c.unread_count}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
