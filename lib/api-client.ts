/**
 * api-client.ts
 * Thin client for the GobIA backend at http://localhost:3001/api.
 * Every call goes through the backend so the browser never touches SECOP directly.
 */

const BACKEND_URL =
  (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001/api').replace(/\/$/, '')

// ─────────────────────────────────────────────────────────────────────────────
// Shared types (backend shapes)
// ─────────────────────────────────────────────────────────────────────────────

export interface BackendFlag {
  codigo: string
  descripcion: string
  severidad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  fuente?: string
  /** Only present on LLM flags */
  seccion?: string
  campo_afectado?: string
  fragmento_vulnerable?: string
}

export interface BackendContract {
  id_proceso: string | null
  nombre_procedimiento: string | null
  descripcion_procedimiento: string | null
  modalidad_contratacion: string | null
  justificacion_modalidad: string | null
  tipo_contrato: string | null
  valor_contrato: number
  precio_base: number
  duracion: string | null
  unidad_duracion: string | null
  fecha_publicacion: string | null
  fecha_firma: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  estado_procedimiento: string | null
  fase: string | null
  proveedor_adjudicado: string | null
  nit_proveedor: string | null
  proveedores_invitados: string | null
  respuestas: string | null
  url_proceso: string | null
  nit_entidad: string | null
  nombre_entidad: string | null
  departamento: string | null
  ciudad: string | null
  flags_codigo: BackendFlag[]
  _raw?: Record<string, unknown>
}

export interface BackendEntity {
  nit: string
  nombre: string
  departamento: string | null
  ciudad: string | null
  total_contratos_muestra: number
  total_valor?: number
  contratos?: BackendContract[]
  flags_entidad: BackendFlag[]
  nivel_riesgo: string
}

export interface BackendFragmento {
  campo: string
  fragmento: string
  codigo: string
  severidad: string
  descripcion: string
  seccion: string
}

export interface BackendEvalResult {
  success?: boolean
  flags_codigo: BackendFlag[]
  flags_llm: BackendFlag[]
  flags: BackendFlag[]
  justificacion: string
  nivel: string
  score: number
  fragmentos_opacidad: BackendFragmento[]
}

export interface BackendLiveData {
  resumen: Record<string, unknown> & { url_proceso?: string | null }
  detalle: Record<string, unknown>
  alertas: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Severity / level mappers (used by hook AND contract-viewer)
// ─────────────────────────────────────────────────────────────────────────────

export type AlertSeverityMapped = 'info' | 'warning' | 'danger' | 'critical'
export type RiskLevelMapped = 'bajo' | 'medio' | 'alto' | 'critico'

export function mapSeverity(s: string | undefined): AlertSeverityMapped {
  switch ((s ?? '').toUpperCase()) {
    case 'CRITICA':
      return 'critical'
    case 'ALTA':
      return 'danger'
    case 'MEDIA':
      return 'warning'
    default:
      return 'info'
  }
}

export function mapRiskLevel(nivel: string | undefined): RiskLevelMapped {
  switch ((nivel ?? '').toUpperCase()) {
    case 'CRITICO':
      return 'critico'
    case 'ALTO':
      return 'alto'
    case 'MEDIO':
      return 'medio'
    default:
      return 'bajo'
  }
}

export const FLAG_CATEGORY: Record<string, string> = {
  CONTRATACION_DIRECTA: 'Modalidad',
  PROVEEDOR_UNICO: 'Competencia',
  SIN_RESPUESTAS: 'Competencia',
  VALOR_ALTO_DIRECTO: 'Valor',
  DESCRIPCION_VAGA: 'Objeto',
  SIN_ADJUDICACION: 'Adjudicación',
  JUSTIFICACION_DEBIL: 'Justificación',
  DURACION_EXCESIVA: 'Tiempo',
  VALOR_CERO: 'Valor',
  CONCENTRACION_DIRECTA: 'Modalidad',
  PROVEEDOR_RECURRENTE: 'Contratista',
  SIN_COMPETENCIA_SISTEMATICA: 'Competencia',
  FRAGMENTACION_CONTRATOS: 'Valor',
  CONCENTRACION_TEMPORAL: 'Tiempo',
  FECHA_URGENTE: 'Tiempo',
}

/**
 * Maps flag codes to the field keys they affect in the contract detail view.
 * Used to show flag indicators next to each field.
 */
export const FLAG_FIELDS_MAP: Record<string, string[]> = {
  modalidad: ['CONTRATACION_DIRECTA', 'VALOR_ALTO_DIRECTO', 'JUSTIFICACION_DEBIL'],
  proveedores_invitados: ['PROVEEDOR_UNICO', 'SIN_COMPETENCIA_SISTEMATICA'],
  respuestas: ['SIN_RESPUESTAS', 'SIN_COMPETENCIA_SISTEMATICA'],
  valor: ['VALOR_ALTO_DIRECTO', 'VALOR_CERO'],
  objeto: ['DESCRIPCION_VAGA'],
  contratista: ['PROVEEDOR_RECURRENTE'],
  estado: ['SIN_ADJUDICACION'],
  duracion: ['DURACION_EXCESIVA', 'FECHA_URGENTE'],
  justificacion: ['JUSTIFICACION_DEBIL'],
}

// ─────────────────────────────────────────────────────────────────────────────
// API calls
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchContracts(params: {
  nit?: string
  limit?: number
  offset?: number
  search?: string
}): Promise<{ contratos: BackendContract[]; total: number; hasMore: boolean }> {
  const { nit, limit = 50, offset = 0, search = '' } = params
  const qs = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    ...(search ? { search } : {}),
  })

  // Always use the datos.gov.co-backed endpoints so the response shape is
  // consistent (BackendContract with flags_codigo). The legacy /contratos
  // Supabase endpoint returns a different schema that mapBackendContract
  // cannot handle, producing empty contract cards.
  const url = nit
    ? `${BACKEND_URL}/entidades/${encodeURIComponent(nit)}/contratos?${qs}`
    : `${BACKEND_URL}/entidades/contratos?${qs}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Backend error ${res.status}: ${url}`)
  return res.json()
}

export async function fetchEntities(
  limit = 50,
  offset = 0,
): Promise<{ entidades: BackendEntity[]; total: number; hasMore: boolean }> {
  const res = await fetch(`${BACKEND_URL}/entidades?limit=${limit}&offset=${offset}`)
  if (!res.ok) throw new Error(`Backend error ${res.status}`)
  return res.json()
}

/**
 * Calls POST /api/entidades/contrato/evaluar with the contract in backend format.
 * Returns LLM-enriched flags and fragmentos_opacidad with per-field evidence.
 */
export async function evaluateContract(
  contract: Record<string, unknown>,
): Promise<BackendEvalResult> {
  const res = await fetch(`${BACKEND_URL}/entidades/contrato/evaluar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contract),
  })
  if (!res.ok) throw new Error(`Backend eval error ${res.status}`)
  return res.json()
}

/**
 * Calls GET /api/entidades/contrato/:idProceso/live-data.
 * Returns merged data from 3 SECOP APIs (API A + B + OCDS) plus alert rules.
 */
export async function fetchContractLiveData(idProceso: string): Promise<BackendLiveData> {
  const res = await fetch(
    `${BACKEND_URL}/entidades/contrato/${encodeURIComponent(idProceso)}/live-data`,
  )
  if (!res.ok) throw new Error(`Backend live-data error ${res.status}`)
  return res.json()
}
