'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  ContractWithRisk,
  ContractFilters,
  DashboardStats,
  RedFlag,
  RiskLevel,
  RiskAnalysis,
} from '@/lib/types'
import {
  fetchContracts,
  fetchEntities,
  mapSeverity,
  FLAG_CATEGORY,
  type BackendContract,
  type BackendFlag,
} from '@/lib/api-client'
import { parseContractValue } from '@/lib/secop'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: backend → frontend format
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_WEIGHT: Record<string, number> = { CRITICA: 30, ALTA: 20, MEDIA: 10, BAJA: 5 }

function computeScore(flags: BackendFlag[]): number {
  if (!flags.length) return 0
  return Math.min(100, flags.reduce((s, f) => s + (SEVERITY_WEIGHT[f.severidad] ?? 5), 0))
}

function computeLevel(flags: BackendFlag[]): RiskLevel {
  if (flags.some((f) => f.severidad === 'CRITICA')) return 'critico'
  if (flags.some((f) => f.severidad === 'ALTA')) return 'alto'
  if (flags.some((f) => f.severidad === 'MEDIA')) return 'medio'
  return 'bajo'
}

function mapFlags(flags: BackendFlag[]): RedFlag[] {
  return flags.map((f) => ({
    id: f.codigo,
    category: FLAG_CATEGORY[f.codigo] ?? 'General',
    severity: mapSeverity(f.severidad),
    title: f.codigo.replace(/_/g, ' '),
    description: f.descripcion,
    evidence: f.fragmento_vulnerable,
  }))
}

export function mapBackendContract(c: BackendContract): ContractWithRisk {
  const raw = (c._raw ?? {}) as Record<string, string>
  const flagsCodigo = c.flags_codigo ?? []
  const riskAnalysis: RiskAnalysis = {
    score: computeScore(flagsCodigo),
    level: computeLevel(flagsCodigo),
    flags: mapFlags(flagsCodigo),
    highlights: [],
  }
  return {
    ...raw,
    id: c.id_proceso ?? `c-${Math.random().toString(36).slice(2)}`,
    entidad: c.nombre_entidad ?? '',
    nombre_entidad: c.nombre_entidad ?? '',
    nit_entidad: c.nit_entidad ?? '',
    departamento_entidad: c.departamento ?? '',
    ciudad_entidad: c.ciudad ?? '',
    ordenentidad: '',
    id_del_proceso: c.id_proceso ?? '',
    referencia_del_proceso: '',
    ppi: '',
    id_del_portafolio: '',
    nombre_del_procedimiento: c.nombre_procedimiento ?? '',
    descripci_n_del_procedimiento: c.descripcion_procedimiento ?? '',
    objeto_del_contrato: c.descripcion_procedimiento ?? c.nombre_procedimiento ?? '',
    fase: c.fase ?? '',
    estado_del_procedimiento: c.estado_procedimiento ?? '',
    id_estado_del_procedimiento: '',
    adjudicado: c.proveedor_adjudicado ? 'Si' : '',
    id_adjudicacion: '',
    fecha_de_publicacion_del: c.fecha_publicacion ?? '',
    fecha_de_ultima_publicaci: '',
    fecha_de_publicacion_fase_3: '',
    fecha_inicio_ejecucion: c.fecha_inicio ?? '',
    fecha_fin_ejecucion: c.fecha_fin ?? '',
    fecha_de_firma: c.fecha_firma ?? '',
    precio_base: String(c.precio_base ?? 0),
    valor_del_contrato: String(c.valor_contrato ?? 0),
    valor_total_adjudicacion: String(c.valor_contrato ?? 0),
    cuantia_contrato: String(c.precio_base || c.valor_contrato || 0),
    modalidad_de_contratacion: c.modalidad_contratacion ?? '',
    justificaci_n_modalidad_de: c.justificacion_modalidad ?? '',
    duracion: c.duracion ?? '',
    unidad_de_duracion: c.unidad_duracion ?? '',
    ciudad_de_la_unidad_de: c.ciudad ?? '',
    nombre_de_la_unidad_de: '',
    proveedores_invitados: String(c.proveedores_invitados ?? ''),
    proveedores_con_invitacion: String(c.proveedores_invitados ?? ''),
    proveedores_que_manifestaron: '',
    respuestas_al_procedimiento: String(c.respuestas ?? ''),
    respuestas_externas: '',
    conteo_de_respuestas_a_ofertas: '',
    proveedores_unicos_con: '',
    numero_de_lotes: '',
    codigoproveedor: c.nit_proveedor ?? '',
    departamento_proveedor: '',
    ciudad_proveedor: '',
    nombre_del_adjudicador: '',
    nombre_del_proveedor: c.proveedor_adjudicado ?? '',
    nombre_del_contratista: c.proveedor_adjudicado ?? '',
    nit_del_contratista: c.nit_proveedor ?? '',
    urlproceso: c.url_proceso ?? '',
    riskAnalysis,
  } as unknown as ContractWithRisk
}

// ─────────────────────────────────────────────────────────────────────────────
// useContractsInfinite — loads PAGE_SIZE contracts at a time from the backend
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50
const EMPTY_CONTRACTS: ContractWithRisk[] = []

export function useContractsInfinite(
  filters: ContractFilters = {},
  pageSize = PAGE_SIZE,
  initialContracts: ContractWithRisk[] = EMPTY_CONTRACTS,
) {
  const [contracts, setContracts] = useState<ContractWithRisk[]>([])
  const [offset, setOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const cancelRef = useRef(false)
  const initialOffset = initialContracts.length
  const filterKey = JSON.stringify({
    entidad: filters.entidad,
    search: filters.search,
    riskLevel: filters.riskLevel,
    initialOffset,
  })

  useEffect(() => {
    cancelRef.current = false
    const seededContracts = filters.riskLevel
      ? initialContracts.filter((contract) => contract.riskAnalysis.level === filters.riskLevel)
      : initialContracts

    setContracts(seededContracts)
    setOffset(initialOffset)
    setHasMore(true)
    setIsLoading(seededContracts.length === 0)
    setError(null)

    if (filters.entidad && initialOffset > 0 && !filters.search && !filters.riskLevel) {
      return () => { cancelRef.current = true }
    }

    fetchContracts({ nit: filters.entidad, limit: pageSize, offset: initialOffset, search: filters.search })
      .then((result) => {
        if (cancelRef.current) return
        const mapped = result.contratos.map(mapBackendContract)
        const filtered = filters.riskLevel
          ? mapped.filter((c) => c.riskAnalysis.level === filters.riskLevel)
          : mapped
        setContracts((prev) => {
          const existingIds = new Set(prev.map((contract) => contract.id))
          return [...prev, ...filtered.filter((contract) => !existingIds.has(contract.id))]
        })
        setOffset(initialOffset + result.contratos.length)
        setHasMore(result.hasMore)
        setIsLoading(false)
      })
      .catch((err: Error) => {
        if (cancelRef.current) return
        console.error('[api] fetchContracts error:', err)
        setError(err)
        setIsLoading(false)
      })

    return () => { cancelRef.current = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, pageSize, filters.entidad, filters.search, filters.riskLevel, initialOffset])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const result = await fetchContracts({
        nit: filters.entidad,
        limit: pageSize,
        offset,
        search: filters.search,
      })
      const mapped = result.contratos.map(mapBackendContract)
      const filtered = filters.riskLevel
        ? mapped.filter((c) => c.riskAnalysis.level === filters.riskLevel)
        : mapped
      setContracts((prev) => {
        const existingIds = new Set(prev.map((c) => c.id))
        return [...prev, ...filtered.filter((c) => !existingIds.has(c.id))]
      })
      setOffset((prev) => prev + result.contratos.length)
      setHasMore(result.hasMore)
    } catch (err) {
      console.error('[api] loadMore error:', err)
    } finally {
      setIsLoadingMore(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingMore, hasMore, filters.entidad, filters.search, filters.riskLevel, pageSize, offset])

  return { contracts, isLoading, isLoadingMore, hasMore, loadMore, error }
}

/** Backward-compat wrapper used by the chat interface */
export function useContracts(filters: ContractFilters = {}, limit = PAGE_SIZE) {
  const result = useContractsInfinite(filters, limit)
  return {
    contracts: result.contracts,
    isLoading: result.isLoading,
    error: result.error,
    mutate: result.loadMore,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useEntitiesInfinite — paginated entity discovery (50 contracts per page)
// ─────────────────────────────────────────────────────────────────────────────

const ENTITY_PAGE_SIZE = 200

export function useEntitiesInfinite() {
  const [entities, setEntities] = useState<{ name: string; nit: string; count: number }[]>([])
  const [entityContractsByNit, setEntityContractsByNit] = useState<Record<string, ContractWithRisk[]>>({})
  const [totalValor, setTotalValor] = useState(0)
  const [offset, setOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Auto-load all entity pages sequentially so the full list is visible on startup.
  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      let currentOffset = 0
      let allEntities: { name: string; nit: string; count: number }[] = []
      let accValor = 0
      let more = true

      setIsLoading(true)

      while (more && !cancelled) {
        try {
          const { entidades, hasMore: morePages } = await fetchEntities(ENTITY_PAGE_SIZE, currentOffset)
          if (cancelled) break
          const mapped = entidades.map((e) => ({ name: e.nombre, nit: e.nit, count: e.total_contratos_muestra }))
          accValor += entidades.reduce((s, e) => s + (e.total_valor ?? 0), 0)
          allEntities = [...allEntities, ...mapped]
          setEntities([...allEntities].sort((a, b) => b.count - a.count))
          setTotalValor(accValor)
          setOffset(currentOffset + ENTITY_PAGE_SIZE)
          currentOffset += ENTITY_PAGE_SIZE
          more = morePages ?? false
          setHasMore(more)
          if (currentOffset === ENTITY_PAGE_SIZE) {
            // First page done — stop showing skeleton
            setIsLoading(false)
          }
        } catch (err) {
          if (!cancelled) {
            console.error('[api] fetchEntities error:', err)
            setError(err as Error)
            setIsLoading(false)
          }
          break
        }
      }

      if (!cancelled) {
        setIsLoading(false)
        setHasMore(false)
      }
    }

    loadAll()
    return () => { cancelled = true }
  }, [])

  const loadMore = useCallback(async () => {
    // loadMore is kept for compatibility but auto-loading handles pagination now.
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const { entidades, hasMore: more } = await fetchEntities(ENTITY_PAGE_SIZE, offset)
      const newEntities = entidades.map((e) => ({ name: e.nombre, nit: e.nit, count: e.total_contratos_muestra }))
      setEntities((prev) => {
        const existingNits = new Set(prev.map((e) => e.nit))
        const unique = newEntities.filter((e) => !existingNits.has(e.nit))
        return [...prev, ...unique].sort((a, b) => b.count - a.count)
      })
      setOffset((prev) => prev + ENTITY_PAGE_SIZE)
      setHasMore(more ?? false)
    } catch (err) {
      console.error('[api] loadMoreEntities error:', err)
    } finally {
      setIsLoadingMore(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingMore, hasMore, offset])

  return { entities, entityContractsByNit, totalValor, isLoading, isLoadingMore, hasMore, loadMore, error }
}

// ─────────────────────────────────────────────────────────────────────────────
// useEntities — fetches unique entities from the backend
// ─────────────────────────────────────────────────────────────────────────────

export function useEntities() {
  const { entities, isLoading, error } = useEntitiesInfinite()
  return { entities, isLoading, error }
}

// ─────────────────────────────────────────────────────────────────────────────
// useDashboardStats — pure computation (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

export function useDashboardStats(contracts: ContractWithRisk[]): DashboardStats {
  if (contracts.length === 0) {
    return {
      totalContracts: 0, totalValue: 0, avgRiskScore: 0, highRiskCount: 0, entitiesCount: 0,
      topEntities: [],
      riskDistribution: [
        { level: 'bajo', count: 0 }, { level: 'medio', count: 0 },
        { level: 'alto', count: 0 }, { level: 'critico', count: 0 },
      ],
      contractsByMonth: [],
    }
  }

  const totalValue = contracts.reduce((sum, c) => sum + parseContractValue(c.cuantia_contrato), 0)
  const avgRiskScore = contracts.reduce((sum, c) => sum + c.riskAnalysis.score, 0) / contracts.length
  const highRiskCount = contracts.filter(
    (c) => c.riskAnalysis.level === 'alto' || c.riskAnalysis.level === 'critico',
  ).length

  const entityMap = new Map<string, { name: string; count: number; totalRisk: number }>()
  for (const c of contracts) {
    const existing = entityMap.get(c.nit_entidad)
    if (existing) { existing.count++; existing.totalRisk += c.riskAnalysis.score }
    else entityMap.set(c.nit_entidad, { name: c.nombre_entidad, count: 1, totalRisk: c.riskAnalysis.score })
  }

  return {
    totalContracts: contracts.length, totalValue, avgRiskScore, highRiskCount,
    entitiesCount: entityMap.size,
    topEntities: Array.from(entityMap.values())
      .map((e) => ({ name: e.name, count: e.count, avgRisk: e.totalRisk / e.count }))
      .sort((a, b) => b.count - a.count).slice(0, 5),
    riskDistribution: [
      { level: 'bajo' as const, count: contracts.filter((c) => c.riskAnalysis.level === 'bajo').length },
      { level: 'medio' as const, count: contracts.filter((c) => c.riskAnalysis.level === 'medio').length },
      { level: 'alto' as const, count: contracts.filter((c) => c.riskAnalysis.level === 'alto').length },
      { level: 'critico' as const, count: contracts.filter((c) => c.riskAnalysis.level === 'critico').length },
    ],
    contractsByMonth: [],
  }
}
