import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null) return '—'
  return n.toLocaleString('es-GT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function fmtCurrency(n: number | null | undefined, currency = 'GTQ'): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

export function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n == null) return '—'
  return `${(n * 100).toFixed(decimals)}%`
}

export function fmtScore(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toFixed(1)
}

export function fmtGrowth(n: number | null | undefined): string {
  if (n == null) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

export function scoreColor(score: number | null): string {
  if (score == null) return 'text-slate-400'
  if (score >= 70) return 'text-emerald-600'
  if (score >= 45) return 'text-amber-600'
  if (score >= 20) return 'text-orange-500'
  return 'text-red-500'
}

export function scoreBg(score: number | null): string {
  if (score == null) return 'bg-slate-100 text-slate-500'
  if (score >= 70) return 'bg-emerald-50 text-emerald-700'
  if (score >= 45) return 'bg-amber-50 text-amber-700'
  if (score >= 20) return 'bg-orange-50 text-orange-700'
  return 'bg-red-50 text-red-700'
}

export function confidenceBadge(c: string | null): string {
  if (c === 'high')   return 'bg-emerald-100 text-emerald-700'
  if (c === 'medium') return 'bg-amber-100 text-amber-700'
  return 'bg-slate-100 text-slate-500'
}

export function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7)
}

export function prevPeriod(months = 1): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 7)
}

export function periodLabel(pv: string): string {
  if (!pv) return ''
  if (pv.includes('-W')) {
    const [year, week] = pv.split('-W')
    return `Sem. ${week}, ${year}`
  }
  if (pv.includes('-Q')) {
    const [year, q] = pv.split('-Q')
    return `Q${q} ${year}`
  }
  const [year, month] = pv.split('-')
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${months[parseInt(month) - 1]} ${year}`
}
