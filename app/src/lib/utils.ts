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
  low:       'bg-stone-100 text-stone-500',
  medium:    'bg-sky-50    text-sky-700',
  high:      'bg-amber-50  text-amber-700',
  immediate: 'bg-orange-50 text-orange-700',
}

export const STATUS_LABELS: Record<string, string> = {
  open:        'Abierta',
  in_progress: 'En proceso',
  closed:      'Cerrada',
  expired:     'Expirada',
  cancelled:   'Cancelada',
}

export const STATUS_COLORS: Record<string, string> = {
  open:        'bg-green-50  text-green-700',
  in_progress: 'bg-sky-50    text-sky-700',
  closed:      'bg-stone-100 text-stone-500',
  expired:     'bg-stone-100 text-stone-400',
  cancelled:   'bg-red-50    text-red-600',
}

export const OFFER_STATUS_LABELS: Record<string, string> = {
  sent:     'Enviada',
  viewed:   'Vista',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
}

export const OFFER_STATUS_COLORS: Record<string, string> = {
  sent:     'bg-sky-50    text-sky-600',
  viewed:   'bg-amber-50  text-amber-600',
  accepted: 'bg-green-50  text-green-700',
  rejected: 'bg-red-50    text-red-600',
}
