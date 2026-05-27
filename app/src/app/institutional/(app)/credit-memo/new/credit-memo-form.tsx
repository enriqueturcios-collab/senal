'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface FormValues {
  q: string
  department: string
  municipality: string
  amount: string
  payment: string
  margin: string
  dscr: string
  term: string
  loanType: string
}

export function CreditMemoForm({ initial }: { initial: Partial<FormValues> }) {
  const router = useRouter()
  const [form, setForm] = useState<FormValues>({
    q: initial.q ?? '',
    department: initial.department ?? 'Guatemala',
    municipality: initial.municipality ?? '',
    amount: initial.amount ?? '',
    payment: initial.payment ?? '',
    margin: initial.margin ?? '0.45',
    dscr: initial.dscr ?? '1.20',
    term: initial.term ?? '24',
    loanType: initial.loanType ?? 'capital-de-trabajo',
  })

  function set(k: keyof FormValues) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(v => ({ ...v, [k]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    Object.entries(form).forEach(([k, v]) => { if (v) params.set(k, v) })
    router.push(`/institutional/credit-memo/new?${params}`)
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #DED6C8',
    backgroundColor: '#FFFDF8',
    color: '#2E2A24',
    fontSize: '14px',
    outline: 'none',
  }
  const labelStyle = { fontSize: '11px', fontWeight: 600 as const, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#7A7468', marginBottom: '6px', display: 'block' as const }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-6 space-y-5"
          style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', boxShadow: '0 2px 8px rgba(46,42,36,0.04)' }}>

      <div>
        <label style={labelStyle}>Propósito del crédito *</label>
        <textarea
          required
          rows={3}
          value={form.q}
          onChange={set('q')}
          placeholder="Ej: Apertura de heladería artesanal en Mixco, capital de trabajo para inventario inicial..."
          style={{ ...inputStyle, resize: 'vertical' as const }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Departamento</label>
          <input value={form.department} onChange={set('department')} placeholder="Guatemala" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Municipio</label>
          <input value={form.municipality} onChange={set('municipality')} placeholder="Mixco" style={inputStyle} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Monto del crédito (Q)</label>
          <input type="number" value={form.amount} onChange={set('amount')} placeholder="75000" min="0" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Cuota mensual estimada (Q)</label>
          <input type="number" value={form.payment} onChange={set('payment')} placeholder="3800" min="0" style={inputStyle} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label style={labelStyle}>Margen bruto</label>
          <input type="number" value={form.margin} onChange={set('margin')} placeholder="0.45" step="0.01" min="0.01" max="0.99" style={inputStyle} />
          <p className="text-[11px] mt-1" style={{ color: '#A7A196' }}>Ej: 0.45 = 45%</p>
        </div>
        <div>
          <label style={labelStyle}>DSCR objetivo</label>
          <input type="number" value={form.dscr} onChange={set('dscr')} placeholder="1.20" step="0.05" min="1.00" max="3.00" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Plazo (meses)</label>
          <input type="number" value={form.term} onChange={set('term')} placeholder="24" min="1" max="120" style={inputStyle} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Tipo de crédito</label>
        <select value={form.loanType} onChange={set('loanType')} style={inputStyle}>
          <option value="capital-de-trabajo">Capital de trabajo</option>
          <option value="inventario">Inventario</option>
          <option value="equipamiento">Equipamiento</option>
          <option value="expansion">Expansión</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      <button type="submit"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', backgroundColor: '#5F6F52', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: 'none' }}>
        Generar Credit Memo
      </button>
    </form>
  )
}
