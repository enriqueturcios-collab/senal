import Link from 'next/link'
import { timeAgo } from '@/lib/utils'

export interface NotifItem {
  id: string
  href: string
  headline: string
  title: string
  meta: string
  cta: string
  time: string
  /** If true, the buyer already confirmed — highlight differently */
  buyerReady?: boolean
}

export function NotificationStack({ items }: { items: NotifItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="mb-6 space-y-2.5 animate-page-enter">
      {/* Section label */}
      <div className="flex items-center gap-2">
        <span className="relative flex w-2 h-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: '#C0392B' }} />
          <span className="relative inline-flex rounded-full w-2 h-2"
                style={{ backgroundColor: '#C0392B' }} />
        </span>
        <p className="text-[10px] font-bold uppercase tracking-widest"
           style={{ color: '#C0392B' }}>
          {items.length} acción{items.length > 1 ? 'es' : ''} pendiente{items.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Cards */}
      {items.map(n => (
        <Link key={n.id} href={n.href} className="block group">
          <div className="rounded-2xl p-4 transition-all duration-150
                          group-hover:-translate-y-0.5"
               style={{
                 backgroundColor: n.buyerReady ? '#FEF9F5' : '#FEF8F8',
                 border: `1.5px solid ${n.buyerReady ? 'rgba(184,121,91,0.45)' : 'rgba(192,57,43,0.35)'}`,
                 boxShadow: `0 2px 12px ${n.buyerReady ? 'rgba(184,121,91,0.12)' : 'rgba(192,57,43,0.1)'}`,
               }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide"
                        style={{ color: n.buyerReady ? '#B8795B' : '#C0392B' }}>
                    {n.headline}
                  </span>
                  <span className="text-[10px] text-signal-ash">{timeAgo(n.time)}</span>
                </div>
                <p className="text-[14px] font-bold text-signal-text leading-snug truncate">
                  {n.title}
                </p>
                <p className="text-[12px] text-signal-text-muted mt-0.5">{n.meta}</p>
              </div>
              <span className="shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-xl self-center
                               whitespace-nowrap"
                    style={{
                      backgroundColor: n.buyerReady ? '#B8795B' : '#C0392B',
                      color: 'white',
                    }}>
                {n.cta}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
