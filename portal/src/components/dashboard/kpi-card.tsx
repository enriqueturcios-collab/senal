import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string
  change?: string | null
  changePositive?: boolean
  sub?: string
  accent?: 'blue' | 'green' | 'amber' | 'red'
  icon?: React.ReactNode
}

export function KpiCard({ label, value, change, changePositive, sub, accent = 'blue', icon }: KpiCardProps) {
  const accentClass = {
    blue:  'bg-brand-50  text-brand-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50  text-amber-600',
    red:   'bg-red-50    text-red-600',
  }[accent]

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon && (
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', accentClass)}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold text-slate-900 leading-none">{value}</span>
        {change && (
          <span className={cn(
            'text-sm font-medium mb-0.5',
            changePositive ? 'text-emerald-600' : 'text-red-500'
          )}>
            {changePositive ? '▲' : '▼'} {change}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}
