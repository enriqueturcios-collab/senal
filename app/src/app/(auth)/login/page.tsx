import { Suspense } from 'react'
import Link from 'next/link'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div className="w-full">
      {/* Mobile logo */}
      <div className="lg:hidden text-center mb-8">
        <span className="text-[22px] font-bold tracking-[-0.03em] text-signal-text">signal</span>
      </div>

      <div className="mb-7">
        <h1 className="text-[26px] font-bold text-signal-text" style={{ letterSpacing: '-0.02em' }}>
          Iniciar sesión
        </h1>
        <p className="text-[13px] text-signal-text-muted mt-1">Accede a tu cuenta de signal.</p>
      </div>

      <Suspense>
        <LoginForm />
      </Suspense>

      <p className="text-center text-[12px] text-signal-text-muted mt-6">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="text-signal-text font-semibold hover:text-signal-forest transition-colors">
          Regístrate gratis
        </Link>
      </p>
    </div>
  )
}
