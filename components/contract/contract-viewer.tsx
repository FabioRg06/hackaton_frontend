'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Building2,
  Calendar,
  User,
  DollarSign,
  Clock,
  FileText,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RiskScoreBadge } from '@/components/dashboard/risk-score-badge'
import { AlertsSidebar } from './alerts-sidebar'
import { HighlightedText } from './highlighted-text'
import { formatCurrency, formatDate, parseContractValue } from '@/lib/secop'
import type { ContractWithRisk, RedFlag } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ContractViewerProps {
  contract: ContractWithRisk
}

export function ContractViewer({ contract }: ContractViewerProps) {
  const [selectedFlag, setSelectedFlag] = useState<RedFlag | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const textRefs = useRef<Map<string, HTMLElement>>(new Map())

  const { riskAnalysis } = contract

  const handleFlagClick = (flag: RedFlag) => {
    setSelectedFlag(flag)
    // Scroll to the highlighted section
    const element = textRefs.current.get(flag.id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const setTextRef = (flagId: string, element: HTMLElement | null) => {
    if (element) {
      textRefs.current.set(flagId, element)
    }
  }

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className={cn('flex-1 overflow-auto p-4 lg:p-6', !sidebarCollapsed && 'lg:pr-80')}>
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                {/* Risk Score */}
                <div className="flex items-center gap-4">
                  <RiskScoreBadge
                    score={riskAnalysis.score}
                    level={riskAnalysis.level}
                    size="lg"
                    showLabel
                  />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {riskAnalysis.flags.length} alertas detectadas
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        'mt-1',
                        riskAnalysis.level === 'bajo' && 'border-risk-bajo text-risk-bajo',
                        riskAnalysis.level === 'medio' && 'border-risk-medio text-risk-medio',
                        riskAnalysis.level === 'alto' && 'border-risk-alto text-risk-alto',
                        riskAnalysis.level === 'critico' && 'border-risk-critico text-risk-critico'
                      )}
                    >
                      {contract.estado_contrato || 'Estado desconocido'}
                    </Badge>
                  </div>
                </div>

                {/* External Link */}
                {contract.urlproceso && (
                  <Button variant="outline" asChild>
                    <a href={contract.urlproceso} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Ver en SECOP
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contract Details */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Entity Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  Entidad Contratante
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">{contract.nombre_entidad}</p>
                  <p className="text-xs text-muted-foreground">NIT: {contract.nit_entidad}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {contract.departamento_entidad && (
                    <span>{contract.departamento_entidad}</span>
                  )}
                  {contract.municipio_entidad && (
                    <>
                      <span>-</span>
                      <span>{contract.municipio_entidad}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contractor Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Contratista
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">
                    {contract.nombre_del_contratista || 'No especificado'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    NIT: {contract.nit_del_contratista || 'N/A'}
                  </p>
                </div>
                {riskAnalysis.flags.some((f) => f.category === 'Contratista') && (
                  <Badge variant="destructive" className="text-xs">
                    Contratista con alertas
                  </Badge>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Financial Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-4 w-4" />
                  Informacion Financiera
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor del contrato</span>
                  <span className="font-semibold">
                    {formatCurrency(parseContractValue(contract.cuantia_contrato))}
                  </span>
                </div>
                {contract.valor_total_de_adiciones && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Adiciones</span>
                    <span
                      className={cn(
                        'font-semibold',
                        riskAnalysis.flags.some((f) => f.category === 'Adiciones') &&
                          'text-risk-alto'
                      )}
                    >
                      {formatCurrency(parseContractValue(contract.valor_total_de_adiciones))}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Modalidad</span>
                  <Badge variant="secondary" className="text-xs">
                    {contract.modalidad_de_contratacion || 'N/A'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Timeline Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  Fechas y Plazos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Fecha de firma</span>
                  <span className="text-sm">{formatDate(contract.fecha_de_firma)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Inicio</span>
                  <span className="text-sm">{formatDate(contract.fecha_inicio_ejecucion)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Fin</span>
                  <span className="text-sm">{formatDate(contract.fecha_fin_ejecucion)}</span>
                </div>
                {contract.plazo_de_ejecucion && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Plazo</span>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="mr-1 h-3 w-3" />
                      {contract.plazo_de_ejecucion}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Contract Object - Turnitin Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="mt-6"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Objeto del Contrato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/30 p-4">
                <HighlightedText
                  text={contract.objeto_del_contrato || 'Sin objeto definido'}
                  flags={riskAnalysis.flags}
                  highlights={riskAnalysis.highlights}
                  selectedFlag={selectedFlag}
                  onHighlightRef={setTextRef}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Flag Evidence Cards */}
        {riskAnalysis.flags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.35 }}
            className="mt-6"
          >
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-risk-critico/20 text-xs font-bold text-risk-critico">
                {riskAnalysis.flags.length}
              </span>
              Alertas Detectadas
            </h3>
            <div className="grid gap-4 lg:grid-cols-2">
              {riskAnalysis.flags.map((flag, index) => (
                <motion.div
                  key={flag.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.4 + index * 0.05 }}
                  ref={(el) => setTextRef(flag.id, el)}
                >
                  <Card
                    className={cn(
                      'cursor-pointer border-l-4 transition-all hover:shadow-md',
                      flag.severity === 'info' && 'border-l-blue-500',
                      flag.severity === 'warning' && 'border-l-risk-medio',
                      flag.severity === 'danger' && 'border-l-risk-alto',
                      flag.severity === 'critical' && 'border-l-risk-critico',
                      selectedFlag?.id === flag.id && 'ring-2 ring-primary'
                    )}
                    onClick={() => handleFlagClick(flag)}
                  >
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <Badge
                            className={cn(
                              'mb-1',
                              flag.severity === 'info' && 'bg-blue-500/20 text-blue-500',
                              flag.severity === 'warning' && 'bg-risk-medio/20 text-risk-medio',
                              flag.severity === 'danger' && 'bg-risk-alto/20 text-risk-alto',
                              flag.severity === 'critical' && 'bg-risk-critico/20 text-risk-critico'
                            )}
                          >
                            {flag.category}
                          </Badge>
                          <h4 className="font-medium">{flag.title}</h4>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">{flag.description}</p>
                      {flag.evidence && (
                        <div className="mt-2 rounded bg-muted/50 p-2">
                          <p className="text-xs font-mono text-muted-foreground">
                            {flag.evidence}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Alerts Sidebar */}
      <AlertsSidebar
        flags={riskAnalysis.flags}
        selectedFlag={selectedFlag}
        onFlagClick={handleFlagClick}
        collapsed={sidebarCollapsed}
        onCollapseChange={setSidebarCollapsed}
      />
    </div>
  )
}
