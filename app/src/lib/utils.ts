import { clsx, type ClassValue } from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export const cn = (...inputs: ClassValue[]) => clsx(inputs)

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

export function fmtCurrency(n: number | null, currency = 'GTQ') {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

export const URGENCY_LABELS: Record<string, string> = {
  low:       'Sin prisa',
  medium:    'Esta semana',
  high:      'Urgente',
  immediate: 'Inmediato',
}

export const URGENCY_COLORS: Record<string, string> = {
  low:       'bg-slate-100 text-slate-600',
  medium:    'bg-blue-100  text-blue-700',
  high:      'bg-amber-100 text-amber-700',
  immediate: 'bg-red-100   text-red-700',
}

export const STATUS_LABELS: Record<string, string> = {
  open:        'Abierta',
  in_progress: 'En proceso',
  closed:      'Cerrada',
  expired:     'Expirada',
  cancelled:   'Cancelada',
}

export const STATUS_COLORS: Record<string, string> = {
  open:        'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-blue-100   text-blue-700',
  closed:      'bg-slate-100  text-slate-500',
  expired:     'bg-slate-100  text-slate-400',
  cancelled:   'bg-red-100    text-red-600',
}

export const OFFER_STATUS_LABELS: Record<string, string> = {
  sent:     'Enviada',
  viewed:   'Vista',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
}

export const OFFER_STATUS_COLORS: Record<string, string> = {
  sent:     'bg-blue-50  text-blue-600',
  viewed:   'bg-amber-50 text-amber-600',
  accepted: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50   text-red-600',
}
