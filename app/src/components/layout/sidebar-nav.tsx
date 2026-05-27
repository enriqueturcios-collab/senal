'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/',           label: 'Home',        icon: HomeIcon,   badge: null    as null | 'demands' | 'offers' },
  { href: '/explore',    label: 'Explorar',     icon: SearchIcon, badge: null },
  { href: '/my-demands', label: 'Mis demandas', icon: GridIcon,   badge: 'demands' as const },
  { href: '/my-offers',  label: 'Mis ofertas',  icon: TagIcon,    badge: 'offers'  as const },
  { href: '/messages',   label: 'Mensajes',     icon: ChatIcon,   badge: null },
]

export function SidebarNav({ badges }: { badges?: { demands: number; offers: number } }) {
  const path = usePathname()

  return (
    <nav className="px-3 space-y-0.5">
      {items.map(({ href, label, icon: Icon, badge }) => {
        const active = href === '/' ? path === '/'
          : href === '/explore' ? path === '/explore' || path.startsWith('/explore?')
          : path.startsWith(href)
        const count = badge && badges ? badges[badge] : 0
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                        text-[13px] font-medium transition-all duration-150 ${
              active
                ? 'text-signal-forest'
                : 'text-signal-text-soft hover:text-signal-text hover:bg-signal-surface-muted'
            }`}
            style={active ? { backgroundColor: '#EEF1EA' } : {}}
          >
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                    style={{ backgroundColor: '#5F6F52' }} />
            )}
            <Icon active={active} />
            <span className="flex-1">{label}</span>
            {count > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center
                               text-[10px] font-bold text-white animate-pop"
                    style={{ backgroundColor: '#C0392B' }}>
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[16px] h-[16px] shrink-0"
         style={{ color: active ? '#5F6F52' : '#A7A196' }}
         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
    </svg>
  )
}
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[16px] h-[16px] shrink-0"
         style={{ color: active ? '#5F6F52' : '#A7A196' }}
         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3
               m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}
function GridIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[16px] h-[16px] shrink-0"
         style={{ color: active ? '#5F6F52' : '#A7A196' }}
         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2
               M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}
function TagIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[16px] h-[16px] shrink-0"
         style={{ color: active ? '#5F6F52' : '#A7A196' }}
         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M7 7h.01M3 3h9l9 9a2 2 0 010 2.83l-5.17 5.17a2 2 0 01-2.83 0L3 12V3z" />
    </svg>
  )
}
function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[16px] h-[16px] shrink-0"
         style={{ color: active ? '#5F6F52' : '#A7A196' }}
         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0
               01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12
               c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}
