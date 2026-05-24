'use client'
import { useState, FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error,   setError  ] = useState<string | null>(
    searchParams.get('error') === 'CredentialsSignin' ? 'Credenciales incorrectas.' : null
  )

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const fd = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email:    fd.get('email'),
      password: fd.get('password'),
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Correo institucional
        </label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="analista@banco.com"
          className="input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Contraseña
        </label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="input"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className={cn('btn-primary w-full justify-center', loading && 'opacity-60 cursor-not-allowed')}
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </button>
    </form>
  )
}
