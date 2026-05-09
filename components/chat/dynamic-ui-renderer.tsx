'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, BarChart3, AlertTriangle, FileText, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ContractCard } from '@/components/dashboard/contract-card'
import { ContractViewer } from '@/components/contract/contract-viewer'
import { ExploratoryDashboard } from '@/components/charts/exploratory-dashboard'
import type { ViewMode, ContractWithRisk } from '@/lib/types'
import { cn } from '@/lib/utils'

interface DynamicUIRendererProps {
  viewMode: ViewMode
  data: unknown
  onBack: () => void
  onContractClick: (contract: ContractWithRisk) => void
}

export function DynamicUIRenderer({
  viewMode,
  data,
  onBack,
  onContractClick,
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
      const entities = data as { name: string; nit: string; count: number }[]
      return (
        <div className="flex h-full flex-col">
          {renderHeader(
            'Entidades Públicas',
            <Building2 className="h-5 w-5 text-primary" />
          )}
          <ScrollArea className="flex-1 p-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {entities.map((entity) => (
                <Card key={entity.nit} className="overflow-hidden">
                  <CardHeader className="bg-muted/50 pb-2">
                    <CardTitle className="text-sm font-bold truncate">{entity.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">NIT: {entity.nit}</p>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Contratos:</span>
                      <span className="font-semibold">{entity.count}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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

    default:
      return (
        <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
          Vista no reconocida
        </div>
      )
  }
}
