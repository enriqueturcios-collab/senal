export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F7F3EA' }}>

      {/* Left — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-12 relative overflow-hidden"
           style={{ backgroundColor: '#FFFDF8', borderRight: '1px solid #DED6C8' }}>

        {/* Abstract mountain silhouette — very subtle */}
        <div className="absolute bottom-0 right-0 w-72 h-56 pointer-events-none"
             style={{ opacity: 0.04 }}>
          <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg"
               className="w-full h-full">
            <path d="M0 240 L70 80 L110 130 L160 20 L200 90 L250 40 L320 70 L320 240 Z"
                  fill="#171714" />
          </svg>
        </div>

        <div className="relative">
          <span className="text-[22px] font-bold tracking-[-0.03em] text-signal-text">
            signal
          </span>
        </div>

        <div className="relative">
          <p className="text-[30px] font-bold leading-snug mb-4 text-signal-text"
             style={{ letterSpacing: '-0.025em' }}>
            Conecta lo que necesitas<br />con quien lo hace.
          </p>
          <p className="text-[14px] leading-relaxed text-signal-text-muted">
            El marketplace local de Guatemala. Publica, recibe ofertas y cierra negocios — rápido.
          </p>
        </div>

        <p className="text-[12px] text-signal-ash relative">© 2025 signal · Guatemala</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
