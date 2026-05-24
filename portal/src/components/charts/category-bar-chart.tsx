'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

interface Row {
  category: string
  demand_count: number
  transaction_rate: number | null
}

interface Props {
  data: Row[]
  height?: number
}

export function CategoryBarChart({ data, height = 260 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="category"
          width={130}
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false} tickLine={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          formatter={(value: number) => [value.toLocaleString('es-GT'), 'Demandas']}
        />
        <Bar dataKey="demand_count" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={`hsl(${220 - i * 12}, 70%, ${55 + i * 3}%)`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
