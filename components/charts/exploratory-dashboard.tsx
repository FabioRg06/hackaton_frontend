'use client'

import { motion } from 'framer-motion'
import { BarChart3, PieChart, TrendingUp, AlertTriangle, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RiskDistributionChart } from './risk-distribution-chart'
import { TopFlagsChart } from './top-flags-chart'
import { EntityRiskChart } from './entity-risk-chart'
import { ModalidadChart } from './modalidad-chart'
import { ContractCard } from '@/components/dashboard/contract-card'
import { formatCurrency } from '@/lib/secop'
import type { ContractWithRisk, RiskLevel } from '@/lib/types'
import { parseContractValue } from '@/lib/secop'
import { cn } from '@/lib/utils'

interface ExploratoryDashboardProps {
  stats: {
    total?: number
    byRisk?: Record<string, number>
    avgScore?: number
    topFlags?: { flag: string; count: number }[]
    entityStats?: { name: string; count: number; avgRisk: number; flags: number }[]
    byModalidad?: Record<string, ContractWithRisk[]>
  }
  contracts: ContractWithRisk[]
  onContractClick: (contract: ContractWithRisk) => void
}

export function ExploratoryDashboard({
  stats,
  contracts,
  onContractClick,
}: ExploratoryDashboardProps) {
  // Calculate stats from contracts if not provided
  const totalContracts = stats.total || contracts.length
  const totalValue = contracts.reduce((sum, c) => sum + parseContractValue(c.cuantia_contrato), 0)
  const avgScore = stats.avgScore || 
    (contracts.length > 0 
      ? contracts.reduce((sum, c) => sum + c.riskAnalysis.score, 0) / contracts.length 
      : 0)

  const riskDistribution = stats.byRisk || {
    bajo: contracts.filter((c) => c.riskAnalysis.level === 'bajo').length,
    medio: contracts.filter((c) => c.riskAnalysis.level === 'medio').length,
    alto: contracts.filter((c) => c.riskAnalysis.level === 'alto').length,
    critico: contracts.filter((c) => c.riskAnalysis.level === 'critico').length,
  }

  const topFlags = stats.topFlags || getTopFlags(contracts)
  const entityStats = stats.entityStats || getEntityStats(contracts)
  const byModalidad = stats.byModalidad || groupByModalidad(contracts)

  // Get highest risk contracts
  const highRiskContracts = [...contracts]
    .sort((a, b) => b.riskAnalysis.score - a.riskAnalysis.score)
    .slice(0, 6)

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Contratos"
          value={totalContracts.toLocaleString('es-CO')}
          icon={<BarChart3 className="h-5 w-5" />}
          index={0}
        />
        <StatCard
          title="Valor Total"
          value={formatCurrency(totalValue)}
          icon={<TrendingUp className="h-5 w-5" />}
          index={1}
        />
        <StatCard
          title="Score Promedio"
          value={avgScore.toFixed(1)}
          subtitle="de 100"
          icon={<AlertTriangle className="h-5 w-5" />}
          color={avgScore < 30 ? 'success' : avgScore < 60 ? 'warning' : 'danger'}
          index={2}
        />
        <StatCard
          title="Entidades"
          value={entityStats.length}
          icon={<Building2 className="h-5 w-5" />}
          index={3}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Risk Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChart className="h-4 w-4" />
                Distribucion de Riesgo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RiskDistributionChart data={riskDistribution} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Flags */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4" />
                Alertas Mas Frecuentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TopFlagsChart data={topFlags} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Entity Risk */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Entidades por Riesgo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EntityRiskChart data={entityStats.slice(0, 8)} />
            </CardContent>
          </Card>
        </motion.div>

        {/* By Modalidad */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Contratos por Modalidad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ModalidadChart data={byModalidad} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* High Risk Contracts */}
      {highRiskContracts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="mb-4 text-lg font-semibold">Contratos de Mayor Riesgo</h3>
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {highRiskContracts.map((contract, index) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                index={index}
                onClick={() => onContractClick(contract)}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

// Stat Card Component
interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color?: 'default' | 'success' | 'warning' | 'danger'
  index: number
}

function StatCard({ title, value, subtitle, icon, color = 'default', index }: StatCardProps) {
  const colorClasses = {
    default: 'text-primary',
    success: 'text-risk-bajo',
    warning: 'text-risk-medio',
    danger: 'text-risk-critico',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className={cn('rounded-lg bg-muted p-2', colorClasses[color])}>
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Helper functions
function getTopFlags(contracts: ContractWithRisk[]): { flag: string; count: number }[] {
  const flagCounts: Record<string, number> = {}

  for (const contract of contracts) {
    for (const flag of contract.riskAnalysis.flags) {
      flagCounts[flag.title] = (flagCounts[flag.title] || 0) + 1
    }
  }

  return Object.entries(flagCounts)
    .map(([flag, count]) => ({ flag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

function getEntityStats(contracts: ContractWithRisk[]) {
  const entityMap: Record<string, { name: string; count: number; totalRisk: number; flags: number }> = {}

  for (const contract of contracts) {
    const nit = contract.nit_entidad
    if (!nit) continue

    if (!entityMap[nit]) {
      entityMap[nit] = {
        name: contract.nombre_entidad,
        count: 0,
        totalRisk: 0,
        flags: 0,
      }
    }
    entityMap[nit].count++
    entityMap[nit].totalRisk += contract.riskAnalysis.score
    entityMap[nit].flags += contract.riskAnalysis.flags.length
  }

  return Object.values(entityMap)
    .map((e) => ({
      ...e,
      avgRisk: e.totalRisk / e.count,
    }))
    .sort((a, b) => b.avgRisk - a.avgRisk)
}

function groupByModalidad(contracts: ContractWithRisk[]): Record<string, ContractWithRisk[]> {
  return contracts.reduce((acc, c) => {
    const mod = c.modalidad_de_contratacion || 'Sin especificar'
    if (!acc[mod]) acc[mod] = []
    acc[mod].push(c)
    return acc
  }, {} as Record<string, ContractWithRisk[]>)
}
