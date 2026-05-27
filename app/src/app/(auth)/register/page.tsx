import Link from 'next/link'
import { RegisterForm } from './register-form'

export default function RegisterPage() {
  return (
    <div className="w-full">
      <div className="lg:hidden text-center mb-8">
        <span className="text-[22px] font-bold tracking-[-0.03em] text-signal-text">signal</span>
      </div>

      <div className="mb-7">
        <h1 className="text-[26px] font-bold text-signal-text" style={{ letterSpacing: '-0.02em' }}>
          Crear cuenta
        </h1>
        <p className="text-[13px] text-signal-text-muted mt-1">Gratis. Sin tarjeta. 30 segundos.</p>
      </div>

      <RegisterForm />

      <p className="text-center text-[12px] text-signal-text-muted mt-6">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-signal-text font-semibold hover:text-signal-forest transition-colors">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
