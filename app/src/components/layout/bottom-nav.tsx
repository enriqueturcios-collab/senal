'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const items = [
  { href: '/',           label: 'Home',      icon: HomeIcon },
  { href: '/explore',    label: 'Explorar',  icon: SearchIcon },
  { href: '/demand/new', label: '',          icon: PlusIcon, primary: true },
  { href: '/my-demands', label: 'Demandas',  icon: ListIcon },
  { href: '/messages',   label: 'Mensajes',  icon: ChatIcon },
]

export function BottomNav() {
  const path = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 safe-bottom glass-warm"
         style={{
           backgroundColor: 'rgba(255,253,248,0.92)',
           borderTop: '1px solid #DED6C8',
         }}>
      <div className="flex items-end h-16">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href)

          if (primary) {
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center h-full -mt-3"
              >
                <span className="w-12 h-12 rounded-2xl flex items-center justify-center
                                 shadow-button hover:opacity-90 active:scale-95
                                 transition-all duration-150"
                      style={{ backgroundColor: '#4D4A43' }}>
                  <Icon className="w-5 h-5 text-white" />
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-1 h-full pt-1"
            >
              <Icon className={cn(
                'w-[22px] h-[22px] transition-all duration-150',
                active ? 'scale-110' : ''
              )} style={{ color: active ? '#5F6F52' : '#A7A196' }} />
              <span className={cn(
                'text-[10px] font-medium transition-colors duration-150',
                active ? 'text-signal-forest' : 'text-signal-ash'
              )}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function HomeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24"
         stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3
               m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}
function SearchIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24"
         stroke="currentColor" strokeWidth={1.75}>
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
    </svg>
  )
}
function ListIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24"
         stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2
               M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24"
         stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  )
}
function ChatIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24"
         stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0
               01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12
               c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}
