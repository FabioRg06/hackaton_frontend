'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'

interface EntityRiskChartProps {
  data: { name: string; count: number; avgRisk: number; flags: number }[]
}

function getRiskColor(avgRisk: number): string {
  if (avgRisk < 25) return '#22c55e'
  if (avgRisk < 50) return '#eab308'
  if (avgRisk < 75) return '#f97316'
  return '#ef4444'
}

export function EntityRiskChart({ data }: EntityRiskChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      shortName: item.name.length > 25 ? item.name.slice(0, 25) + '...' : item.name,
      color: getRiskColor(item.avgRisk),
    }))
  }, [data])

  if (chartData.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-muted-foreground">
        Sin datos de entidades
      </div>
    )
  }

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: 'currentColor' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            tick={{ fontSize: 10, fill: 'currentColor' }}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-lg">
                    <p className="text-sm font-medium">{data.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Score promedio: {data.avgRisk.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {data.count} contratos, {data.flags} alertas
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="avgRisk" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
