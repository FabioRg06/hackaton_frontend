'use client'

import useSWR from 'swr'
import type { ContractWithRisk, ContractFilters, DashboardStats, SecopContract } from '@/lib/types'
import { analyzeContracts } from '@/lib/risk-analyzer'
import { parseContractValue } from '@/lib/secop'

// SECOP II API - Contratos Publicos Colombia
const SECOP_API_BASE = 'https://www.datos.gov.co/resource/p6dx-8zbt.json'

async function fetchFromSecop(url: string): Promise<SecopContract[]> {
  console.log('[v0] Fetching from SECOP:', url)
  const response = await fetch(url)
  if (!response.ok) {
    console.error('[v0] SECOP fetch failed:', response.status)
    throw new Error('Failed to fetch contracts')
  }
  const data = await response.json()
  console.log('[v0] SECOP returned', data.length, 'contracts')
    return data.map((contract: any, index: number) => {
    const processUrl = typeof contract.urlproceso === 'object' ? contract.urlproceso.url : contract.urlproceso
    const urlId = processUrl?.includes('noticeUID=') ? processUrl.split('noticeUID=').pop() : null
    
    return {
      ...contract,
      id: contract.id_del_proceso || contract.referencia_del_proceso || urlId || `contract-${index}-${Math.random().toString(36).substr(2, 9)}`,
      nombre_entidad: contract.entidad || contract.nombre_entidad || 'Entidad no especificada',
      objeto_del_contrato: contract.descripci_n_del_procedimiento || contract.nombre_del_procedimiento || contract.objeto_del_contrato || 'Objeto no definido',
      cuantia_contrato: contract.valor_total_adjudicacion || contract.precio_base || contract.valor_del_contrato || '0',
      fecha_de_firma: contract.fecha_de_publicacion_del || contract.fecha_de_firma || contract.fecha_de_ultima_publicaci,
      nombre_del_contratista: contract.nombre_del_proveedor || contract.nombre_del_contratista || 'Sin adjudicar',
      nit_del_contratista: contract.nit_del_proveedor_adjudicado || contract.nit_del_contratista,
      urlproceso: processUrl,
    }
  })
}

export function useContracts(filters: ContractFilters = {}, limit = 50) {
  const params = new URLSearchParams({
    $limit: limit.toString(),
    $order: 'fecha_de_publicacion_del DESC',
  })

  const whereConditions: string[] = []

  if (filters.entidad) {
    whereConditions.push(`nit_entidad='${filters.entidad}'`)
  }

  if (filters.search) {
    params.set('$q', filters.search)
  }

  if (whereConditions.length > 0) {
    params.set('$where', whereConditions.join(' AND '))
  }

  const url = `${SECOP_API_BASE}?${params.toString()}`

  const { data, error, isLoading, mutate } = useSWR<SecopContract[]>(url, fetchFromSecop, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  })

  const contractsWithRisk: ContractWithRisk[] = data ? analyzeContracts(data) : []

  // Apply client-side risk level filter
  const filteredContracts = filters.riskLevel
    ? contractsWithRisk.filter((c) => c.riskAnalysis.level === filters.riskLevel)
    : contractsWithRisk

  return {
    contracts: filteredContracts,
    isLoading,
    error,
    mutate,
  }
}

export function useEntities() {
  const url = `${SECOP_API_BASE}?$limit=1000&$order=fecha_de_publicacion_del DESC`

  const { data, error, isLoading } = useSWR<SecopContract[]>(url, fetchFromSecop, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 minutes
  })

  const entities = data
    ? Array.from(
        data.reduce((map, contract) => {
          const nit = contract.nit_entidad
          if (!nit) return map

          const existing = map.get(nit)
          if (existing) {
            existing.count++
          } else {
            map.set(nit, {
              name: contract.entidad,
              nit,
              count: 1,
            })
          }
          return map
        }, new Map<string, { name: string; nit: string; count: number }>())
      )
        .map(([, entity]) => entity)
        .sort((a, b) => b.count - a.count)
        .slice(0, 30)
    : []

  return {
    entities,
    isLoading,
    error,
  }
}

export function useDashboardStats(contracts: ContractWithRisk[]): DashboardStats {
  if (contracts.length === 0) {
    return {
      totalContracts: 0,
      totalValue: 0,
      avgRiskScore: 0,
      highRiskCount: 0,
      entitiesCount: 0,
      topEntities: [],
      riskDistribution: [
        { level: 'bajo', count: 0 },
        { level: 'medio', count: 0 },
        { level: 'alto', count: 0 },
        { level: 'critico', count: 0 },
      ],
      contractsByMonth: [],
    }
  }

  const totalValue = contracts.reduce(
    (sum, c) => sum + parseContractValue(c.cuantia_contrato),
    0
  )

  const avgRiskScore =
    contracts.reduce((sum, c) => sum + c.riskAnalysis.score, 0) / contracts.length

  const highRiskCount = contracts.filter(
    (c) => c.riskAnalysis.level === 'alto' || c.riskAnalysis.level === 'critico'
  ).length

  const entityMap = new Map<string, { name: string; count: number; totalRisk: number }>()
  for (const contract of contracts) {
    const existing = entityMap.get(contract.nit_entidad)
    if (existing) {
      existing.count++
      existing.totalRisk += contract.riskAnalysis.score
    } else {
      entityMap.set(contract.nit_entidad, {
        name: contract.nombre_entidad,
        count: 1,
        totalRisk: contract.riskAnalysis.score,
      })
    }
  }

  const topEntities = Array.from(entityMap.values())
    .map((e) => ({ name: e.name, count: e.count, avgRisk: e.totalRisk / e.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const riskDistribution = [
    { level: 'bajo' as const, count: contracts.filter((c) => c.riskAnalysis.level === 'bajo').length },
    { level: 'medio' as const, count: contracts.filter((c) => c.riskAnalysis.level === 'medio').length },
    { level: 'alto' as const, count: contracts.filter((c) => c.riskAnalysis.level === 'alto').length },
    { level: 'critico' as const, count: contracts.filter((c) => c.riskAnalysis.level === 'critico').length },
  ]

  return {
    totalContracts: contracts.length,
    totalValue,
    avgRiskScore,
    highRiskCount,
    entitiesCount: entityMap.size,
    topEntities,
    riskDistribution,
    contractsByMonth: [],
  }
}
