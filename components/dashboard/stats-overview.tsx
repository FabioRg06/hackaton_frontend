'use client'

import { motion } from 'framer-motion'
import { FileText, DollarSign, AlertTriangle, Building2, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/secop'
import type { DashboardStats } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StatsOverviewProps {
  stats: DashboardStats
  isLoading?: boolean
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: { value: number; label: string }
  color?: 'default' | 'success' | 'warning' | 'danger'
  index: number
}

function StatCard({ title, value, subtitle, icon, trend, color = 'default', index }: StatCardProps) {
  const colorClasses = {
    default: 'from-primary/10 to-primary/5 text-primary',
    success: 'from-risk-bajo/10 to-risk-bajo/5 text-risk-bajo',
    warning: 'from-risk-medio/10 to-risk-medio/5 text-risk-medio',
    danger: 'from-risk-critico/10 to-risk-critico/5 text-risk-critico',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className="relative overflow-hidden">
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br opacity-50',
            colorClasses[color]
          )}
        />
        <CardContent className="relative p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{title}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
              {subtitle && (
                <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
              )}
              {trend && (
                <div className="mt-2 flex items-center gap-1">
                  <TrendingUp className={cn(
                    'h-3 w-3',
                    trend.value >= 0 ? 'text-risk-bajo' : 'text-risk-critico'
                  )} />
                  <span className={cn(
                    'text-xs font-medium',
                    trend.value >= 0 ? 'text-risk-bajo' : 'text-risk-critico'
                  )}>
                    {trend.value >= 0 ? '+' : ''}{trend.value}%
                  </span>
                  <span className="text-xs text-muted-foreground">{trend.label}</span>
                </div>
              )}
            </div>
            <div className={cn(
              'rounded-lg p-2',
              colorClasses[color].replace('from-', 'bg-').split(' ')[0]
            )}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-7 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
        </div>
      </CardContent>
    </Card>
  )
}

export function StatsOverview({ stats, isLoading }: StatsOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Contratos"
        value={stats.totalContracts.toLocaleString('es-CO')}
        subtitle="Analizados"
        icon={<FileText className="h-5 w-5" />}
        index={0}
      />
      <StatCard
        title="Valor Total"
        value={formatCurrency(stats.totalValue)}
        subtitle="En contratos"
        icon={<DollarSign className="h-5 w-5" />}
        color="default"
        index={1}
      />
      <StatCard
        title="Riesgo Promedio"
        value={stats.avgRiskScore.toFixed(0)}
        subtitle={`de 100 puntos`}
        icon={<AlertTriangle className="h-5 w-5" />}
        color={stats.avgRiskScore < 30 ? 'success' : stats.avgRiskScore < 60 ? 'warning' : 'danger'}
        index={2}
      />
      <StatCard
        title="Alto Riesgo"
        value={stats.highRiskCount}
        subtitle={`${((stats.highRiskCount / stats.totalContracts) * 100).toFixed(1)}% del total`}
        icon={<Building2 className="h-5 w-5" />}
        color="danger"
        index={3}
      />
    </div>
  )
}
