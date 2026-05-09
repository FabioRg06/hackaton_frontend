'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Users,
  DollarSign,
  Clock,
  BarChart3,
  Target,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, parseContractValue } from '@/lib/secop'
import type { ContractWithRisk, RedFlag, AlertSeverity } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ContractDashboardProps {
  contract: ContractWithRisk
  allFlags: RedFlag[]
}

// ── helpers ─────────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  info: '#3b82f6',
  warning: '#eab308',
  danger: '#f97316',
  critical: '#ef4444',
}

const CATEGORY_COLORS = ['#60a5fa', '#38bdf8', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#f472b6']

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  info: 'Info',
  warning: 'Medio',
  danger: 'Alto',
  critical: 'Crítico',
}

const RISK_GRADIENT: Record<string, { from: string; to: string; text: string }> = {
  bajo: { from: '#16a34a', to: '#22c55e', text: 'text-green-500' },
  medio: { from: '#ca8a04', to: '#eab308', text: 'text-yellow-500' },
  alto: { from: '#c2410c', to: '#f97316', text: 'text-orange-500' },
  critico: { from: '#b91c1c', to: '#ef4444', text: 'text-red-500' },
}

function StatTile({
  icon,
  label,
  value,
  sub,
  accent,
  index,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  accent?: string
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
    >
      <Card className="group overflow-hidden transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary/10',
                accent,
              )}
            >
              {icon}
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Custom label for pie chart
function PieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
  name: string
}) {
  if (percent < 0.08) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={10}
      fontWeight={600}
    >
      {name}
    </text>
  )
}

// ── main component ───────────────────────────────────────────────────────────

export function ContractDashboard({ contract, allFlags }: ContractDashboardProps) {
  const { riskAnalysis } = contract

  // Risk gauge data
  const gaugeData = useMemo(
    () => [{ value: riskAnalysis.score, fill: RISK_GRADIENT[riskAnalysis.level]?.to ?? '#6b7280' }],
    [riskAnalysis.score, riskAnalysis.level],
  )

  // Flag severity breakdown
  const severityData = useMemo(() => {
    const counts: Partial<Record<AlertSeverity, number>> = {}
    for (const f of allFlags) {
      counts[f.severity] = (counts[f.severity] ?? 0) + 1
    }
    const order: AlertSeverity[] = ['critical', 'danger', 'warning', 'info']
    return order
      .filter((s) => counts[s])
      .map((s) => ({ name: SEVERITY_LABEL[s], value: counts[s]!, color: SEVERITY_COLOR[s] }))
  }, [allFlags])

  // Flag categories
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const f of allFlags) {
      counts[f.category] = (counts[f.category] ?? 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, value], index) => ({
        name: name.length > 18 ? name.slice(0, 16) + '…' : name,
        value,
        fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))
  }, [allFlags])

  // Competition data
  const invited = parseInt(contract.proveedores_invitados || '0', 10)
  const responses = parseInt(contract.respuestas_al_procedimiento || '0', 10)
  const competitionData = [
    { label: 'Invitados', value: invited, color: '#6366f1' },
    { label: 'Respuestas', value: responses, color: '#22c55e' },
  ]

  // Financial comparison
  const baseValue = parseContractValue(contract.precio_base)
  const contractValue = parseContractValue(contract.cuantia_contrato)
  const additionsValue = parseContractValue(contract.valor_total_de_adiciones)
  const financialData = [
    { name: 'Base', value: baseValue, fill: '#6366f1' },
    { name: 'Contrato', value: contractValue, fill: RISK_GRADIENT[riskAnalysis.level]?.to ?? '#6b7280' },
    ...(additionsValue > 0 ? [{ name: 'Adiciones', value: additionsValue, fill: '#f97316' }] : []),
  ]

  const riskConfig = RISK_GRADIENT[riskAnalysis.level] ?? RISK_GRADIENT.bajo
  const criticalCount = allFlags.filter((f) => f.severity === 'critical').length
  const dangerCount = allFlags.filter((f) => f.severity === 'danger').length
  const competitionRate = invited > 0 ? Math.round((responses / invited) * 100) : 0

  return (
    <div className="space-y-5 p-4 lg:p-6">
      {/* ── KPI tiles ─────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile
          index={0}
          icon={<Target className="h-4 w-4 text-primary" />}
          label="Score de riesgo"
          value={riskAnalysis.score}
          sub={`de 100 · nivel ${riskAnalysis.level}`}
        />
        <StatTile
          index={1}
          icon={<AlertTriangle className="h-4 w-4 text-risk-alto" />}
          label="Alertas totales"
          value={allFlags.length}
          sub={criticalCount > 0 ? `${criticalCount} crítica(s)` : dangerCount > 0 ? `${dangerCount} alta(s)` : 'sin críticas'}
        />
        <StatTile
          index={2}
          icon={<Users className="h-4 w-4 text-indigo-500" />}
          label="Competencia"
          value={`${competitionRate}%`}
          sub={`${responses} resp. / ${invited} invitados`}
        />
        <StatTile
          index={3}
          icon={<DollarSign className="h-4 w-4 text-green-500" />}
          label="Valor contrato"
          value={formatCurrency(contractValue)}
          sub={baseValue > 0 ? `Base: ${formatCurrency(baseValue)}` : undefined}
        />
      </div>

      {/* ── Risk gauge + severity breakdown ───────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Gauge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="h-4 w-4" />
                Indicador de Riesgo
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pb-4">
              <div className="relative">
                <RadialBarChart
                  width={200}
                  height={160}
                  cx="50%"
                  cy="80%"
                  innerRadius="60%"
                  outerRadius="100%"
                  startAngle={180}
                  endAngle={0}
                  data={[{ value: 100, fill: 'hsl(var(--muted))' }, ...gaugeData]}
                  barSize={14}
                >
                  <RadialBar dataKey="value" cornerRadius={8} background={false} />
                </RadialBarChart>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
                  <span className={cn('text-4xl font-black tabular-nums', riskConfig.text)}>
                    {riskAnalysis.score}
                  </span>
                  <p className="text-xs text-muted-foreground">/ 100</p>
                </div>
              </div>
              <Badge
                className={cn(
                  'mt-2 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide',
                  riskAnalysis.level === 'bajo' && 'bg-green-500/15 text-green-600',
                  riskAnalysis.level === 'medio' && 'bg-yellow-500/15 text-yellow-600',
                  riskAnalysis.level === 'alto' && 'bg-orange-500/15 text-orange-600',
                  riskAnalysis.level === 'critico' && 'bg-red-500/15 text-red-600',
                )}
              >
                {riskAnalysis.level === 'bajo' && <ShieldCheck className="mr-1 h-3 w-3" />}
                {riskAnalysis.level !== 'bajo' && <ShieldAlert className="mr-1 h-3 w-3" />}
                Riesgo {riskAnalysis.level}
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        {/* Severity donut */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                Distribución de Alertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {severityData.length === 0 ? (
                <div className="flex h-[180px] flex-col items-center justify-center gap-2 text-muted-foreground">
                  <ShieldCheck className="h-8 w-8 text-green-500" />
                  <p className="text-sm">Sin alertas detectadas</p>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <PieChart width={150} height={160}>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      innerRadius={35}
                      dataKey="value"
                      labelLine={false}
                      label={PieLabel as never}
                    >
                      {severityData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0].payload
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-lg text-xs">
                            <p className="font-semibold">{d.name}</p>
                            <p className="text-muted-foreground">{d.value} alerta(s)</p>
                          </div>
                        )
                      }}
                    />
                  </PieChart>
                  <div className="flex flex-1 flex-col gap-2">
                    {severityData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: d.color }}
                        />
                        <span className="flex-1 text-muted-foreground">{d.name}</span>
                        <span className="font-semibold tabular-nums">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Categories bar + Competition ──────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Categories */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                Categorías de Alertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground">
                  Sin categorías
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={categoryData.length * 32 + 8}>
                  <BarChart
                    data={categoryData}
                    layout="vertical"
                    margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-lg text-xs">
                            <p className="font-semibold">{payload[0].payload.name}</p>
                            <p className="text-muted-foreground">{payload[0].value} alerta(s)</p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
                      {categoryData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Competition + Financial */}
        <div className="flex flex-col gap-5">
          {/* Competition */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Competencia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {competitionData.map((d) => {
                  const max = Math.max(invited, 1)
                  const pct = Math.round((d.value / max) * 100)
                  return (
                    <div key={d.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{d.label}</span>
                        <span className="font-semibold tabular-nums">{d.value}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: 0.4 }}
                          className="h-full rounded-full"
                          style={{ background: d.color }}
                        />
                      </div>
                    </div>
                  )
                })}
                {invited > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Tasa de participación:{' '}
                    <span
                      className={cn(
                        'font-semibold',
                        competitionRate < 20 ? 'text-red-500' : competitionRate < 50 ? 'text-yellow-500' : 'text-green-500',
                      )}
                    >
                      {competitionRate}%
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Financial */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Valores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={financialData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-lg text-xs">
                            <p className="font-semibold">{payload[0].payload.name}</p>
                            <p className="text-muted-foreground">{formatCurrency(Number(payload[0].value))}</p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {financialData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1">
                  {financialData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-2 w-2 rounded-full" style={{ background: d.fill }} />
                        {d.name}
                      </span>
                      <span className="font-mono font-semibold">{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* ── Duration & Phase ──────────────────────────────── */}
      {(contract.duracion || contract.fase || contract.estado_del_procedimiento) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                Ejecución
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              {contract.duracion && (
                <div>
                  <p className="text-xs text-muted-foreground">Duración</p>
                  <p className="text-lg font-bold">
                    {contract.duracion}{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                      {contract.unidad_de_duracion}
                    </span>
                  </p>
                </div>
              )}
              {contract.fase && (
                <div>
                  <p className="text-xs text-muted-foreground">Fase</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {contract.fase}
                  </Badge>
                </div>
              )}
              {contract.estado_del_procedimiento && (
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {contract.estado_del_procedimiento}
                  </Badge>
                </div>
              )}
              {contract.modalidad_de_contratacion && (
                <div>
                  <p className="text-xs text-muted-foreground">Modalidad</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {contract.modalidad_de_contratacion}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
