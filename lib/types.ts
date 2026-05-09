// SECOP II Contract Types - Based on datos.gov.co/resource/p6dx-8zbt
export interface SecopContract {
  id: string
  // Entidad
  entidad: string
  nombre_entidad: string
  nit_entidad: string
  departamento_entidad: string
  ciudad_entidad: string
  ordenentidad: string
  // Proceso
  id_del_proceso: string
  referencia_del_proceso: string
  ppi: string
  id_del_portafolio: string
  nombre_del_procedimiento: string
  descripci_n_del_procedimiento: string
  objeto_del_contrato?: string // alias for descripci_n_del_procedimiento
  // Fechas
  fase: string
  fecha_de_publicacion_del: string
  fecha_de_ultima_publicaci: string
  fecha_de_publicacion_fase_3: string
  // Valores
  precio_base: string
  valor_del_contrato: string
  valor_total_adjudicacion: string
  cuantia_contrato?: string
  cuantia_proceso?: string
  // Modalidad
  modalidad_de_contratacion: string
  justificaci_n_modalidad_de: string
  // Duracion
  duracion: string
  unidad_de_duracion: string
  // Ubicacion
  ciudad_de_la_unidad_de: string
  nombre_de_la_unidad_de: string
  // Proveedores
  proveedores_invitados: string
  proveedores_con_invitacion: string
  proveedores_que_manifestaron: string
  respuestas_al_procedimiento: string
  respuestas_externas: string
  conteo_de_respuestas_a_ofertas: string
  proveedores_unicos_con: string
  numero_de_lotes: string
  // Estado
  estado_del_procedimiento: string
  id_estado_del_procedimiento: string
  adjudicado: string
  id_adjudicacion: string
  estado_contrato?: string
  // Proveedor adjudicado
  codigoproveedor: string
  departamento_proveedor: string
  ciudad_proveedor: string
  nombre_del_adjudicador: string
  nombre_del_proveedor: string
  nombre_del_contratista?: string
  nit_del_contratista?: string
  // URLs
  urlproceso: string
  id_contrato?: string
  numero_del_contrato?: string
  [key: string]: string | undefined
}

// Risk Analysis Types
export type RiskLevel = 'bajo' | 'medio' | 'alto' | 'critico'
export type AlertSeverity = 'info' | 'warning' | 'danger' | 'critical'

export interface RedFlag {
  id: string
  category: string
  severity: AlertSeverity
  title: string
  description: string
  evidence?: string
  position?: { start: number; end: number }
}

export interface RiskAnalysis {
  score: number // 0-100
  level: RiskLevel
  flags: RedFlag[]
  highlights: TextHighlight[]
}

export interface TextHighlight {
  text: string
  severity: AlertSeverity
  flagId: string
  start: number
  end: number
}

export interface ContractWithRisk extends SecopContract {
  riskAnalysis: RiskAnalysis
}

// Entity Context for Risk Calculation
export interface EntityContext {
  nitEntidad: string
  totalContracts: number
  averageContractValue: number
  contractorFrequency: Record<string, number>
  contracts: SecopContract[]
}

// UI State Types
export type ViewMode = 'dashboard' | 'contract-list' | 'contract-detail' | 'exploratory' | 'comparison' | 'entity-list' | 'count' | 'query-result'

export interface DynamicUIState {
  viewMode: ViewMode
  data: unknown
  isLoading: boolean
  error?: string
}

// Chat Tool Response Types
export interface ToolResponse {
  uiType: ViewMode
  data: unknown
  message?: string
}

// Stats Types
export interface DashboardStats {
  totalContracts: number
  totalValue: number
  avgRiskScore: number
  highRiskCount: number
  entitiesCount: number
  topEntities: { name: string; count: number; avgRisk: number }[]
  riskDistribution: { level: RiskLevel; count: number }[]
  contractsByMonth: { month: string; count: number; value: number }[]
}

// Filter Types
export interface ContractFilters {
  entidad?: string
  modalidad?: string
  riskLevel?: RiskLevel
  dateFrom?: string
  dateTo?: string
  minValue?: number
  maxValue?: number
  search?: string
}
