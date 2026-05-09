'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Cell } from 'recharts'
import type { ContractWithRisk } from '@/lib/types'

interface ModalidadChartProps {
  data: Record<string, ContractWithRisk[]>
}

const COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444']

export function ModalidadChart({ data }: ModalidadChartProps) {
  const chartData = useMemo(() => {
    return Object.entries(data)
      .map(([modalidad, contracts]) => {
        const avgRisk = contracts.reduce((sum, c) => sum + c.riskAnalysis.score, 0) / contracts.length
        const highRisk = contracts.filter(
          (c) => c.riskAnalysis.level === 'alto' || c.riskAnalysis.level === 'critico'
        ).length

        return {
          name: modalidad.length > 30 ? modalidad.slice(0, 30) + '...' : modalidad,
          fullName: modalidad,
          total: contracts.length,
          highRisk,
          avgRisk,
        }
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [data])

  if (chartData.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-muted-foreground">
        Sin datos de modalidades
      </div>
    )
  }

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 0, bottom: 50 }}
        >
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: 'currentColor' }}
            axisLine={false}
            tickLine={false}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'currentColor' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-lg">
                    <p className="text-sm font-medium">{data.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      Total: {data.total} contratos
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Alto riesgo: {data.highRisk}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Score promedio: {data.avgRisk.toFixed(1)}
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Total">
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
