'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { periodLabel } from '@/lib/utils'

interface TrendRow {
  period_value: string
  category: string
  demand_count: number | null
}

interface Props {
  data: TrendRow[]
  height?: number
}

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4']

export function DemandTrendChart({ data, height = 280 }: Props) {
  // Pivotar: [{period_value, Cat1, Cat2, ...}]
  const periods = [...new Set(data.map(d => d.period_value))].sort()
  const categories = [...new Set(data.map(d => d.category))]

  const pivoted = periods.map(pv => {
    const row: Record<string, string | number | null> = { period: periodLabel(pv) }
    for (const cat of categories) {
      const found = data.find(d => d.period_value === pv && d.category === cat)
      row[cat] = found?.demand_count ?? null
    }
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={pivoted} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false} tickLine={false}
          width={35}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          formatter={(value: number) => [value?.toLocaleString('es-GT'), '']}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        {categories.slice(0, 6).map((cat, i) => (
          <Line
            key={cat}
            type="monotone"
            dataKey={cat}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
