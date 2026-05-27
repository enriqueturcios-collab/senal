'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function InstitutionalLoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/institutional/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Error de autenticación.')
      setLoading(false)
    } else {
      router.push('/institutional/dashboard')
    }
  }

  const inputCls = `w-full rounded-xl px-4 py-3 text-[14px] text-signal-text
    outline-none transition-all duration-150`
  const inputStyle = { backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }
  const focusFn = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = '#5F6F52'
    e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(95,111,82,0.08)'
  }
  const blurFn = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = '#DED6C8'
    e.currentTarget.style.boxShadow   = 'none'
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F7F3EA' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 px-10 py-12"
           style={{ backgroundColor: '#4D4A43' }}>
        <div>
          <span className="text-[22px] font-bold tracking-[-0.03em] text-white">signal</span>
          <p className="text-[12px] font-semibold uppercase tracking-widest mt-1"
             style={{ color: 'rgba(255,255,255,0.45)' }}>
            Demand Intelligence
          </p>
        </div>

        <div className="space-y-6">
          {[
            { icon: '◎', title: 'Demanda real del mercado', desc: 'Inteligencia agregada, no datos crudos.' },
            { icon: '◈', title: 'Análisis crediticio contextual', desc: 'Evidence del mercado para tu análisis.' },
            { icon: '◇', title: 'Multi-institución', desc: 'Acceso por banco, fintech o cooperativa.' },
          ].map(item => (
            <div key={item.title} className="flex gap-4">
              <span className="text-[18px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.icon}</span>
              <div>
                <p className="text-[13px] font-semibold text-white">{item.title}</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Esta plataforma provee inteligencia agregada de mercado. No constituye recomendación crediticia.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-[26px] font-bold text-signal-text mb-1"
                style={{ letterSpacing: '-0.025em' }}>
              Acceso institucional
            </h1>
            <p className="text-[14px] text-signal-text-muted">
              Ingresa con las credenciales de tu institución.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl px-4 py-3"
                   style={{ backgroundColor: 'rgba(184,121,91,0.08)', border: '1px solid rgba(184,121,91,0.2)' }}>
                <p className="text-[13px] font-medium" style={{ color: '#B8795B' }}>{error}</p>
              </div>
            )}

            <div>
              <label className="block text-[13px] font-medium text-signal-text-soft mb-1.5">
                Email institucional
              </label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="analista@institución.gt"
                className={inputCls} style={inputStyle}
                onFocus={focusFn} onBlur={blurFn}
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-signal-text-soft mb-1.5">
                Contraseña
              </label>
              <input
                type="password" required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputCls} style={inputStyle}
                onFocus={focusFn} onBlur={blurFn}
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full text-white font-semibold py-3.5 rounded-xl
                         hover:opacity-90 disabled:opacity-50 transition-all
                         shadow-button text-[14px] mt-2"
              style={{ backgroundColor: '#4D4A43' }}
            >
              {loading ? 'Verificando…' : 'Ingresar al portal'}
            </button>
          </form>

          <div className="mt-8 pt-6" style={{ borderTop: '1px solid #DED6C8' }}>
            <p className="text-[12px] text-signal-ash text-center">
              ¿No tenés credenciales?{' '}
              <a href="mailto:institucional@signal.gt"
                 className="font-medium" style={{ color: '#5F6F52' }}>
                Solicitar acceso
              </a>
            </p>
            <p className="text-[11px] text-center mt-3" style={{ color: '#A7A196' }}>
              Demo: analista@bancodemo.gt / password
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
