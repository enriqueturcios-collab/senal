'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { registerUser } from '@/actions/users'

export function RegisterForm() {
  const router = useRouter()
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const fd = new FormData(e.currentTarget)

    const result = await registerUser(fd)

    if ('error' in result) {
      setError(result.error ?? 'Error desconocido.')
      setLoading(false)
      return
    }

    // Auto-login after register
    const signInResult = await signIn('credentials', {
      email:    fd.get('email'),
      password: fd.get('password'),
      redirect: false,
    })

    if (signInResult?.ok) {
      router.push('/')
      router.refresh()
    } else {
      router.push('/login')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input
          name="display_name"
          type="text"
          required
          placeholder="Cómo te conocerán"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

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
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Quiero usar Señal para…</label>
        <select
          name="role"
          required
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="buyer">Buscar proveedores / contratar</option>
          <option value="seller">Ofrecer mis servicios o productos</option>
          <option value="both">Ambos</option>
        </select>
      </div>

      {/* Consent section — critical for ETL pipeline */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Permisos de datos</p>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="consent_analytics"
            value="true"
            className="mt-0.5 accent-brand-500"
          />
          <span className="text-sm text-gray-700">
            Acepto que mis demandas (sin datos personales) se incluyan en estadísticas
            de mercado anonimizadas.{' '}
            <span className="text-gray-400 text-xs">Opcional</span>
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="consent_b2b_aggregate"
            value="true"
            className="mt-0.5 accent-brand-500"
          />
          <span className="text-sm text-gray-700">
            Acepto que datos agregados (por categoría y zona) se compartan con
            instituciones financieras para análisis de mercado.{' '}
            <span className="text-gray-400 text-xs">Opcional</span>
          </span>
        </label>

        <p className="text-xs text-gray-400">
          Nunca vendemos tu nombre, contacto o datos individuales. Puedes cambiar
          estos permisos en cualquier momento desde tu perfil.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-500 text-white font-semibold py-3 rounded-xl hover:bg-brand-600 disabled:opacity-60 transition-colors"
      >
        {loading ? 'Creando cuenta…' : 'Crear cuenta gratis'}
      </button>

      <p className="text-center text-sm text-gray-500">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-brand-600 font-medium">
          Inicia sesión
        </Link>
      </p>
    </form>
  )
}
