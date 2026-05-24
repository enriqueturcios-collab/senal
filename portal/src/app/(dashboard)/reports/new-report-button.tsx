'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const REPORT_TYPES = [
  { value: 'weekly_demand',    label: 'Demanda semanal' },
  { value: 'monthly_sector',   label: 'Sector mensual' },
  { value: 'zone_report',      label: 'Por zona' },
  { value: 'unmet_demand',     label: 'Demanda insatisfecha' },
  { value: 'price_analysis',   label: 'Análisis de precios' },
  { value: 'opportunity',      label: 'Oportunidades' },
  { value: 'trend_analysis',   label: 'Tendencias' },
]

export function NewReportButton() {
  const router = useRouter()
  const [open,    setOpen   ] = useState(false)
  const [loading, setLoading] = useState(false)
  const [type,    setType   ] = useState('monthly_sector')
  const [format,  setFormat ] = useState('pdf')

  async function submit() {
    setLoading(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_type: type, file_format: format }),
      })
      if (res.ok) {
        setOpen(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
        </svg>
        Nuevo reporte
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="font-semibold text-slate-800 text-lg mb-4">Solicitar reporte</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de reporte</label>
                <select value={type} onChange={e => setType(e.target.value)} className="select">
                  {REPORT_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Formato</label>
                <select value={format} onChange={e => setFormat(e.target.value)} className="select">
                  <option value="pdf">PDF</option>
                  <option value="xlsx">Excel (XLSX)</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={submit} disabled={loading} className="btn-primary flex-1 justify-center">
                {loading ? 'Solicitando…' : 'Solicitar'}
              </button>
              <button onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
