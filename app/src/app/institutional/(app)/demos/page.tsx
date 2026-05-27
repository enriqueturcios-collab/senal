import Link from 'next/link'
import { getInstitutionalSession } from '@/lib/institutional-auth'

const DEMOS = [
  {
    id: 'helados',
    title: 'Negocio de helados',
    subtitle: 'Capital de trabajo · Mixco',
    description: 'Apertura/expansión de heladería artesanal. Análisis de demanda en zonas urbanas de Guatemala.',
    params: { q: 'negocio de helados', department: 'Guatemala', municipality: 'Mixco', amount: '75000', payment: '3800', margin: '0.45', dscr: '1.20', term: '24', loanType: 'capital-de-trabajo' },
    color: '#5F6F52',
    icon: '🍦',
  },
  {
    id: 'celulares',
    title: 'Taller de reparación de celulares',
    subtitle: 'Inventario + equipamiento · Villa Nueva',
    description: 'Crédito para taller técnico de celulares. Análisis de demanda de reparación y accesorios.',
    params: { q: 'taller de reparación de celulares', department: 'Guatemala', municipality: 'Villa Nueva', amount: '45000', payment: '2200', margin: '0.55', dscr: '1.20', term: '24', loanType: 'capital-de-trabajo' },
    color: '#B8946F',
    icon: '📱',
  },
  {
    id: 'pintura',
    title: 'Servicios de pintura y remodelación',
    subtitle: 'Capital de trabajo · Mixco',
    description: 'Crédito para proveedor de servicios de pintura y remodelación. Service liquidity y estacionalidad.',
    params: { q: 'pintura y remodelación de casas', department: 'Guatemala', municipality: 'Mixco', amount: '30000', payment: '1600', margin: '0.60', dscr: '1.20', term: '24', loanType: 'capital-de-trabajo' },
    color: '#A7A196',
    icon: '🖌️',
  },
  {
    id: 'libros',
    title: 'Venta de libros universitarios',
    subtitle: 'Inventario · Zona universitaria',
    description: 'Crédito para compra de inventario de libros. Muestra estacionalidad y ciclo académico.',
    params: { q: 'libros universitarios usados', department: 'Guatemala', municipality: 'Guatemala', amount: '25000', payment: '1300', margin: '0.35', dscr: '1.20', term: '24', loanType: 'inventario' },
    color: '#B8795B',
    icon: '📚',
  },
  {
    id: 'repuestos',
    title: 'Repuestos de moto',
    subtitle: 'Inventario · Villa Nueva',
    description: 'Crédito para inventario de repuestos de moto. Demand-supply gap y zonas desatendidas.',
    params: { q: 'repuestos de moto', department: 'Guatemala', municipality: 'Villa Nueva', amount: '55000', payment: '2600', margin: '0.40', dscr: '1.20', term: '24', loanType: 'inventario' },
    color: '#4D4A43',
    icon: '🏍️',
  },
]

export default async function DemosPage() {
  const session = await getInstitutionalSession()
  if (!session) return null

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F3EA' }}>
      <div className="max-w-5xl mx-auto px-6 py-8 pb-16">
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-signal-ash mb-1">Demand Intelligence</p>
          <h1 className="text-[28px] font-bold text-signal-text" style={{ letterSpacing: '-0.025em' }}>
            Casos de demostración
          </h1>
          <p className="text-[14px] text-signal-text-muted mt-1">
            Casos prellenados para explorar análisis crediticio con datos reales de Signal.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {DEMOS.map(demo => {
            const params = new URLSearchParams()
            Object.entries(demo.params).forEach(([k, v]) => params.set(k, v))
            return (
              <Link key={demo.id} href={`/institutional/credit-memo/new?${params}`}
                    className="group block rounded-2xl p-6 transition-all duration-200 hover:shadow-lg"
                    style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', boxShadow: '0 2px 8px rgba(46,42,36,0.04)' }}>
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{demo.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: demo.color }} />
                      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: demo.color }}>
                        {demo.subtitle}
                      </p>
                    </div>
                    <h2 className="text-[17px] font-bold text-signal-text mb-2" style={{ letterSpacing: '-0.02em' }}>
                      {demo.title}
                    </h2>
                    <p className="text-[13px] text-signal-text-muted leading-relaxed">{demo.description}</p>
                  </div>
                </div>
                <div className="mt-5 pt-4 flex items-center justify-between"
                     style={{ borderTop: '1px solid #EAE3D6' }}>
                  <span className="text-[12px] text-signal-ash">Ver análisis completo</span>
                  <svg className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1"
                       style={{ color: '#A7A196' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="mt-8 rounded-2xl p-5"
             style={{ backgroundColor: '#EEF1EA', border: '1px solid rgba(95,111,82,0.2)' }}>
          <p className="text-[12px] text-signal-text-muted">
            <span className="font-semibold" style={{ color: '#5F6F52' }}>Nota:</span>{' '}
            Los casos de demostración usan datos agregados reales del marketplace. Esta información es inteligencia agregada de mercado. No constituye recomendación crediticia ni evaluación individual del solicitante.
          </p>
        </div>
      </div>
    </div>
  )
}
