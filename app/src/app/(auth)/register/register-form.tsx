'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { registerUser } from '@/actions/users'

const roles = [
  { value: 'buyer',  label: 'Comprar',  sub: 'Busco proveedores' },
  { value: 'seller', label: 'Vender',   sub: 'Ofrezco servicios' },
  { value: 'both',   label: 'Ambos',    sub: 'Compro y vendo' },
]

const inputCls = `w-full rounded-xl px-4 py-3 text-[14px] text-signal-text
  outline-none placeholder:text-signal-ash transition-all duration-150`

export function RegisterForm() {
  const router = useRouter()
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [role, setRole]       = useState('both')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    fd.set('role', role)
    const result = await registerUser(fd)
    if ('error' in result) { setError(result.error ?? 'Error.'); setLoading(false); return }
    const r = await signIn('credentials', { email: fd.get('email'), password: fd.get('password'), redirect: false })
    if (r?.ok) { router.push('/'); router.refresh() } else { router.push('/login') }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="rounded-xl px-4 py-3"
             style={{ backgroundColor: 'rgba(184,121,91,0.08)', border: '1px solid rgba(184,121,91,0.2)' }}>
          <p className="text-[13px] font-medium" style={{ color: '#B8795B' }}>{error}</p>
        </div>
      )}

      <input name="display_name" type="text" required placeholder="Nombre o apodo"
        className={inputCls}
        style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}
        onFocus={e => (e.currentTarget.style.borderColor = '#5F6F52')}
        onBlur={e  => (e.currentTarget.style.borderColor = '#DED6C8')}
      />
      <input name="email" type="email" required autoComplete="email" placeholder="Email"
        className={inputCls}
        style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}
        onFocus={e => (e.currentTarget.style.borderColor = '#5F6F52')}
        onBlur={e  => (e.currentTarget.style.borderColor = '#DED6C8')}
      />
      <input name="password" type="password" required minLength={8}
        placeholder="Contraseña (mín. 8 caracteres)"
        className={inputCls}
        style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}
        onFocus={e => (e.currentTarget.style.borderColor = '#5F6F52')}
        onBlur={e  => (e.currentTarget.style.borderColor = '#DED6C8')}
      />

      {/* Role selector */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {roles.map(r => (
          <button
            key={r.value}
            type="button"
            onClick={() => setRole(r.value)}
            className="rounded-xl p-3 text-center transition-all duration-150 active:scale-[0.97]"
            style={{
              backgroundColor: role === r.value ? '#FFFDF8' : '#F1ECE2',
              border: role === r.value ? '1.5px solid #5F6F52' : '1.5px solid #DED6C8',
              boxShadow: role === r.value ? '0 2px 8px rgba(95,111,82,0.12)' : 'none',
            }}
          >
            <p className="text-[13px] font-semibold"
               style={{ color: role === r.value ? '#5F6F52' : '#5F5B52' }}>
              {r.label}
            </p>
            <p className="text-[10px] mt-0.5 text-signal-ash">{r.sub}</p>
          </button>
        ))}
      </div>

      {/* Consent */}
      <div className="rounded-xl p-4 space-y-3"
           style={{ backgroundColor: '#F1ECE2', border: '1px solid #EAE3D6' }}>
        <p className="text-[10px] font-semibold text-signal-ash uppercase tracking-widest">Privacidad</p>

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="consent_analytics" value="true"
            className="mt-0.5 w-4 h-4 rounded shrink-0" />
          <span className="text-[12px] text-signal-text-soft leading-relaxed">
            Mis demandas se incluyen en{' '}
            <span className="text-signal-text font-medium">estadísticas anónimas</span> de mercado.{' '}
            <span className="text-signal-ash">(Opcional)</span>
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="consent_b2b_aggregate" value="true"
            className="mt-0.5 w-4 h-4 rounded shrink-0" />
          <span className="text-[12px] text-signal-text-soft leading-relaxed">
            Datos agregados se comparten con{' '}
            <span className="text-signal-text font-medium">instituciones financieras</span>.{' '}
            <span className="text-signal-ash">(Opcional)</span>
          </span>
        </label>

        <p className="text-[11px] text-signal-ash">Nunca vendemos tu nombre ni datos personales.</p>
      </div>

      <button type="submit" disabled={loading}
        className="w-full text-white text-[14px] font-semibold
                   py-3 rounded-xl hover:opacity-90 active:scale-[0.99]
                   disabled:opacity-40 transition-all duration-150 shadow-button"
        style={{ backgroundColor: '#4D4A43' }}>
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin" />
            Creando cuenta…
          </span>
        ) : 'Crear cuenta gratis'}
      </button>
    </form>
  )
}
