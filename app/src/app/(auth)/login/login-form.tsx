'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function LoginForm() {
  const router = useRouter()
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const fd = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email:    fd.get('email'),
      password: fd.get('password'),
      redirect: false,
    })

    if (result?.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-500 text-white font-semibold py-3 rounded-xl hover:bg-brand-600 disabled:opacity-60 transition-colors"
      >
        {loading ? 'Entrando…' : 'Entrar'}
      </button>

      <p className="text-center text-sm text-gray-500">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="text-brand-600 font-medium">
          Regístrate gratis
        </Link>
      </p>
    </form>
  )
}
