'use client'

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#d97706', '#16a34a',
  '#0891b2', '#ea580c', '#9333ea', '#65a30d', '#e11d48',
]

interface SecopChartProps {
  chartType: 'bar' | 'line' | 'pie'
  title: string
  data: Record<string, any>[]
  xKey: string
  yKey: string
  color?: string
  yLabel?: string
}

function formatAxisValue(value: any) {
  const n = Number(value)
  if (isNaN(n)) return String(value)
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString('es-CO')
}

function formatTooltipValue(value: any) {
  const n = Number(value)
  if (isNaN(n)) return String(value)
  return n.toLocaleString('es-CO')
}

export function SecopChart({ chartType, title, data, xKey, yKey, color = '#2563eb', yLabel }: SecopChartProps) {
  // Normalize numeric values
  const normalized = data.map((row) => ({
    ...row,
    [yKey]: Number(row[yKey]) || 0,
  }))

  const renderChart = () => {
    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={normalized} margin={{ top: 8, right: 16, left: 16, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 11 }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis tickFormatter={formatAxisValue} tick={{ fontSize: 11 }} label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fontSize: 11 } : undefined} />
            <Tooltip formatter={(v) => formatTooltipValue(v)} />
            <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={normalized} margin={{ top: 8, right: 16, left: 16, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tickFormatter={formatAxisValue} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => formatTooltipValue(v)} />
            <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )
    }

    // Pie
    return (
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={normalized}
            dataKey={yKey}
            nameKey={xKey}
            cx="50%"
            cy="50%"
            outerRadius={120}
            label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(1)}%)`}
            labelLine
          >
            {normalized.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatTooltipValue(v)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>{renderChart()}</CardContent>
    </Card>
  )
}
