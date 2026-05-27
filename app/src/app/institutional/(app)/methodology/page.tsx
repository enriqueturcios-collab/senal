import { getInstitutionalSession } from '@/lib/institutional-auth'
import { InstitutionalDisclaimer } from '@/components/institutional/metric-card'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl p-6"
             style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', boxShadow: '0 2px 8px rgba(46,42,36,0.04)' }}>
      <h2 className="text-[18px] font-bold text-signal-text mb-4" style={{ letterSpacing: '-0.02em' }}>{title}</h2>
      {children}
    </section>
  )
}

function Formula({ label, formula }: { label: string; formula: string }) {
  return (
    <div className="my-3 p-4 rounded-xl" style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#A7A196' }}>{label}</p>
      <p className="text-[13px] font-mono" style={{ color: '#2E2A24' }}>{formula}</p>
    </div>
  )
}

function ScoreRow({ label, desc, weight }: { label: string; desc: string; weight: string }) {
  return (
    <div className="flex items-start gap-4 py-3" style={{ borderBottom: '1px solid #F1ECE2' }}>
      <div className="w-16 shrink-0">
        <span className="text-[12px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#EEF1EA', color: '#5F6F52' }}>
          {weight}
        </span>
      </div>
      <div>
        <p className="text-[13px] font-semibold text-signal-text">{label}</p>
        <p className="text-[12px] mt-0.5" style={{ color: '#7A7468' }}>{desc}</p>
      </div>
    </div>
  )
}

export default async function MethodologyPage() {
  const session = await getInstitutionalSession()
  if (!session) return null

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F3EA' }}>
      <div className="max-w-3xl mx-auto px-6 py-8 pb-16">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#A7A196' }}>
            Demand Intelligence
          </p>
          <h1 className="text-[28px] font-bold text-signal-text mb-2" style={{ letterSpacing: '-0.025em' }}>
            Metodología
          </h1>
          <p className="text-[14px] text-signal-text-muted">
            Cómo Signal calcula sus índices, qué significa cada métrica y cuáles son sus limitaciones.
          </p>
        </div>

        <div className="space-y-6">

          {/* What is a demand signal */}
          <Section title="¿Qué es una señal de demanda?">
            <p className="text-[14px] leading-relaxed mb-3" style={{ color: '#4D4A43' }}>
              Una señal de demanda es una publicación verificada en el marketplace de Signal donde un comprador
              expresa una necesidad específica con presupuesto, ubicación y nivel de urgencia. No es una encuesta
              ni una proyección; es evidencia directa y observada de intención de compra.
            </p>
            <p className="text-[14px] leading-relaxed" style={{ color: '#4D4A43' }}>
              Cada señal captura: categoría de producto/servicio, rango presupuestario, zona geográfica,
              urgencia (baja/media/alta/inmediata) y número de ofertas recibidas. El conjunto de señales
              forma el corpus de inteligencia de demanda de Signal.
            </p>
          </Section>

          {/* Market Opportunity Score */}
          <Section title="Market Opportunity Score (MOS)">
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: '#4D4A43' }}>
              El MOS es un índice de 0 a 100 que resume el atractivo de un mercado para nuevos entrantes.
              Combina tres factores:
            </p>
            <div>
              <ScoreRow label="Tasa de demanda insatisfecha" desc="Proporción de señales sin oferta. Indica gap de mercado." weight="40%" />
              <ScoreRow label="Volumen de señales" desc="Número total de señales observadas. Indica tamaño de mercado." weight="30%" />
              <ScoreRow label="Tasa de cierre" desc="Proporción de demandas que resultan en transacción. Indica mercado activo." weight="30%" />
            </div>
            <Formula
              label="Fórmula"
              formula="MOS = min(unmet_rate×40 + min(signals/5, 30) + close_signal, 100)"
            />
            <p className="text-[12px] mt-3" style={{ color: '#A7A196' }}>
              MOS ≥60: Alta oportunidad | 30–59: Moderada | &lt;30: Baja
            </p>
          </Section>

          {/* Demand Coverage Ratio */}
          <Section title="Demand Coverage Ratio (DCR)">
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: '#4D4A43' }}>
              El DCR mide si la demanda de mercado observada es suficiente para cubrir las necesidades de flujo
              de caja de un solicitante de crédito. Un DCR ≥1 indica que hay suficiente demanda; ≥2 es fuerte.
            </p>
            <Formula
              label="Ingresos brutos requeridos/mes"
              formula="Rev_req = (Cuota_mensual × DSCR) / Margen_bruto"
            />
            <Formula
              label="Transacciones requeridas/mes"
              formula="Tx_req = Rev_req / Ticket_mediano_observado"
            />
            <Formula
              label="Demand Coverage Ratio"
              formula="DCR = Señales_observadas_mes / Tx_requeridas"
            />
            <div className="mt-4 space-y-2">
              {[
                { range: 'DCR ≥ 2.0', label: 'Cobertura fuerte', color: '#5F6F52', desc: 'Hay más del doble de demanda de la necesaria. Bajo riesgo de flujo de caja.' },
                { range: 'DCR 1.0–1.9', label: 'Cobertura moderada', color: '#B8946F', desc: 'Suficiente demanda pero el solicitante debe capturar una porción significativa.' },
                { range: 'DCR < 1.0', label: 'Cobertura débil', color: '#B8795B', desc: 'La demanda observada no cubre las transacciones requeridas. Alto riesgo.' },
              ].map(item => (
                <div key={item.range} className="flex gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                  <span className="text-[12px] font-bold shrink-0 w-24" style={{ color: item.color }}>{item.range}</span>
                  <div>
                    <span className="text-[12px] font-semibold" style={{ color: item.color }}>{item.label}:</span>
                    <span className="text-[12px] ml-1" style={{ color: '#7A7468' }}>{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Liquidity Score */}
          <Section title="Índice de Liquidez de Mercado">
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: '#4D4A43' }}>
              Mide qué tan fácil es cerrar transacciones en un mercado dado. Un mercado líquido es
              aquel donde la oferta y demanda se encuentran con rapidez y a precios estables.
            </p>
            <div>
              <ScoreRow label="Tasa de respuesta a ofertas" desc="Proporción de demandas que reciben al menos una oferta." weight="25%" />
              <ScoreRow label="Tasa de cierre" desc="Proporción de demandas que resultan en transacción completada." weight="25%" />
              <ScoreRow label="Ofertas por demanda" desc="Promedio de ofertas por demanda. Más ofertas = mercado más competitivo." weight="20%" />
              <ScoreRow label="Velocidad de primera oferta" desc="Tiempo hasta la primera oferta. Más rápido = mercado más activo." weight="15%" />
              <ScoreRow label="Dispersión de precios (−)" desc="Alta dispersión indica mercado poco maduro o con asimetría de información." weight="−10%" />
              <ScoreRow label="Demanda insatisfecha (−)" desc="Alta tasa sin oferta reduce la liquidez." weight="−5%" />
            </div>
            <p className="text-[12px] mt-3" style={{ color: '#A7A196' }}>
              Score ≥70: Liquidez alta | 40–69: Moderada | &lt;40: Baja
            </p>
          </Section>

          {/* Saturation Index */}
          <Section title="Índice de Saturación">
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: '#4D4A43' }}>
              Mide qué tan competida está la oferta respecto a la demanda en un mercado y zona específicos.
              Alta saturación puede indicar mayor presión de precios y márgenes más delgados.
            </p>
            <Formula
              label="Fórmula simplificada"
              formula="Saturation = min((proveedores/demandas)×40 + ofertas_por_demanda×10, 100)"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { range: '0–30', q: 'Baja saturación', color: '#5F6F52' },
                { range: '31–60', q: 'Mercado balanceado', color: '#B8946F' },
                { range: '61–80', q: 'Alta saturación', color: '#B8795B' },
                { range: '81–100', q: 'Muy alta saturación', color: '#9B3A3A' },
              ].map(item => (
                <div key={item.range} className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                  <p className="text-[11px] font-bold" style={{ color: item.color }}>{item.range}</p>
                  <p className="text-[11px]" style={{ color: '#7A7468' }}>{item.q}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Confidence Score */}
          <Section title="Score de Confianza del Análisis">
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: '#4D4A43' }}>
              Evalúa qué tan confiables son los datos que respaldan el análisis. Factores:
            </p>
            <div>
              <ScoreRow label="Tamaño de muestra" desc="≥50 señales para confianza máxima. Menos datos → menos confianza." weight="30%" />
              <ScoreRow label="Frescura" desc="Datos de los últimos 180 días. Datos más recientes son más relevantes." weight="20%" />
              <ScoreRow label="Coincidencia de categoría" desc="Coincidencia directa vs. categorías relacionadas." weight="20%" />
              <ScoreRow label="Precisión geográfica" desc="Exacta > municipio > departamento > nacional." weight="15%" />
              <ScoreRow label="Transacciones verificadas" desc="Proporción de señales con transacción confirmada." weight="15%" />
            </div>
          </Section>

          {/* Limitations */}
          <Section title="Limitaciones importantes">
            <div className="space-y-3">
              {[
                'Los datos son del marketplace de Signal y no representan la totalidad del mercado guatemalteco.',
                'Las señales reflejan intención declarada de compra, no necesariamente capacidad de pago.',
                'La muestra puede tener sesgos geográficos hacia zonas con mayor adopción digital.',
                'Los precios observados son de ofertas, no siempre de transacciones cerradas.',
                'Mercados nuevos o de nicho pueden tener muestras insuficientes (confianza baja).',
                'Los índices no incorporan condiciones macroeconómicas, estacionalidad o eventos externos.',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                     style={{ backgroundColor: 'rgba(184,121,91,0.05)', border: '1px solid rgba(184,121,91,0.1)' }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: '#B8795B' }} />
                  <p className="text-[13px] leading-relaxed" style={{ color: '#4D4A43' }}>{item}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Privacy */}
          <Section title="Privacidad y datos">
            <p className="text-[13px] leading-relaxed mb-3" style={{ color: '#4D4A43' }}>
              Signal nunca expone información personal identificable (PII) en el portal institucional.
              Todos los datos son:
            </p>
            <ul className="space-y-2">
              {[
                'Agregados: nunca se expone información de un comprador o vendedor individual.',
                'Anonimizados: los IDs de usuario no son accesibles a través de la API institucional.',
                'Con umbral mínimo: categorías con menos de 3 señales no se reportan.',
                'Regulados por el contrato de licencia de datos B2B firmado por la institución.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: '#4D4A43' }}>
                  <span style={{ color: '#5F6F52', fontWeight: 700, marginTop: '2px' }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          <InstitutionalDisclaimer />
        </div>
      </div>
    </div>
  )
}
