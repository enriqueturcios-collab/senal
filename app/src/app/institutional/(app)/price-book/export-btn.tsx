'use client'

interface Row {
  category: string
  zone: string | null
  municipality: string | null
  sample_size: number
  price_p10: number | null
  price_p25: number | null
  price_p50: number | null
  price_p75: number | null
  price_p90: number | null
  price_avg: number | null
  close_rate: number | null
}

export function PriceBookExportButton({ rows }: { rows: Row[] }) {
  function handleExport() {
    const headers = ['Categoria', 'Zona', 'Municipio', 'N', 'P10', 'P25', 'P50_Mediana', 'P75', 'P90', 'Promedio', 'Tasa_Cierre']
    const lines = rows.map(r => [
      `"${r.category}"`,
      `"${r.zone ?? ''}"`,
      `"${r.municipality ?? ''}"`,
      r.sample_size,
      r.price_p10 != null ? Math.round(r.price_p10) : '',
      r.price_p25 != null ? Math.round(r.price_p25) : '',
      r.price_p50 != null ? Math.round(r.price_p50) : '',
      r.price_p75 != null ? Math.round(r.price_p75) : '',
      r.price_p90 != null ? Math.round(r.price_p90) : '',
      r.price_avg != null ? Math.round(r.price_avg) : '',
      r.close_rate != null ? (r.close_rate * 100).toFixed(1) + '%' : '',
    ].join(','))

    const csv = [headers.join(','), ...lines].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `signal-price-book-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="px-4 py-2 rounded-xl text-[13px] font-semibold flex items-center gap-2"
      style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', color: '#5F6F52', cursor: 'pointer' }}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Exportar CSV
    </button>
  )
}
