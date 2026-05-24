'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const items = [
  { href: '/',            label: 'Explorar',   icon: SearchIcon },
  { href: '/my-demands',  label: 'Mis demandas', icon: ListIcon },
  { href: '/demand/new',  label: 'Publicar',   icon: PlusIcon, primary: true },
  { href: '/my-offers',   label: 'Mis ofertas', icon: TagIcon },
  { href: '/messages',    label: 'Mensajes',   icon: ChatIcon },
]

export function BottomNav() {
  const path = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 safe-bottom z-40">
      <div className="flex">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active = path === href || (href !== '/' && path.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs',
                primary
                  ? 'relative'
                  : active
                    ? 'text-brand-600'
                    : 'text-gray-500'
              )}
            >
              {primary ? (
                <span className="w-12 h-12 -mt-6 rounded-full bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-200">
                  <Icon className="w-6 h-6 text-white" />
                </span>
              ) : (
                <Icon className={cn('w-6 h-6', active ? 'text-brand-600' : 'text-gray-400')} />
              )}
              <span className={primary ? 'text-brand-600 font-medium' : ''}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 12a7.5 7.5 0 0012.15 4.65z" />
    </svg>
  )
}
function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}
function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
    </svg>
  )
}
function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}
