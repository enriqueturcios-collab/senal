import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-600 mb-1">señal</h1>
          <p className="text-gray-500 text-sm">Encuentra quién lo hace</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Iniciar sesión</h2>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
