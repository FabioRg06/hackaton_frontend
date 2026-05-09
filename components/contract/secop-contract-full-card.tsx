'use client'

import { motion } from 'framer-motion'
import { Building2, Calendar, User, ExternalLink, DollarSign, MapPin, FileText, Hash } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SecopContractFullCardProps {
  contract: Record<string, any>
  index?: number
  onClick?: (contract: Record<string, any>) => void
}

function formatCOP(value: string | number | undefined) {
  const n = Number(value)
  if (!n || isNaN(n)) return 'N/A'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function formatDate(value: string | undefined) {
  if (!value) return 'N/A'
  try {
    return new Date(value).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return value
  }
}

function truncate(s: string | undefined, max = 80) {
  if (!s) return '—'
  return s.length > max ? s.slice(0, max) + '…' : s
}

export function SecopContractFullCard({ contract, index = 0, onClick }: SecopContractFullCardProps) {
  const valor = Number(contract.precio_base || contract.valor_total_adjudicacion || 0)
  const badgeColor = valor > 1_000_000_000 ? 'destructive' : valor > 100_000_000 ? 'secondary' : 'outline'

  const modalidad: string = contract.modalidad_de_contratacion || ''
  const isDirecta = /directa/i.test(modalidad)
  const isSingleBidder =
    parseInt(contract.proveedores_invitados || '0') <= 1 ||
    parseInt(contract.conteo_de_respuestas_a_ofertas || '0') <= 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.6) }}
    >
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50',
          'border-l-4',
          isDirecta ? 'border-l-amber-500' : 'border-l-primary/30',
        )}
        onClick={() => onClick?.(contract)}
      >
        <CardHeader className="pb-1 pt-3 px-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2 flex-1">
              {truncate(contract.descripci_n_del_procedimiento || contract.nombre_del_procedimiento, 120)}
            </p>
            <Badge variant={badgeColor} className="shrink-0 text-xs">
              {formatCOP(contract.precio_base || contract.valor_total_adjudicacion)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-3 space-y-2">
          {/* Entidad + referencia */}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              <span className="max-w-[180px] truncate">{contract.entidad || 'Sin entidad'}</span>
            </span>
            {contract.referencia_del_proceso && (
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {contract.referencia_del_proceso}
              </span>
            )}
            {(contract.ciudad_entidad || contract.departamento_entidad) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[contract.ciudad_entidad, contract.departamento_entidad].filter(Boolean).join(', ')}
              </span>
            )}
          </div>

          {/* Proveedor + fecha */}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            {contract.nombre_del_proveedor && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="max-w-[160px] truncate">{contract.nombre_del_proveedor}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(contract.fecha_de_publicacion_del)}
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {modalidad && (
              <span className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                isDirecta ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'
              )}>
                {modalidad}
              </span>
            )}
            {contract.estado_del_procedimiento && (
              <span className="rounded px-1.5 py-0.5 text-[10px] bg-muted text-muted-foreground">
                {contract.estado_del_procedimiento}
              </span>
            )}
            {contract.duracion && (
              <span className="rounded px-1.5 py-0.5 text-[10px] bg-muted text-muted-foreground">
                {contract.duracion} {contract.unidad_de_duracion || 'días'}
              </span>
            )}
            {isSingleBidder && (
              <span className="rounded px-1.5 py-0.5 text-[10px] bg-red-500/10 text-red-500 font-semibold">
                1 oferente
              </span>
            )}
            {contract.urlproceso && (
              <a
                href={typeof contract.urlproceso === 'object' ? contract.urlproceso.url : contract.urlproceso}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 text-[10px] text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
                Ver en SECOP
              </a>
            )}
          </div>

          {/* Oferentes */}
          {(contract.proveedores_invitados || contract.conteo_de_respuestas_a_ofertas) && (
            <div className="flex gap-4 text-[10px] text-muted-foreground border-t pt-1.5 mt-1">
              {contract.proveedores_invitados && (
                <span>Invitados: <strong>{contract.proveedores_invitados}</strong></span>
              )}
              {contract.conteo_de_respuestas_a_ofertas && (
                <span>Ofertas: <strong>{contract.conteo_de_respuestas_a_ofertas}</strong></span>
              )}
              {contract.adjudicado && (
                <span>Adjudicado: <strong>{contract.adjudicado}</strong></span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
