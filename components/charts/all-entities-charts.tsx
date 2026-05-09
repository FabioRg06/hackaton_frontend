'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  ZAxis,
  LabelList,
} from 'recharts'
import { Building2, DollarSign, BarChart3, MapPin } from 'lucide-react'
import type { EntitySummary } from '@/hooks/use-contracts'

// ─── helpers ────────────────────────────────────────────────────────────────

function shortName(name: string, max = 28): string {
  return name.length <= max ? name : name.slice(0, max - 1) + '…'
}

function fmtCOP(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}B`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}MM`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  return `$${v.toLocaleString('es-CO')}`
}

function fmtFullCOP(v: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

// Gradient palette — one distinct hue per bar (cycles)
const BAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c084fc',
  '#818cf8', '#60a5fa', '#34d399', '#fbbf24',
  '#f87171', '#fb923c',
]

// ─── sub-components ─────────────────────────────────────────────────────────

interface ChartCardProps {
  title: string
  subtitle?: string
  icon: React.ReactNode
  children: React.ReactNode
  delay?: number
  className?: string
}

function ChartCard({ title, subtitle, icon, children, delay = 0, className = '' }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`relative overflow-hidden rounded-2xl border bg-card shadow-sm ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{title}</p>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </motion.div>
  )
}

// Custom tooltip
function CustomBarTooltip({
  active,
  payload,
  valueLabel,
  valueFormatter,
}: {
  active?: boolean
  payload?: { payload: { fullName: string; value: number } }[]
  valueLabel: string
  valueFormatter: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="max-w-[220px] rounded-xl border bg-card/95 p-3 shadow-xl backdrop-blur-sm">
      <p className="mb-1 text-xs font-semibold leading-snug text-foreground">{d.fullName}</p>
      <p className="text-xs text-muted-foreground">
        {valueLabel}:{' '}
        <span className="font-semibold text-foreground">{valueFormatter(d.value)}</span>
      </p>
    </div>
  )
}

function CustomPieTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean
  payload?: { name: string; value: number; payload: { fill: string } }[]
  total: number
}) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="rounded-xl border bg-card/95 p-3 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: d.payload.fill }} />
        <p className="text-xs font-semibold">{d.name}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        {d.value.toLocaleString('es-CO')} contratos
        <span className="ml-1 text-foreground font-medium">({((d.value / total) * 100).toFixed(1)}%)</span>
      </p>
    </div>
  )
}

// ─── Top bar charts (horizontal) ────────────────────────────────────────────

function TopByContracts({ entities }: { entities: EntitySummary[] }) {
  const data = useMemo(() =>
    entities
      .slice(0, 10)
      .map((e, i) => ({
        name: shortName(e.name, 24),
        fullName: e.name,
        value: e.count,
        color: BAR_COLORS[i % BAR_COLORS.length],
      }))
      .reverse(),
    [entities],
  )

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 40, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity={0.06} strokeDasharray="3 3" />
        <XAxis
          type="number"
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.7 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={(props) => (
            <CustomBarTooltip
              {...props}
              valueLabel="Contratos"
              valueFormatter={(v) => v.toLocaleString('es-CO')}
            />
          )}
          cursor={{ fill: 'currentColor', opacity: 0.04 }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
            style={{ fontSize: 10, fill: 'currentColor', opacity: 0.6 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function TopByValor({ entities }: { entities: EntitySummary[] }) {
  const data = useMemo(() => {
    return [...entities]
      .filter((e) => e.totalValor > 0)
      .sort((a, b) => b.totalValor - a.totalValor)
      .slice(0, 10)
      .map((e, i) => ({
        name: shortName(e.name, 24),
        fullName: e.name,
        value: e.totalValor,
        color: BAR_COLORS[(i + 3) % BAR_COLORS.length],
      }))
      .reverse()
  }, [entities])

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Sin datos de valor disponibles
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 56, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity={0.06} strokeDasharray="3 3" />
        <XAxis
          type="number"
          tickFormatter={fmtCOP}
          tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.7 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={(props) => (
            <CustomBarTooltip
              {...props}
              valueLabel="Valor total"
              valueFormatter={fmtFullCOP}
            />
          )}
          cursor={{ fill: 'currentColor', opacity: 0.04 }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={fmtCOP}
            style={{ fontSize: 10, fill: 'currentColor', opacity: 0.6 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Department distribution (donut) ────────────────────────────────────────

const DEPT_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#60a5fa', '#34d399',
  '#fbbf24', '#f87171', '#fb923c', '#e879f9', '#2dd4bf',
  '#94a3b8',
]

function DepartmentDonut({ entities }: { entities: EntitySummary[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const { data, total } = useMemo(() => {
    const byDept: Record<string, number> = {}
    for (const e of entities) {
      const dept = e.departamento || 'Sin departamento'
      byDept[dept] = (byDept[dept] ?? 0) + e.count
    }
    const sorted = Object.entries(byDept)
      .sort((a, b) => b[1] - a[1])

    const top = sorted.slice(0, 10)
    const rest = sorted.slice(10).reduce((acc, [, v]) => acc + v, 0)
    if (rest > 0) top.push(['Otros', rest])

    const total = sorted.reduce((s, [, v]) => s + v, 0)
    const data = top.map(([name, value], i) => ({
      name,
      value,
      fill: DEPT_COLORS[i % DEPT_COLORS.length],
    }))
    return { data, total }
  }, [entities])

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                  style={{ transition: 'opacity 0.2s', cursor: 'pointer' }}
                />
              ))}
            </Pie>
            <Tooltip
              content={(props) => (
                <CustomPieTooltip {...props} total={total} />
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold tabular-nums">
            {activeIndex !== null ? data[activeIndex].value.toLocaleString('es-CO') : total.toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-muted-foreground">
            {activeIndex !== null ? data[activeIndex].name : 'contratos'}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5">
        {data.map((d, i) => (
          <button
            key={d.name}
            className="flex items-center gap-1.5 text-left"
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: d.fill, opacity: activeIndex === null || activeIndex === i ? 1 : 0.4, transition: 'opacity 0.2s' }}
            />
            <span className="truncate text-xs text-muted-foreground" style={{ opacity: activeIndex === null || activeIndex === i ? 1 : 0.4, transition: 'opacity 0.2s' }}>
              {d.name}
            </span>
            <span className="ml-auto shrink-0 text-xs font-medium tabular-nums text-foreground" style={{ opacity: activeIndex === null || activeIndex === i ? 1 : 0.4, transition: 'opacity 0.2s' }}>
              {((d.value / total) * 100).toFixed(0)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Bubble scatter: valor vs contratos ─────────────────────────────────────

function ValorVsContratosScatter({ entities }: { entities: EntitySummary[] }) {
  const data = useMemo(() =>
    entities
      .filter((e) => e.totalValor > 0 && e.count > 0)
      .slice(0, 60)
      .map((e) => ({
        x: e.count,
        y: e.totalValor,
        z: Math.sqrt(e.count),
        name: e.name,
      })),
    [entities],
  )

  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        Sin datos
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ScatterChart margin={{ left: 8, right: 8, top: 8, bottom: 24 }}>
        <CartesianGrid stroke="currentColor" strokeOpacity={0.06} strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          name="Contratos"
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }}
          axisLine={false}
          tickLine={false}
          label={{ value: 'Contratos', position: 'insideBottom', offset: -14, style: { fontSize: 10, fill: 'currentColor', opacity: 0.4 } }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Valor"
          tickFormatter={fmtCOP}
          tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <ZAxis type="number" dataKey="z" range={[30, 180]} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3', stroke: 'currentColor', strokeOpacity: 0.15 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as { name: string; x: number; y: number }
            return (
              <div className="max-w-[200px] rounded-xl border bg-card/95 p-3 shadow-xl backdrop-blur-sm">
                <p className="mb-1.5 text-xs font-semibold leading-snug">{d.name}</p>
                <p className="text-xs text-muted-foreground">Contratos: <span className="font-medium text-foreground">{d.x.toLocaleString('es-CO')}</span></p>
                <p className="text-xs text-muted-foreground">Valor: <span className="font-medium text-foreground">{fmtCOP(d.y)}</span></p>
              </div>
            )
          }}
        />
        <Scatter
          data={data}
          fill="#6366f1"
          fillOpacity={0.7}
          shape="circle"
        />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

interface AllEntitiesChartsProps {
  entities: EntitySummary[]
}

export function AllEntitiesCharts({ entities }: AllEntitiesChartsProps) {
  if (entities.length === 0) return null

  return (
    <div className="mt-8 space-y-6">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-base font-semibold">Análisis Visual</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Distribución y ranking de entidades contratantes
        </p>
      </motion.div>

      {/* Row 1: Top by contracts + Top by valor */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Top 10 por número de contratos"
          subtitle="Entidades con mayor actividad contractual"
          icon={<BarChart3 className="h-4 w-4" />}
          delay={0.05}
        >
          <TopByContracts entities={entities} />
        </ChartCard>

        <ChartCard
          title="Top 10 por valor total contratado"
          subtitle="Entidades que más recursos han comprometido"
          icon={<DollarSign className="h-4 w-4" />}
          delay={0.1}
        >
          <TopByValor entities={entities} />
        </ChartCard>
      </div>

      {/* Row 2: Department donut + Scatter */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Contratos por departamento"
          subtitle="Distribución geográfica de la actividad"
          icon={<MapPin className="h-4 w-4" />}
          delay={0.15}
        >
          <DepartmentDonut entities={entities} />
        </ChartCard>

        <ChartCard
          title="Valor vs volumen de contratos"
          subtitle="Cada burbuja representa una entidad"
          icon={<Building2 className="h-4 w-4" />}
          delay={0.2}
        >
          <ValorVsContratosScatter entities={entities} />
        </ChartCard>
      </div>
    </div>
  )
}
