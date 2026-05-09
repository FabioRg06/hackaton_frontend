'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, BarChart3, AlertTriangle, FileText, Building2, Database, TrendingUp, ShieldAlert, Activity, Layers, Info, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ContractCard } from '@/components/dashboard/contract-card'
import { ContractViewer } from '@/components/contract/contract-viewer'
import { ExploratoryDashboard } from '@/components/charts/exploratory-dashboard'
import { SecopContractFullCard } from '@/components/contract/secop-contract-full-card'
import { SecopChart } from '@/components/charts/secop-chart'
import type { ViewMode, ContractWithRisk } from '@/lib/types'
import { cn } from '@/lib/utils'

function normalizeChartRows(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
  if (raw && typeof raw === 'object') {
    const value = (raw as { data?: unknown }).data
    if (Array.isArray(value)) {
      return value.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    }
  }
  return []
}

interface DynamicUIRendererProps {
  viewMode: ViewMode
  data: unknown
  onBack: () => void
  onContractClick: (contract: ContractWithRisk) => void
  onEntityClick?: (nit: string, name: string) => void
}

export function DynamicUIRenderer({
  viewMode,
  data,
  onBack,
  onContractClick,
  onEntityClick,
}: DynamicUIRendererProps) {
  const renderHeader = (title: string, icon: React.ReactNode) => (
    <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
    </div>
  )

  switch (viewMode) {
    case 'contract-list': {
      const contracts = data as ContractWithRisk[]
      return (
        <div className="flex h-full flex-col">
          {renderHeader(
            `${contracts.length} Contratos`,
            <FileText className="h-5 w-5 text-primary" />
          )}
          <ScrollArea className="flex-1 p-4">
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {contracts.map((contract, index) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  index={index}
                  onClick={() => onContractClick(contract)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )
    }

    case 'contract-detail': {
      const contract = data as ContractWithRisk
      return (
        <div className="flex h-full flex-col">
          {renderHeader(
            'Detalle del Contrato',
            <AlertTriangle className="h-5 w-5 text-primary" />
          )}
          <ScrollArea className="flex-1">
            <ContractViewer contract={contract} />
          </ScrollArea>
        </div>
      )
    }

    case 'exploratory': {
      const stats = data as {
        total?: number
        byRisk?: Record<string, number>
        avgScore?: number
        topFlags?: { flag: string; count: number }[]
        entityStats?: { name: string; count: number; avgRisk: number; flags: number }[]
        byModalidad?: Record<string, ContractWithRisk[]>
        contracts: ContractWithRisk[]
      }
      return (
        <div className="flex h-full flex-col">
          {renderHeader(
            'Analisis Exploratorio',
            <BarChart3 className="h-5 w-5 text-primary" />
          )}
          <ScrollArea className="flex-1">
            <ExploratoryDashboard
              stats={stats}
              contracts={stats.contracts}
              onContractClick={onContractClick}
            />
          </ScrollArea>
        </div>
      )
    }

    case 'entity-list': {
      const entities = data as { name: string; nit: string; count: number; total_alertas?: number; alertas_criticas?: number; alertas_altas?: number; max_score?: number }[]
      const hasAlerts = entities.some(e => (e.total_alertas ?? 0) > 0)
      return (
        <div className="flex h-full flex-col">
          {renderHeader(
            hasAlerts ? 'Entidades con Más Alertas' : 'Entidades Públicas',
            <Building2 className="h-5 w-5 text-primary" />
          )}
          <ScrollArea className="flex-1 p-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {entities.map((entity) => (
                <motion.div
                  key={entity.nit}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className={cn(
                      'overflow-hidden transition-shadow',
                      onEntityClick && 'cursor-pointer hover:shadow-md hover:border-primary/40'
                    )}
                    onClick={() => onEntityClick?.(entity.nit, entity.name)}
                  >
                    <CardHeader className="bg-muted/50 pb-2">
                      <CardTitle className="text-sm font-bold truncate">{entity.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">NIT: {entity.nit}</p>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Contratos:</span>
                        <span className="font-semibold">{entity.count}</span>
                      </div>
                      {(entity.total_alertas ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(entity.alertas_criticas ?? 0) > 0 && (
                            <span className="inline-flex items-center rounded-full bg-red-500/10 border border-red-200 dark:border-red-800 px-2 py-0.5 text-xs font-semibold text-red-600">
                              {entity.alertas_criticas} críticas
                            </span>
                          )}
                          {(entity.alertas_altas ?? 0) > 0 && (
                            <span className="inline-flex items-center rounded-full bg-orange-500/10 border border-orange-200 dark:border-orange-800 px-2 py-0.5 text-xs font-semibold text-orange-600">
                              {entity.alertas_altas} altas
                            </span>
                          )}
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {entity.total_alertas} alertas
                          </span>
                        </div>
                      )}
                      {onEntityClick && (
                        <div className="flex items-center gap-1 pt-1 text-xs text-primary font-medium">
                          <ChevronRight className="h-3 w-3" />
                          Ver contratos
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )
    }

    case 'entity-contracts': {
      const { name, nit, contratos, loading, error } = data as {
        name: string
        nit: string
        contratos: Array<{
          id: string; secop_id?: string; objeto?: string; valor_inicial?: number
          fecha_firma?: string; modalidad?: string; nivel_riesgo?: string; score?: number
          total_alertas?: number; alertas_criticas?: number; alertas_altas?: number; url_proceso?: string
          // SECOP raw fields
          descripci_n_del_procedimiento?: string; modalidad_de_contratacion?: string
          valor_total_adjudicacion?: string; fecha_de_publicacion_del?: string
          riskAnalysis?: { score: number; level: string; flags: any[] }
        }> | null
        loading?: boolean
        error?: boolean
      }

      const riskColor: Record<string, string> = {
        CRITICO: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800',
        ALTO: 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800',
        MEDIO: 'bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800',
        BAJO: 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800',
      }

      return (
        <div className="flex h-full flex-col">
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-6 py-4 backdrop-blur">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold leading-tight truncate">{name}</h2>
                <p className="text-xs text-muted-foreground">NIT: {nit} · Contratos con alertas</p>
              </div>
            </div>
          </div>
          <ScrollArea className="flex-1">
            {loading && (
              <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Cargando contratos...</span>
              </div>
            )}
            {error && !loading && (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 text-destructive/60" />
                <span className="text-sm">No se pudieron cargar los contratos.</span>
              </div>
            )}
            {!loading && !error && contratos && contratos.length === 0 && (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                <FileText className="h-8 w-8 opacity-40" />
                <span className="text-sm">No se encontraron contratos evaluados para esta entidad.</span>
              </div>
            )}
            {!loading && contratos && contratos.length > 0 && (
              <div className="p-6 space-y-3">
                {contratos.map((c, i) => {
                  const objeto = c.objeto ?? c.descripci_n_del_procedimiento ?? `Contrato ${i + 1}`
                  const modalidad = c.modalidad ?? c.modalidad_de_contratacion ?? ''
                  const nivelRiesgo = c.nivel_riesgo ?? (c.riskAnalysis ? c.riskAnalysis.level.toUpperCase() : '')
                  const score = c.score ?? c.riskAnalysis?.score ?? 0
                  const totalAlertas = c.total_alertas ?? c.riskAnalysis?.flags.length ?? 0
                  const criticas = c.alertas_criticas ?? c.riskAnalysis?.flags.filter((f: any) => f.severity === 'critical' || f.severidad === 'CRITICA').length ?? 0
                  const altas = c.alertas_altas ?? c.riskAnalysis?.flags.filter((f: any) => f.severity === 'danger' || f.severidad === 'ALTA').length ?? 0

                  return (
                    <motion.div
                      key={c.id || i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.25 }}
                    >
                      <div className="rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {nivelRiesgo && (
                                <span className={cn(
                                  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                                  riskColor[nivelRiesgo] ?? 'bg-muted text-muted-foreground'
                                )}>
                                  {nivelRiesgo}
                                </span>
                              )}
                              {modalidad && (
                                <span className="text-xs text-muted-foreground truncate max-w-[180px]">{modalidad}</span>
                              )}
                            </div>
                            <p className="text-sm font-medium line-clamp-2 leading-snug">{objeto}</p>
                          </div>
                          {score > 0 && (
                            <div className="shrink-0 text-right">
                              <div className="text-2xl font-bold tabular-nums text-primary">{score}</div>
                              <div className="text-xs text-muted-foreground">score</div>
                            </div>
                          )}
                        </div>
                        <div className="mt-3 space-y-1.5">
                          {score > 0 && (
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  score >= 75 ? 'bg-red-500' : score >= 50 ? 'bg-orange-500' : 'bg-yellow-500'
                                )}
                                style={{ width: `${Math.min(score, 100)}%` }}
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {criticas > 0 && <span className="text-red-500 font-medium">{criticas} críticas</span>}
                            {altas > 0 && <span className="text-orange-500 font-medium">{altas} altas</span>}
                            {totalAlertas > 0 && <span>{totalAlertas} alertas</span>}
                            {c.url_proceso && (
                              <a
                                href={typeof c.url_proceso === 'string' ? c.url_proceso : '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto text-primary underline-offset-2 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Ver en SECOP
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )
    }

    case 'count': {
      const total = data as number
      return (
        <div className="flex h-full flex-col items-center justify-center p-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <h2 className="mb-2 text-4xl font-bold text-primary">
              {new Intl.NumberFormat('es-CO').format(total)}
            </h2>
            <p className="text-xl text-muted-foreground">Contratos totales registrados</p>
            <Button variant="outline" className="mt-8" onClick={onBack}>
              Volver al Dashboard
            </Button>
          </motion.div>
        </div>
      )
    }

    case 'query-result': {
      const { data: rows, count } = data as { data: any[]; count?: number }
      if (!rows || rows.length === 0) {
        return (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No hay resultados</h3>
            <p className="text-muted-foreground">La consulta no devolvió ningún registro.</p>
            <Button variant="outline" className="mt-4" onClick={onBack}>Volver</Button>
          </div>
        )
      }

      const columns = Object.keys(rows[0])

      return (
        <div className="flex h-full flex-col">
          {renderHeader(
            count ? `Resultado: ${count} registros` : 'Resultados de Consulta',
            <BarChart3 className="h-5 w-5 text-primary" />
          )}
          <ScrollArea className="flex-1 p-4">
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      {columns.map((col) => (
                        <th key={col} className="px-4 py-2 text-left font-medium text-muted-foreground">
                          {col.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        {columns.map((col) => (
                          <td key={col} className="px-4 py-2 text-muted-foreground max-w-[300px] truncate">
                            {row[col]?.toString() || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </ScrollArea>
        </div>
      )
    }

    case 'comparison': {
      return (
        <div className="flex h-full flex-col">
          {renderHeader(
            'Comparacion',
            <Building2 className="h-5 w-5 text-primary" />
          )}
          <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground">
            Vista de comparacion en desarrollo
          </div>
        </div>
      )
    }

    case 'secop-full-list': {
      const { data: contracts, label, count } = data as { data: Record<string, any>[]; label?: string; count?: number }
      return (
        <div className="flex h-full flex-col">
          {renderHeader(
            label ?? `${count ?? contracts.length} Contratos SECOP`,
            <Database className="h-5 w-5 text-primary" />
          )}
          <ScrollArea className="flex-1 p-4">
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-2">
              {contracts.map((contract, index) => (
                <SecopContractFullCard
                  key={contract.id || contract.id_del_proceso || contract.referencia_del_proceso || index}
                  contract={contract}
                  index={index}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )
    }

    case 'secop-table': {
      const { data: rows, label, count } = data as { data: Record<string, any>[]; label?: string; count?: number }
      if (!rows || rows.length === 0) {
        return (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <h3 className="text-lg font-medium">No hay resultados</h3>
            <Button variant="outline" className="mt-4" onClick={onBack}>Volver</Button>
          </div>
        )
      }
      const columns = Object.keys(rows[0])
      return (
        <div className="flex h-full flex-col">
          {renderHeader(
            label ?? `${count ?? rows.length} resultados`,
            <Database className="h-5 w-5 text-primary" />
          )}
          <ScrollArea className="flex-1 p-4">
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    {columns.map((col) => (
                      <th key={col} className="px-4 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      {columns.map((col) => (
                        <td key={col} className="px-4 py-2 text-muted-foreground max-w-[260px] truncate">
                          {row[col]?.toString() || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </div>
      )
    }

    case 'secop-chart': {
      const { chartType, title, data: rawChartData, xKey, yKey, color, yLabel } = data as {
        chartType: 'bar' | 'line' | 'pie'
        title: string
        data: Record<string, any>[] | null | undefined
        xKey: string
        yKey: string
        color?: string
        yLabel?: string
      }

      const chartData = normalizeChartRows(rawChartData)
      const total = chartData.reduce((s: number, r: any) => s + (Number(r[yKey]) || 0), 0)
      const maxVal = chartData.length > 0 ? Math.max(...chartData.map((r: any) => Number(r[yKey]) || 0)) : 0

      return (
        <div className="flex h-full flex-col">
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-6 py-4 backdrop-blur">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold leading-tight">{title}</h2>
                <p className="text-xs text-muted-foreground">{chartData.length} categorías · SECOP II</p>
              </div>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {chartData.length === 0 && (
                <div className="rounded-xl border border-dashed bg-card/60 p-6 text-sm text-muted-foreground">
                  No se pudo construir la gráfica con la respuesta recibida. Vuelve a ejecutar la consulta para traer datos tabulares desde SECOP II.
                </div>
              )}
              {/* Summary stat strip */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total registros</p>
                  <p className="text-xl font-bold tabular-nums">{total.toLocaleString('es-CO')}</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-xs text-muted-foreground mb-1">Categorías</p>
                  <p className="text-xl font-bold tabular-nums">{chartData.length}</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-xs text-muted-foreground mb-1">Valor máximo</p>
                  <p className="text-xl font-bold tabular-nums">{maxVal.toLocaleString('es-CO')}</p>
                </div>
              </div>
              {/* Chart card */}
              {chartData.length > 0 && (
                <div className="rounded-2xl border bg-card p-6 shadow-sm">
                  <SecopChart
                    chartType={chartType}
                    title=""
                    data={chartData}
                    xKey={xKey}
                    yKey={yKey}
                    color={color}
                    yLabel={yLabel}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )
    }

    case 'high-risk-contract-list': {
      const { contratos, total } = data as {
        contratos: Array<{
          id: string
          secop_id?: string
          objeto?: string
          valor_inicial?: number
          fecha_firma?: string
          modalidad?: string
          entidad?: string
          nivel_riesgo: string
          score: number
          total_alertas: number
          alertas_criticas: number
          alertas_altas: number
          url_proceso?: string
        }>
        total?: number
      }

      const riskColor: Record<string, string> = {
        CRITICO: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800',
        ALTO: 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800',
        MEDIO: 'bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800',
        BAJO: 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800',
      }

      return (
        <div className="flex h-full flex-col">
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-6 py-4 backdrop-blur">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                <ShieldAlert className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <h2 className="text-base font-semibold leading-tight">Contratos de Mayor Riesgo</h2>
                <p className="text-xs text-muted-foreground">{total ?? contratos.length} contratos evaluados · ordenados por score</p>
              </div>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-3">
              {contratos.map((c, i) => (
                <motion.div
                  key={c.id || i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                >
                  <div className="rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                            riskColor[c.nivel_riesgo] ?? 'bg-muted text-muted-foreground'
                          )}>
                            {c.nivel_riesgo}
                          </span>
                          {c.modalidad && (
                            <span className="text-xs text-muted-foreground truncate max-w-[160px]">{c.modalidad}</span>
                          )}
                        </div>
                        <p className="text-sm font-medium line-clamp-2 leading-snug">
                          {c.objeto ?? c.secop_id ?? `Contrato ${i + 1}`}
                        </p>
                        {c.entidad && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">{c.entidad}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-2xl font-bold tabular-nums text-primary">{c.score}</div>
                        <div className="text-xs text-muted-foreground">score</div>
                      </div>
                    </div>
                    {/* Score bar + alert counts */}
                    <div className="mt-3 space-y-1.5">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            c.score >= 75 ? 'bg-red-500' : c.score >= 50 ? 'bg-orange-500' : 'bg-yellow-500'
                          )}
                          style={{ width: `${Math.min(c.score, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {c.alertas_criticas > 0 && (
                          <span className="text-red-500 font-medium">{c.alertas_criticas} críticas</span>
                        )}
                        {c.alertas_altas > 0 && (
                          <span className="text-orange-500 font-medium">{c.alertas_altas} altas</span>
                        )}
                        <span>{c.total_alertas} alertas totales</span>
                        {c.valor_inicial != null && (
                          <span className="ml-auto font-medium text-foreground">
                            ${(c.valor_inicial / 1_000_000).toFixed(1)}M
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )
    }

    case 'analysis-report': {
      const report = data as {
        title: string
        total: number
        charts: Array<{
          chartType: 'bar' | 'line' | 'pie'
          title: string
          data: Record<string, any>[]
          xKey: string
          yKey: string
          yLabel?: string
          color?: string
        }>
        insights?: string[]
      }

      const fmtNum = (n: number) => new Intl.NumberFormat('es-CO').format(n)

      return (
        <div className="flex h-full flex-col">
          {/* Report header */}
          <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
            <div className="flex items-center gap-3 px-6 py-4">
              <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold leading-tight">{report.title}</h2>
                  <p className="text-xs text-muted-foreground">Informe generado por GobIA · SECOP II</p>
                </div>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 max-w-5xl mx-auto space-y-8">

              {/* KPI strip */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Resumen Ejecutivo</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Contratos registrados', value: fmtNum(report.total), icon: <FileText className="h-4 w-4" /> },
                    { label: 'Fuente de datos', value: 'SECOP II', icon: <Database className="h-4 w-4" /> },
                    { label: 'Modalidades', value: fmtNum(report.charts[0]?.data?.length ?? 0), icon: <Layers className="h-4 w-4" /> },
                    { label: 'Departamentos', value: fmtNum(report.charts[1]?.data?.length ?? 0), icon: <Building2 className="h-4 w-4" /> },
                  ].map((kpi) => (
                    <div key={kpi.label} className="rounded-xl border bg-card p-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                        {kpi.icon}
                        <span className="text-xs">{kpi.label}</span>
                      </div>
                      <p className="text-xl font-bold tabular-nums">{kpi.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charts grid */}
              {report.charts.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Visualizaciones</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {report.charts.map((chart, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.08, duration: 0.35 }}
                        className={cn(
                          'rounded-2xl border bg-card p-5 shadow-sm',
                          chart.chartType === 'line' && 'md:col-span-2',
                        )}
                      >
                        <p className="text-xs font-semibold text-muted-foreground mb-4">{chart.title.toUpperCase()}</p>
                        {chart.data.length > 0 ? (
                          <SecopChart
                            chartType={chart.chartType}
                            title=""
                            data={chart.data}
                            xKey={chart.xKey}
                            yKey={chart.yKey}
                            yLabel={chart.yLabel}
                            color={chart.color ?? '#2563eb'}
                          />
                        ) : (
                          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                            Sin datos disponibles
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights */}
              {report.insights && report.insights.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Observaciones Clave</h3>
                  <div className="rounded-2xl border bg-card p-5 space-y-3">
                    {report.insights.map((insight, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.07 }}
                        className="flex gap-3 text-sm"
                      >
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Info className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-foreground/80 leading-relaxed">{insight}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pb-6" />
            </div>
          </ScrollArea>
        </div>
      )
    }

    case 'schema-info': {
      const schema = data as {
        total_campos: number
        campos: Array<{ campo: string; tipo: string; ejemplo: string }>
        nota: string
      }
      return (
        <div className="flex h-full flex-col">
          {renderHeader(
            `Estructura del dataset SECOP II (${schema.total_campos} campos)`,
            <Database className="h-5 w-5 text-primary" />
          )}
          <ScrollArea className="flex-1 p-4">
            <p className="mb-3 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">{schema.nota}</p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Campo</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-20">Tipo</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Ejemplo</th>
                  </tr>
                </thead>
                <tbody>
                  {schema.campos.map((c, i) => (
                    <motion.tr
                      key={c.campo}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.01 }}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-2 font-mono text-xs font-semibold text-primary">{c.campo}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{c.tipo}</td>
                      <td className="px-3 py-2 text-xs text-foreground/70 truncate max-w-xs">{c.ejemplo}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </div>
      )
    }

    case 'field-values': {
      const fv = data as {
        campo: string
        valores: Array<{ valor: string; total: number }>
        nota: string
      }
      const maxTotal = Math.max(...fv.valores.map((v) => v.total), 1)
      return (
        <div className="flex h-full flex-col">
          {renderHeader(
            `Valores de "${fv.campo}"`,
            <TrendingUp className="h-5 w-5 text-primary" />
          )}
          <ScrollArea className="flex-1 p-4">
            <p className="mb-3 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">{fv.nota}</p>
            <div className="space-y-1.5">
              {fv.valores.map((v, i) => (
                <motion.div
                  key={v.valor}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
                >
                  <span className="w-5 text-xs font-bold text-muted-foreground tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{v.valor}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div
                        className="h-1.5 rounded-full bg-primary/70"
                        style={{ width: `${Math.round((v.total / maxTotal) * 100)}%`, minWidth: 4 }}
                      />
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {new Intl.NumberFormat('es-CO').format(v.total)} contratos
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )
    }

    default:
      return (
        <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
          Vista no reconocida
        </div>
      )
  }
}
