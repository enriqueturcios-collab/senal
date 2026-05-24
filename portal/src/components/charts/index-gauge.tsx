'use client'
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'
import { cn, scoreColor } from '@/lib/utils'

interface Props {
  score: number | null
  label: string
  size?: number
}

export function IndexGauge({ score, label, size = 100 }: Props) {
  const value = score ?? 0
  const color =
    value >= 70 ? '#10b981' :
    value >= 45 ? '#f59e0b' :
    value >= 20 ? '#f97316' : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: size, height: size }} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%" cy="50%"
            innerRadius="65%" outerRadius="90%"
            startAngle={210} endAngle={-30}
            data={[{ value, fill: color }]}
          >
            <RadialBar dataKey="value" background={{ fill: '#f1f5f9' }} cornerRadius={4} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold', size >= 100 ? 'text-xl' : 'text-sm', scoreColor(score))}>
            {score != null ? score.toFixed(0) : '—'}
          </span>
        </div>
      </div>
      <span className="text-xs text-slate-500 text-center leading-tight">{label}</span>
    </div>
  )
}
