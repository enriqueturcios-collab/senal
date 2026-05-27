'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Category    { id: number; name: string }
interface Municipality { id: number; name: string }

const BUSINESS_TYPES = [
  { value: 'product',      label: 'Tienda / productos físicos',       icon: '📦' },
  { value: 'freelance',    label: 'Freelancer / servicio profesional', icon: '💻' },
  { value: 'technical',    label: 'Taller / servicio técnico',         icon: '🔧' },
  { value: 'food',         label: 'Alimentación / catering',           icon: '🍽️' },
  { value: 'construction', label: 'Construcción / remodelación',       icon: '🏗️' },
  { value: 'education',    label: 'Educación / capacitación',          icon: '🎓' },
  { value: 'events',       label: 'Eventos / entretenimiento',         icon: '🎉' },
  { value: 'other',        label: 'Otro giro',                         icon: '💼' },
]

const PRICE_RANGES = [
  { value: 'micro',  label: 'Menos de Q500',      sub: 'Servicios rápidos, productos pequeños' },
  { value: 'small',  label: 'Q500 – Q5,000',       sub: 'Trabajos de un día, productos medianos' },
  { value: 'medium', label: 'Q5,000 – Q25,000',    sub: 'Proyectos, equipos, pedidos grandes' },
  { value: 'large',  label: 'Más de Q25,000',       sub: 'Obras, contratos, distribución' },
]

const TOTAL_STEPS = 5

export function OnboardingWizard({
  defaultBusinessName,
  categories,
  municipalities,
}: {
  defaultBusinessName: string
  categories: Category[]
  municipalities: Municipality[]
}) {
  const router = useRouter()
  const [step, setStep]               = useState(1)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // Form state
  const [businessName, setBusinessName] = useState(defaultBusinessName)
  const [businessType, setBusinessType] = useState('')
  const [selectedCats, setSelectedCats] = useState<number[]>([])
  const [selectedMunis, setSelectedMunis] = useState<number[]>([])
  const [description, setDescription]  = useState('')

  function toggleCat(id: number) {
    setSelectedCats(cs => cs.includes(id) ? cs.filter(c => c !== id) : [...cs, id])
  }
  function toggleMuni(id: number) {
    setSelectedMunis(ms => ms.includes(id) ? ms.filter(m => m !== id) : [...ms, id])
  }

  async function finish() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/entrepreneur/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name:   businessName.trim(),
          business_type:   businessType,
          category_ids:    selectedCats,
          municipality_ids: selectedMunis,
          description:     description.trim() || null,
        }),
      })
      if (!res.ok) { setError('Error al guardar. Intentá de nuevo.'); return }
      router.push('/entrepreneur/dashboard')
      router.refresh()
    } catch {
      setError('Error de red')
    } finally {
      setSaving(false)
    }
  }

  const canNext = [
    businessName.trim().length > 0,           // step 1
    businessType !== '',                        // step 2
    selectedCats.length > 0,                   // step 3
    selectedMunis.length > 0,                  // step 4
    true,                                       // step 5 (description optional)
  ][step - 1]

  const inputStyle = { backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-signal-text-muted">
            Paso {step} de {TOTAL_STEPS}
          </p>
          <p className="text-[11px] text-signal-ash">
            {Math.round((step / TOTAL_STEPS) * 100)}%
          </p>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#DED6C8' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%`, backgroundColor: '#5F6F52' }}
          />
        </div>
      </div>

      {/* ── Step 1: Nombre del negocio ── */}
      {step === 1 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#A7A196' }}>
            Paso 1
          </p>
          <h2 className="text-[22px] font-bold text-signal-text mb-1" style={{ letterSpacing: '-0.02em' }}>
            ¿Cómo se llama tu negocio?
          </h2>
          <p className="text-[13px] text-signal-text-muted mb-6">
            Así te van a ver los compradores en el marketplace.
          </p>
          <input
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            placeholder="ej. Carpintería Los Pinos, Diseños Lucía…"
            className="w-full rounded-xl px-4 py-3.5 text-[15px] text-signal-text outline-none
                       focus:ring-2 focus:ring-[#5F6F52]/30"
            style={inputStyle}
            autoFocus
          />
        </div>
      )}

      {/* ── Step 2: Giro de negocio ── */}
      {step === 2 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#A7A196' }}>
            Paso 2
          </p>
          <h2 className="text-[22px] font-bold text-signal-text mb-1" style={{ letterSpacing: '-0.02em' }}>
            ¿Cuál es tu giro de negocio?
          </h2>
          <p className="text-[13px] text-signal-text-muted mb-6">
            Esto ayuda al algoritmo a entender qué tipo de demandas te competen.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {BUSINESS_TYPES.map(bt => (
              <button
                key={bt.value}
                onClick={() => setBusinessType(bt.value)}
                className="flex flex-col items-start p-4 rounded-2xl text-left transition-all"
                style={{
                  backgroundColor: businessType === bt.value ? '#EEF1EA' : '#FFFDF8',
                  border: businessType === bt.value
                    ? '1.5px solid rgba(95,111,82,0.4)'
                    : '1px solid #DED6C8',
                  boxShadow: businessType === bt.value ? '0 0 0 3px rgba(95,111,82,0.08)' : 'none',
                }}
              >
                <span className="text-[20px] mb-1.5">{bt.icon}</span>
                <span className="text-[12px] font-semibold leading-snug"
                      style={{ color: businessType === bt.value ? '#5F6F52' : '#4D4A43' }}>
                  {bt.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 3: Categorías ── */}
      {step === 3 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#A7A196' }}>
            Paso 3
          </p>
          <h2 className="text-[22px] font-bold text-signal-text mb-1" style={{ letterSpacing: '-0.02em' }}>
            ¿Qué ofrecés?
          </h2>
          <p className="text-[13px] text-signal-text-muted mb-6">
            Seleccioná todas las categorías donde podés atender demandas.
            Cuantas más, mejor calibrado el algoritmo.
          </p>
          <div className="flex flex-wrap gap-2 max-h-80 overflow-y-auto pr-1">
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => toggleCat(c.id)}
                className="text-[12px] font-medium px-3 py-1.5 rounded-full transition-all"
                style={{
                  backgroundColor: selectedCats.includes(c.id) ? '#EEF1EA' : '#F1ECE2',
                  border: selectedCats.includes(c.id)
                    ? '1.5px solid rgba(95,111,82,0.4)'
                    : '1px solid #DED6C8',
                  color: selectedCats.includes(c.id) ? '#5F6F52' : '#7A7468',
                }}
              >
                {selectedCats.includes(c.id) && <span className="mr-1 text-[10px]">✓</span>}
                {c.name}
              </button>
            ))}
          </div>
          {selectedCats.length > 0 && (
            <p className="text-[11px] mt-3 font-semibold" style={{ color: '#5F6F52' }}>
              {selectedCats.length} categoría{selectedCats.length !== 1 ? 's' : ''} seleccionada{selectedCats.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* ── Step 4: Zonas de cobertura ── */}
      {step === 4 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#A7A196' }}>
            Paso 4
          </p>
          <h2 className="text-[22px] font-bold text-signal-text mb-1" style={{ letterSpacing: '-0.02em' }}>
            ¿Dónde podés atender?
          </h2>
          <p className="text-[13px] text-signal-text-muted mb-6">
            Seleccioná los municipios donde podés entregar o prestar tu servicio.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {municipalities.map(m => (
              <button
                key={m.id}
                onClick={() => toggleMuni(m.id)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-left transition-all"
                style={{
                  backgroundColor: selectedMunis.includes(m.id) ? '#EEF1EA' : '#FFFDF8',
                  border: selectedMunis.includes(m.id)
                    ? '1.5px solid rgba(95,111,82,0.4)'
                    : '1px solid #DED6C8',
                }}
              >
                <span className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0"
                      style={{
                        borderColor: selectedMunis.includes(m.id) ? '#5F6F52' : '#DED6C8',
                        backgroundColor: selectedMunis.includes(m.id) ? '#5F6F52' : 'transparent',
                      }}>
                  {selectedMunis.includes(m.id) && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="text-[12px] font-medium"
                      style={{ color: selectedMunis.includes(m.id) ? '#5F6F52' : '#4D4A43' }}>
                  {m.name}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setSelectedMunis(municipalities.map(m => m.id))}
            className="mt-3 text-[11px] font-semibold underline"
            style={{ color: '#A7A196' }}>
            Seleccionar todo el país
          </button>
        </div>
      )}

      {/* ── Step 5: Descripción ── */}
      {step === 5 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#A7A196' }}>
            Paso 5
          </p>
          <h2 className="text-[22px] font-bold text-signal-text mb-1" style={{ letterSpacing: '-0.02em' }}>
            Contanos de tu negocio
          </h2>
          <p className="text-[13px] text-signal-text-muted mb-6">
            Una descripción breve ayuda al algoritmo y aparece en tu perfil público. Opcional pero recomendado.
          </p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={5}
            placeholder={`ej. Somos un taller de carpintería con 10 años de experiencia en muebles a medida. Trabajamos con madera de pino y teca para hogares y oficinas en Guatemala City...`}
            className="w-full rounded-xl px-4 py-3.5 text-[13px] text-signal-text leading-relaxed
                       resize-none outline-none focus:ring-2 focus:ring-[#5F6F52]/30"
            style={inputStyle}
            autoFocus
          />
          <p className="text-[11px] text-signal-ash mt-1.5">{description.length} / 500 caracteres</p>

          {/* Summary */}
          <div className="rounded-2xl p-4 mt-5"
               style={{ backgroundColor: '#EEF1EA', border: '1px solid rgba(95,111,82,0.2)' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-2.5" style={{ color: '#5F6F52' }}>
              Tu perfil quedará así
            </p>
            <p className="text-[14px] font-bold text-signal-text">{businessName}</p>
            <p className="text-[11px] text-signal-text-muted mt-0.5">
              {BUSINESS_TYPES.find(b => b.value === businessType)?.label}
              {' · '}{selectedCats.length} categoría{selectedCats.length !== 1 ? 's' : ''}
              {' · '}{selectedMunis.length} municipio{selectedMunis.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-4 text-[12px] font-semibold rounded-xl px-4 py-3"
           style={{ backgroundColor: '#FDF3EE', border: '1px solid #F0D9CE', color: '#B8795B' }}>
          {error}
        </p>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex-1 py-3.5 rounded-xl text-[13px] font-semibold transition-colors"
            style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8', color: '#4D4A43' }}>
            ← Atrás
          </button>
        )}
        {step < TOTAL_STEPS ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext}
            className="flex-1 py-3.5 rounded-xl text-[13px] font-bold text-white
                       hover:opacity-90 transition-opacity disabled:opacity-40"
            style={{ backgroundColor: '#5F6F52' }}>
            Continuar →
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={saving}
            className="flex-1 py-3.5 rounded-xl text-[13px] font-bold text-white
                       hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#5F6F52' }}>
            {saving ? 'Guardando…' : 'Entrar al dashboard →'}
          </button>
        )}
      </div>

      {step === 5 && (
        <button
          onClick={finish}
          disabled={saving}
          className="w-full mt-2 py-2 text-[12px] text-signal-text-muted hover:text-signal-text transition-colors">
          Completar después
        </button>
      )}
    </div>
  )
}
