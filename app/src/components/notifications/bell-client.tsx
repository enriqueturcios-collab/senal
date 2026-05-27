'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { NotifItem } from './notification-card'
import { timeAgo } from '@/lib/utils'

export function NotificationBellClient({
  items,
  align = 'right',
}: {
  items: NotifItem[]
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const count = items.length

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl
                   hover:bg-signal-surface-muted transition-colors"
        aria-label="Notificaciones"
      >
        <span className={count > 0 ? 'animate-bell-ring' : ''} style={{ display: 'inline-flex' }}>
          <svg
            className="w-[17px] h-[17px]"
            style={{ color: count > 0 ? '#C0392B' : '#7A7468' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}
          >
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0
                     00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159
                     c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </span>

        {count > 0 && (
          <span
            className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] px-0.5 rounded-full
                       flex items-center justify-center text-[9px] font-bold text-white animate-pop"
            style={{ backgroundColor: '#C0392B' }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full mt-2 w-[320px] rounded-2xl shadow-xl z-50 animate-slide-up-in overflow-hidden`}
          style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3"
               style={{ borderBottom: '1px solid #EAE3D6' }}>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <span className="relative flex w-2 h-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                        style={{ backgroundColor: '#C0392B' }} />
                  <span className="relative inline-flex rounded-full w-2 h-2"
                        style={{ backgroundColor: '#C0392B' }} />
                </span>
              )}
              <p className="text-[12px] font-bold text-signal-text">Notificaciones</p>
            </div>
            {count > 0 && (
              <p className="text-[11px] font-semibold" style={{ color: '#C0392B' }}>
                {count} pendiente{count > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Content */}
          {count === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[26px] mb-2">🔔</p>
              <p className="text-[13px] font-medium text-signal-text-muted">Todo al día</p>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto p-3 space-y-2">
              {items.map(n => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="block group"
                >
                  <div
                    className="rounded-xl p-3 transition-all duration-150 group-hover:-translate-y-0.5"
                    style={{
                      backgroundColor: n.buyerReady ? '#FEF9F5' : '#FEF8F8',
                      border: `1.5px solid ${n.buyerReady ? 'rgba(184,121,91,0.45)' : 'rgba(192,57,43,0.35)'}`,
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5"
                           style={{ color: n.buyerReady ? '#B8795B' : '#C0392B' }}>
                          {n.headline}
                        </p>
                        <p className="text-[13px] font-semibold text-signal-text leading-snug truncate">
                          {n.title}
                        </p>
                        <p className="text-[11px] text-signal-text-muted mt-0.5">{n.meta}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
                        <span
                          className="text-[10px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap"
                          style={{
                            backgroundColor: n.buyerReady ? '#B8795B' : '#C0392B',
                            color: 'white',
                          }}
                        >
                          {n.cta}
                        </span>
                        <span className="text-[10px] text-signal-ash">{timeAgo(n.time)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
