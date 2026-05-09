'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
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
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Database,
  Zap,
  BarChart3,
  FileSearch,
} from 'lucide-react'
import { ContractDashboard } from './contract-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RiskScoreBadge } from '@/components/dashboard/risk-score-badge'
import { AlertsSidebar } from './alerts-sidebar'
import { HighlightedText } from './highlighted-text'
import { formatCurrency, formatDate, parseContractValue } from '@/lib/secop'
import type { ContractWithRisk, RedFlag, AlertSeverity } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  evaluateContract,
  fetchContractLiveData,
  mapSeverity,
  FLAG_FIELDS_MAP,
  FLAG_CATEGORY,
  type BackendEvalResult,
  type BackendLiveData,
  type BackendFlag,
} from '@/lib/api-client'

interface ContractViewerProps {
  contract: ContractWithRisk
}

// ─── constants ──────────────────────────────────────────────────────────────
const SECOP_LOGIN_URL = 'https://community.secop.gov.co/STS/Users/Login/Index'

// ─── helpers ────────────────────────────────────────────────────────────────

/** Build the backend-format payload from a frontend ContractWithRisk */
function toBackendPayload(c: ContractWithRisk): Record<string, unknown> {
  return {
    id_proceso: c.id_del_proceso || c.id,
    nombre_procedimiento: c.nombre_del_procedimiento,
    descripcion_procedimiento: c.descripci_n_del_procedimiento,
    modalidad_contratacion: c.modalidad_de_contratacion,
    justificacion_modalidad: c.justificaci_n_modalidad_de,
    precio_base: parseFloat(c.precio_base || '0'),
    valor_contrato: parseFloat(c.valor_total_adjudicacion || '0'),
    proveedores_invitados: c.proveedores_invitados,
    respuestas: c.respuestas_al_procedimiento,
    proveedor_adjudicado: c.nombre_del_proveedor,
    nit_proveedor: c.nit_del_contratista,
    url_proceso: c.urlproceso,
    nit_entidad: c.nit_entidad,
    nombre_entidad: c.nombre_entidad || c.entidad,
    duracion: c.duracion,
    unidad_duracion: c.unidad_de_duracion,
    fase: c.fase,
    estado_procedimiento: c.estado_del_procedimiento,
    fecha_publicacion: c.fecha_de_publicacion_del,
    fecha_firma: c.fecha_de_firma,
    departamento: c.departamento_entidad,
    ciudad: c.ciudad_entidad,
    _raw: { urlproceso: { url: c.urlproceso } },
  }
}

/** Map backend LLM flags to frontend RedFlag format */
function backendFlagsToRedFlags(flags: BackendFlag[]): RedFlag[] {
  return flags.map((f) => ({
    id: `llm-${f.codigo}-${Math.random().toString(36).slice(2, 5)}`,
    category: f.seccion || FLAG_CATEGORY[f.codigo] || 'LLM',
    severity: mapSeverity(f.severidad),
    title: f.descripcion?.substring(0, 60) ?? f.codigo.replace(/_/g, ' '),
    description: f.descripcion,
    evidence: f.fragmento_vulnerable,
  }))
}

/** Small inline badge showing there are flag(s) for a specific field */
function FieldFlagBadge({
  fieldKey,
  allFlags,
  evalResult,
  onClick,
}: {
  fieldKey: string
  allFlags: RedFlag[]
  evalResult: BackendEvalResult | null
  onClick?: () => void
}) {
  // Code-based flags for this field
  const expectedCodes = FLAG_FIELDS_MAP[fieldKey] ?? []
  const codeFlags = allFlags.filter((f) => expectedCodes.includes(f.id))

  // LLM fragmentos mentioning this field (fuzzy)
  const fragmentFlags =
    evalResult?.fragmentos_opacidad?.filter((fr) => {
      const campo = (fr.campo ?? '').toLowerCase().replace(/_/g, ' ')
      const key = fieldKey.toLowerCase().replace(/_/g, ' ')
      return campo.includes(key) || key.split(' ').some((w) => w.length > 3 && campo.includes(w))
    }) ?? []

  const total = codeFlags.length + fragmentFlags.length
  if (total === 0) return null

  const maxSev: AlertSeverity = codeFlags.some((f) => f.severity === 'critical')
    ? 'critical'
    : codeFlags.some((f) => f.severity === 'danger') || fragmentFlags.some((f) => f.severidad === 'ALTA' || f.severidad === 'CRITICA')
    ? 'danger'
    : 'warning'

  return (
    <button
      onClick={onClick}
      className={cn(
        'ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold cursor-pointer',
        maxSev === 'critical' && 'bg-risk-critico/20 text-risk-critico',
        maxSev === 'danger' && 'bg-risk-alto/20 text-risk-alto',
        maxSev === 'warning' && 'bg-risk-medio/20 text-risk-medio',
      )}
      title={`${total} alerta(s) en este campo`}
    >
      !
    </button>
  )
}

/** Collapsible section for raw key-value data */
function DataSection({
  title,
  icon,
  data,
  defaultOpen = false,
}: {
  title: string
  icon: React.ReactNode
  data: Record<string, unknown>
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const entries = Object.entries(data).filter(
    ([, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object',
  )
  if (entries.length === 0) return null
  return (
    <Card className="mt-4">
      <button
        className="flex w-full items-center justify-between p-4 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
          <Badge variant="secondary" className="text-xs">{entries.length} campos</Badge>
        </CardTitle>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <CardContent className="pt-0">
          <div className="grid gap-1.5 md:grid-cols-2">
            {entries.map(([k, v]) => (
              <div key={k} className="flex gap-2 rounded bg-muted/30 px-2 py-1.5 text-xs">
                <span className="min-w-0 shrink-0 font-medium text-muted-foreground">
                  {k.replace(/_/g, ' ')}:
                </span>
                <span className="min-w-0 truncate" title={String(v)}>
                  {String(v)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

export function ContractViewer({ contract }: ContractViewerProps) {
  const [selectedFlag, setSelectedFlag] = useState<RedFlag | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'detail' | 'dashboard'>('detail')
  const textRefs = useRef<Map<string, HTMLElement>>(new Map())

  // LLM evaluation state
  const [evalResult, setEvalResult] = useState<BackendEvalResult | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)

  // Live SECOP data state
  const [liveData, setLiveData] = useState<BackendLiveData | null>(null)
  const [isLoadingLive, setIsLoadingLive] = useState(false)

  const { riskAnalysis } = contract

  // Resolved process URL: prefer liveData (dual-API lookup), fallback to contract field.
  // Never expose the SECOP login-page placeholder.
  const effectiveUrl = (
    liveData?.resumen?.url_proceso
    || (contract.urlproceso !== SECOP_LOGIN_URL ? contract.urlproceso || null : null)
  ) ?? null

  // Merged flags: initial code flags + LLM flags (deduplicated by id)
  const allFlags = useMemo<RedFlag[]>(() => {
    if (!evalResult) return riskAnalysis.flags
    const llm = backendFlagsToRedFlags(evalResult.flags_llm ?? [])
    const existingIds = new Set(riskAnalysis.flags.map((f) => f.id))
    const dedupedLlm = llm.filter((f) => !existingIds.has(f.id))
    return [...riskAnalysis.flags, ...dedupedLlm]
  }, [riskAnalysis.flags, evalResult])

  // Fetch LLM evaluation and live data when the contract changes
  useEffect(() => {
    let cancelled = false
    const id = contract.id_del_proceso || contract.id

    // 1. LLM evaluation
    setIsEvaluating(true)
    evaluateContract(toBackendPayload(contract))
      .then((result) => { if (!cancelled) { setEvalResult(result); setIsEvaluating(false) } })
      .catch(() => { if (!cancelled) setIsEvaluating(false) })

    // 2. Live data from SECOP APIs
    if (id) {
      setIsLoadingLive(true)
      fetchContractLiveData(id)
        .then((data) => { if (!cancelled) { setLiveData(data); setIsLoadingLive(false) } })
        .catch(() => { if (!cancelled) setIsLoadingLive(false) })
    }

    return () => { cancelled = true }
  }, [contract.id])

  const handleFlagClick = (flag: RedFlag) => {
    setSelectedFlag(flag)
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
    <div className="flex h-full min-h-0 items-start">
      {/* Main Content */}
      <div className={cn('min-w-0 flex-1 overflow-auto p-4 lg:p-6', !sidebarCollapsed && 'lg:pr-8')}>
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
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      {allFlags.length} alertas detectadas
                      {isEvaluating && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> Analizando con IA...
                        </span>
                      )}
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
                      {contract.estado_contrato || contract.estado_del_procedimiento || 'Estado desconocido'}
                    </Badge>
                  </div>
                </div>

                {/* Process URL — auto-loaded from dual-API lookup, never shows login placeholder */}
                {(effectiveUrl || isLoadingLive) && (
                  <div className="flex flex-col gap-1">
                    {isLoadingLive && !effectiveUrl && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Obteniendo URL del proceso...
                      </span>
                    )}
                    {effectiveUrl && (
                      <a
                        href={effectiveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary underline-offset-2 hover:underline break-all"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        {effectiveUrl}
                      </a>
                    )}
                  </div>
                )}

              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── View tabs ─────────────────────────────────────── */}
        <div className="mb-4 flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
          <button
            onClick={() => setActiveTab('detail')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              activeTab === 'detail'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <FileSearch className="h-3.5 w-3.5" />
            Detalle
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              activeTab === 'dashboard'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Dashboard
            {allFlags.length > 0 && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                {allFlags.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Dashboard panel ───────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <ContractDashboard contract={contract} allFlags={allFlags} />
        )}

        {/* ── Detail panels (hidden when dashboard is active) ── */}
        {activeTab === 'detail' && (
        <div className="space-y-6">

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
                  <FieldFlagBadge
                    fieldKey="contratista"
                    allFlags={allFlags}
                    evalResult={evalResult}
                    onClick={() => { const f = allFlags.find((f) => f.category === 'Contratista'); if (f) handleFlagClick(f) }}
                  />
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
                  <span className="flex items-center text-sm text-muted-foreground">
                    Valor del contrato
                    <FieldFlagBadge fieldKey="valor" allFlags={allFlags} evalResult={evalResult} onClick={() => { const f = allFlags.find((f) => ['VALOR_ALTO_DIRECTO','VALOR_CERO'].includes(f.id)); if (f) handleFlagClick(f) }} />
                  </span>
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
                  <span className="flex items-center text-sm text-muted-foreground">
                    Modalidad
                    <FieldFlagBadge fieldKey="modalidad" allFlags={allFlags} evalResult={evalResult} onClick={() => { const f = allFlags.find((f) => ['CONTRATACION_DIRECTA','JUSTIFICACION_DEBIL','VALOR_ALTO_DIRECTO'].includes(f.id)); if (f) handleFlagClick(f) }} />
                  </span>
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
                  <span className="flex items-center text-sm text-muted-foreground">
                    Plazo
                    <FieldFlagBadge fieldKey="duracion" allFlags={allFlags} evalResult={evalResult} onClick={() => { const f = allFlags.find((f) => ['DURACION_EXCESIVA','FECHA_URGENTE'].includes(f.id)); if (f) handleFlagClick(f) }} />
                  </span>
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

        {/* Proveedores / Respuestas row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.28 }}
          className="mt-6"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Participación y Competencia</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="flex items-center text-xs text-muted-foreground">
                  Proveedores invitados
                  <FieldFlagBadge fieldKey="proveedores_invitados" allFlags={allFlags} evalResult={evalResult} onClick={() => { const f = allFlags.find((f) => ['PROVEEDOR_UNICO','SIN_COMPETENCIA_SISTEMATICA'].includes(f.id)); if (f) handleFlagClick(f) }} />
                </p>
                <p className="font-semibold">{contract.proveedores_invitados || '—'}</p>
              </div>
              <div>
                <p className="flex items-center text-xs text-muted-foreground">
                  Respuestas
                  <FieldFlagBadge fieldKey="respuestas" allFlags={allFlags} evalResult={evalResult} onClick={() => { const f = allFlags.find((f) => ['SIN_RESPUESTAS','SIN_COMPETENCIA_SISTEMATICA'].includes(f.id)); if (f) handleFlagClick(f) }} />
                </p>
                <p className="font-semibold">{contract.respuestas_al_procedimiento || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fase</p>
                <p className="font-semibold">{contract.fase || '—'}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contract Object */}
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
                <FieldFlagBadge fieldKey="objeto" allFlags={allFlags} evalResult={evalResult} onClick={() => { const f = allFlags.find((f) => f.id === 'DESCRIPCION_VAGA'); if (f) handleFlagClick(f) }} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/30 p-4">
                <HighlightedText
                  text={contract.objeto_del_contrato || contract.descripci_n_del_procedimiento || 'Sin objeto definido'}
                  flags={allFlags}
                  highlights={riskAnalysis.highlights}
                  selectedFlag={selectedFlag}
                  onHighlightRef={setTextRef}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Justificación de Modalidad */}
        {contract.justificaci_n_modalidad_de && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.32 }}
            className="mt-6"
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Justificación de Modalidad
                  <FieldFlagBadge fieldKey="justificacion" allFlags={allFlags} evalResult={evalResult} onClick={() => { const f = allFlags.find((f) => f.id === 'JUSTIFICACION_DEBIL'); if (f) handleFlagClick(f) }} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <HighlightedText
                    text={contract.justificaci_n_modalidad_de}
                    flags={allFlags}
                    highlights={riskAnalysis.highlights}
                    selectedFlag={selectedFlag}
                    onHighlightRef={setTextRef}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Descripción del Procedimiento (if different from objeto) */}
        {contract.descripci_n_del_procedimiento &&
          contract.descripci_n_del_procedimiento !== contract.objeto_del_contrato && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.34 }}
            className="mt-6"
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Descripción del Procedimiento
                  <FieldFlagBadge fieldKey="objeto" allFlags={allFlags} evalResult={evalResult} onClick={() => { const f = allFlags.find((f) => f.id === 'DESCRIPCION_VAGA'); if (f) handleFlagClick(f) }} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <HighlightedText
                    text={contract.descripci_n_del_procedimiento}
                    flags={allFlags}
                    highlights={riskAnalysis.highlights}
                    selectedFlag={selectedFlag}
                    onHighlightRef={setTextRef}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Flag Evidence Cards */}
        {allFlags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.35 }}
            className="mt-6"
          >
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-risk-critico/20 text-xs font-bold text-risk-critico">
                {allFlags.length}
              </span>
              Alertas Detectadas
              {isEvaluating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </h3>
            <div className="grid gap-4 lg:grid-cols-2">
              {allFlags.map((flag, index) => (
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
                              flag.severity === 'info' && 'bg-blue-500/20 !text-blue-500',
                              flag.severity === 'warning' && 'bg-risk-medio/20 !text-risk-medio',
                              flag.severity === 'danger' && 'bg-risk-alto/20 !text-risk-alto',
                              flag.severity === 'critical' && 'bg-risk-critico/20 !text-risk-critico'
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
                          <p className="text-xs font-mono text-muted-foreground">{flag.evidence}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Live data from SECOP */}
        {(isLoadingLive || liveData) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="mt-6"
          >
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Database className="h-5 w-5" />
              Datos Completos del Proceso SECOP
              {isLoadingLive && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </h3>

            {liveData && (
              <>
                {/* Alertas del proceso */}
                {liveData.alertas && liveData.alertas.length > 0 && (
                  <Card className="mb-4 border-risk-medio">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm text-risk-medio">
                        <AlertTriangle className="h-4 w-4" />
                        Alertas del proceso ({liveData.alertas.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {liveData.alertas.map((a: string, i: number) => (
                        <Badge key={i} variant="outline" className="border-risk-medio text-risk-medio text-xs">
                          {a}
                        </Badge>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Resumen */}
                {liveData.resumen && (
                  <DataSection
                    title="Resumen del Proceso"
                    icon={<Zap className="h-4 w-4" />}
                    data={liveData.resumen as Record<string, unknown>}
                    defaultOpen
                  />
                )}

                {/* Detalle completo – open by default so all data is visible without clicking */}
                {liveData.detalle && (
                  <DataSection
                    title="Datos Completos (todas las fuentes SECOP)"
                    icon={<Database className="h-4 w-4" />}
                    data={liveData.detalle as Record<string, unknown>}
                    defaultOpen
                  />
                )}
              </>
            )}
          </motion.div>
        )}
        </div>
        )}

      </div>

      {/* Alerts Sidebar */}
      <AlertsSidebar
        flags={allFlags}
        selectedFlag={selectedFlag}
        onFlagClick={handleFlagClick}
        collapsed={sidebarCollapsed}
        onCollapseChange={setSidebarCollapsed}
      />
    </div>
  )
}

