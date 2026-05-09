'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts'
import { BarChart3, TrendingUp, Layers, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/secop'
import type { EntitySummary } from '@/hooks/use-contracts'

interface AllEntitiesDashboardProps {
  entities: EntitySummary[]
  isLoading?: boolean
}

// ── Color palettes ────────────────────────────────────────────────────────────
function blueShade(i: number) {
  const alpha = Math.max(0.25, 1 - i * 0.075)
  return `rgba(59,130,246,${alpha})`
}

function amberShade(i: number) {
  const alpha = Math.max(0.25, 1 - i * 0.075)
  return `rgba(245,158,11,${alpha})`
}

// ── Shared minimal tooltip ────────────────────────────────────────────────────
function MiniTooltip({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean
  payload?: { value: number; payload: Record<string, unknown> }[]
  label?: string
  formatValue?: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  const raw = payload[0].value
  const display = formatValue ? formatValue(raw) : raw.toLocaleString('es-CO')
  return (
    <div className="rounded-xl border bg-background/95 px-3 py-2 shadow-xl backdrop-blur-sm text-xs leading-relaxed">
      {label && (
        <p className="max-w-[220px] truncate font-medium text-foreground">{label}</p>
      )}
      <p className="text-muted-foreground">
        <span className="font-semibold text-foreground">{display}</span>
      </p>
    </div>
  )
}

// ── Fade-in animation helper ──────────────────────────────────────────────────
const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay },
})

// ── Section divider ───────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function AllEntitiesDashboard({ entities, isLoading }: AllEntitiesDashboardProps) {
  // ── Top 10 by contract count ──────────────────────────────────────────────
  const top10ByCount = useMemo(
    () =>
      entities.slice(0, 10).map((e) => ({
        name: e.name.length > 32 ? e.name.slice(0, 32) + '…' : e.name,
        value: e.count,
      })),
    [entities],
  )

  // ── Distribution buckets ──────────────────────────────────────────────────
  const distributionData = useMemo(() => {
    const buckets = [
      { label: '1–5', min: 1, max: 5, count: 0 },
      { label: '6–20', min: 6, max: 20, count: 0 },
      { label: '21–50', min: 21, max: 50, count: 0 },
      { label: '51–200', min: 51, max: 200, count: 0 },
      { label: '201+', min: 201, max: Infinity, count: 0 },
    ]
    for (const e of entities) {
      const bucket = buckets.find((b) => e.count >= b.min && e.count <= b.max)
      if (bucket) bucket.count++
    }
    return buckets
  }, [entities])

  // ── Top 10 by contracted value ────────────────────────────────────────────
  const top10ByValue = useMemo(() => {
    const withValue = entities.filter((e) => e.totalValor > 0)
    if (withValue.length === 0) return []
    return [...withValue]
      .sort((a, b) => b.totalValor - a.totalValor)
      .slice(0, 10)
      .map((e) => ({
        name: e.name.length > 32 ? e.name.slice(0, 32) + '…' : e.name,
        value: e.totalValor,
      }))
  }, [entities])

  // ── Cumulative concentration curve (top 30 entities) ─────────────────────
  const concentrationData = useMemo(() => {
    const sorted = [...entities].sort((a, b) => b.count - a.count)
    const total = sorted.reduce((s, e) => s + e.count, 0)
    if (total === 0) return []
    let cumulative = 0
    return sorted.slice(0, 30).map((e, i) => {
      cumulative += e.count
      return { rank: i + 1, pct: Math.round((cumulative / total) * 100) }
    })
  }, [entities])

  if (isLoading) {
    return (
      <div className="mb-8 grid gap-5 lg:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`rounded-2xl border bg-card animate-pulse h-[280px]${i < 2 ? ' lg:col-span-1' : ''}`}
          />
        ))}
      </div>
    )
  }

  if (entities.length === 0) return null

  return (
    <div className="mb-8 space-y-8">
      {/* ── Actividad ──────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader label="Actividad contractual" />
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Top 10 por contratos */}
          <motion.div {...fadeUp(0.05)} className="lg:col-span-2">
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  Top 10 entidades · mayor número de contratos
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-5">
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={top10ByCount}
                      layout="vertical"
                      margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                    >
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10.5, fill: 'hsl(var(--foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        width={210}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => (
                          <MiniTooltip
                            active={active}
                            payload={payload as MiniTooltip['payload']}
                            label={label as string}
                          />
                        )}
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                      />
                      <Bar dataKey="value" radius={[0, 5, 5, 0]} maxBarSize={20}>
                        {top10ByCount.map((_, i) => (
                          <Cell key={i} fill={blueShade(i)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Distribución por volumen */}
          <motion.div {...fadeUp(0.1)}>
            <Card>
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Layers className="h-4 w-4 text-violet-500" />
                  Distribución de entidades por volumen
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-5">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={distributionData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                        strokeOpacity={0.5}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => (
                          <MiniTooltip
                            active={active}
                            payload={payload as MiniTooltip['payload']}
                            label={`${label} contratos`}
                          />
                        )}
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                      />
                      <Bar
                        dataKey="count"
                        fill="rgba(139,92,246,0.75)"
                        radius={[5, 5, 0, 0]}
                        maxBarSize={50}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Curva de concentración */}
          <motion.div {...fadeUp(0.15)}>
            <Card>
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Concentración acumulada (top 30)
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-5">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={concentrationData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 16 }}
                    >
                      <defs>
                        <linearGradient id="concGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        strokeOpacity={0.5}
                      />
                      <XAxis
                        dataKey="rank"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        label={{
                          value: 'ranking entidades',
                          position: 'insideBottom',
                          offset: -8,
                          fontSize: 10,
                          fill: 'hsl(var(--muted-foreground))',
                        }}
                      />
                      <YAxis
                        unit="%"
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const d = payload[0].payload as { rank: number; pct: number }
                          return (
                            <div className="rounded-xl border bg-background/95 px-3 py-2 shadow-xl backdrop-blur-sm text-xs leading-relaxed">
                              <p className="text-foreground">
                                Top <strong>{d.rank}</strong> entidades
                              </p>
                              <p className="text-muted-foreground">
                                acumulan{' '}
                                <strong className="text-foreground">{d.pct}%</strong> de los
                                contratos
                              </p>
                            </div>
                          )
                        }}
                        cursor={{ stroke: 'hsl(var(--border))' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="pct"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#concGrad)"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0, fill: '#10b981' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* ── Valor contratado ───────────────────────────────────────────────── */}
      {top10ByValue.length > 0 && (
        <div>
          <SectionHeader label="Valor contratado" />
          <motion.div {...fadeUp(0.2)}>
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <DollarSign className="h-4 w-4 text-amber-500" />
                  Top 10 entidades · mayor valor contratado
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-5">
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={top10ByValue}
                      layout="vertical"
                      margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                    >
                      <XAxis
                        type="number"
                        tickFormatter={(v: number) => formatCurrency(v)}
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10.5, fill: 'hsl(var(--foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        width={210}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => (
                          <MiniTooltip
                            active={active}
                            payload={payload as MiniTooltip['payload']}
                            label={label as string}
                            formatValue={(v) => formatCurrency(v)}
                          />
                        )}
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                      />
                      <Bar dataKey="value" radius={[0, 5, 5, 0]} maxBarSize={20}>
                        {top10ByValue.map((_, i) => (
                          <Cell key={i} fill={amberShade(i)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  )
}
