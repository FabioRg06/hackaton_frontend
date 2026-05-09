'use client'

import { motion } from 'framer-motion'
import { Building2, Calendar, User, ExternalLink, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RiskScoreBadge, RiskBadgeSmall } from './risk-score-badge'
import { formatCurrency, formatDate } from '@/lib/secop'
import type { ContractWithRisk } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ContractCardProps {
  contract: ContractWithRisk
  onClick?: () => void
  index?: number
}

export function ContractCard({ contract, onClick, index = 0 }: ContractCardProps) {
  const { riskAnalysis } = contract
  const topFlags = riskAnalysis.flags.slice(0, 2)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card
        className={cn(
          'group cursor-pointer transition-all duration-200 hover:shadow-lg',
          'border-l-4',
          riskAnalysis.level === 'bajo' && 'border-l-risk-bajo',
          riskAnalysis.level === 'medio' && 'border-l-risk-medio',
          riskAnalysis.level === 'alto' && 'border-l-risk-alto',
          riskAnalysis.level === 'critico' && 'border-l-risk-critico'
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Risk Score */}
            <div className="shrink-0">
              <RiskScoreBadge
                score={riskAnalysis.score}
                level={riskAnalysis.level}
                size="md"
                showLabel={false}
              />
            </div>

            {/* Contract Info */}
            <div className="min-w-0 flex-1">
              {/* Header */}
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm font-medium leading-tight text-foreground group-hover:text-primary">
                    {contract.objeto_del_contrato || 'Sin objeto definido'}
                  </h3>
                </div>
                <RiskBadgeSmall level={riskAnalysis.level} />
              </div>

              {/* Meta info */}
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  <span className="max-w-[150px] truncate">{contract.nombre_entidad}</span>
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="max-w-[120px] truncate">{contract.nombre_del_contratista || 'N/A'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(contract.fecha_de_firma)}
                </span>
              </div>

              {/* Value and Type */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {formatCurrency(parseFloat(contract.cuantia_contrato || '0'))}
                </span>
                {contract.modalidad_de_contratacion && (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {contract.modalidad_de_contratacion}
                  </span>
                )}
              </div>

              {/* Flags preview */}
              {topFlags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                  {topFlags.map((flag) => (
                    <span
                      key={flag.id}
                      className={cn(
                        'rounded px-1.5 py-0.5 text-xs',
                        flag.severity === 'info' && 'bg-blue-500/10 text-blue-500',
                        flag.severity === 'warning' && 'bg-risk-medio/10 text-risk-medio',
                        flag.severity === 'danger' && 'bg-risk-alto/10 text-risk-alto',
                        flag.severity === 'critical' && 'bg-risk-critico/10 text-risk-critico'
                      )}
                    >
                      {flag.title}
                    </span>
                  ))}
                  {riskAnalysis.flags.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{riskAnalysis.flags.length - 2} mas
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* External Link */}
            {contract.urlproceso && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  // Try to use the noticeUID to build a direct public link if the current one is broken/login
                  const url = contract.urlproceso
                  let targetUrl = url
                  
                  if (url.includes('noticeUID=') || contract.id_del_proceso) {
                    const noticeUID = url.includes('noticeUID=') 
                      ? url.split('noticeUID=').pop()?.split('&')[0] 
                      : contract.id_del_proceso
                    
                    if (noticeUID && noticeUID.startsWith('CO1.NTC')) {
                      targetUrl = `https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=${noticeUID}`
                    }
                  }
                  
                  window.open(targetUrl, '_blank')
                }}
              >
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">Ver en SECOP</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function ContractCardSkeleton() {
  return (
    <Card className="border-l-4 border-l-muted">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="h-14 w-14 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="flex gap-4">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-24 animate-pulse rounded bg-muted" />
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
