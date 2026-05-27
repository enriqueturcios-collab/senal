'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const inputCls = `w-full rounded-xl px-4 py-3 text-[14px] text-signal-text
  outline-none placeholder:text-signal-ash
  transition-all duration-150`

export function LoginForm() {
  const router = useRouter()
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setLoading(true)
    const fd = new FormData(e.currentTarget)
    const r  = await signIn('credentials', { email: fd.get('email'), password: fd.get('password'), redirect: false })
    if (r?.ok) { router.push('/'); router.refresh() }
    else { setError('Email o contraseña incorrectos.'); setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="rounded-xl px-4 py-3"
             style={{ backgroundColor: 'rgba(184,121,91,0.08)', border: '1px solid rgba(184,121,91,0.2)' }}>
          <p className="text-[13px] font-medium" style={{ color: '#B8795B' }}>{error}</p>
        </div>
      )}

      <input name="email" type="email" required autoComplete="email" placeholder="Email"
        className={inputCls}
        style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}
        onFocus={e => (e.currentTarget.style.borderColor = '#5F6F52')}
        onBlur={e  => (e.currentTarget.style.borderColor = '#DED6C8')}
      />

      <input name="password" type="password" required autoComplete="current-password"
        placeholder="Contraseña"
        className={inputCls}
        style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}
        onFocus={e => (e.currentTarget.style.borderColor = '#5F6F52')}
        onBlur={e  => (e.currentTarget.style.borderColor = '#DED6C8')}
      />

      <button type="submit" disabled={loading}
        className="w-full text-white text-[14px] font-semibold
                   py-3 rounded-xl hover:opacity-90 active:scale-[0.99]
                   disabled:opacity-40 transition-all duration-150 mt-1 shadow-button"
        style={{ backgroundColor: '#4D4A43' }}>
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin" />
            Entrando…
          </span>
        ) : 'Entrar'}
      </button>
    </form>
  )
}
