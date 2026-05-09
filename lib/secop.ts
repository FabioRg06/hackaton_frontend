import type { SecopContract, ContractFilters } from './types'

// SECOP II API - Contratos Publicos Colombia
const SECOP_API_BASE = 'https://www.datos.gov.co/resource/p6dx-8zbt.json'

// In-memory cache for performance
const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCacheKey(params: Record<string, string>): string {
  return JSON.stringify(params)
}

function getFromCache<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T
  }
  cache.delete(key)
  return null
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

export async function fetchContracts(
  filters: ContractFilters = {},
  limit = 50,
  offset = 0
): Promise<SecopContract[]> {
  const params: Record<string, string> = {
    $limit: limit.toString(),
    $offset: offset.toString(),
    $order: 'fecha_de_publicacion_del DESC',
  }

  // Build WHERE clause
  const whereConditions: string[] = []

  if (filters.entidad) {
    whereConditions.push(`entidad='${filters.entidad}'`)
  }

  if (filters.modalidad) {
    whereConditions.push(`modalidad_de_contratacion='${filters.modalidad}'`)
  }

  if (filters.dateFrom) {
    whereConditions.push(`fecha_de_publicacion_del>='${filters.dateFrom}'`)
  }

  if (filters.dateTo) {
    whereConditions.push(`fecha_de_publicacion_del<='${filters.dateTo}'`)
  }

  if (whereConditions.length > 0) {
    params.$where = whereConditions.join(' AND ')
  }

  if (filters.search) {
    params.$q = filters.search
  }

  const cacheKey = getCacheKey(params)
  const cached = getFromCache<SecopContract[]>(cacheKey)
  if (cached) return cached

  const queryString = new URLSearchParams(params).toString()
  const url = `${SECOP_API_BASE}?${queryString}`

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // 5 min cache
    })

    if (!response.ok) {
      throw new Error(`SECOP API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Add unique IDs if not present
    const contracts = data.map((contract: any, index: number) => {
      const url = typeof contract.urlproceso === 'object' ? contract.urlproceso.url : contract.urlproceso
      const urlId = url?.includes('noticeUID=') ? url.split('noticeUID=').pop() : null
      
      return {
        ...contract,
        id: contract.id_del_proceso || contract.referencia_del_proceso || urlId || `contract-${offset + index}-${Math.random().toString(36).substr(2, 9)}`,
        nombre_entidad: contract.entidad,
        objeto_del_contrato: contract.descripci_n_del_procedimiento,
        cuantia_contrato: contract.precio_base || contract.valor_total_adjudicacion || '0',
        valor_del_contrato: contract.valor_total_adjudicacion || contract.precio_base || '0',
        fecha_de_firma: contract.fecha_de_publicacion_del,
        nombre_del_contratista: contract.nombre_del_proveedor,
        nit_del_contratista: contract.nit_del_proveedor_adjudicado,
        urlproceso: url,
      }
    })

    setCache(cacheKey, contracts)
    return contracts
  } catch (error) {
    console.error('Error fetching contracts:', error)
    throw error
  }
}

export async function fetchContractById(id: string): Promise<SecopContract | null> {
  // Try to find by URL process ID
  const params = {
    $limit: '1',
    $where: `urlproceso like '%${id}%'`,
  }

  const cacheKey = `contract-${id}`
  const cached = getFromCache<SecopContract>(cacheKey)
  if (cached) return cached

  const queryString = new URLSearchParams(params).toString()
  const url = `${SECOP_API_BASE}?${queryString}`

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch contract')

    const data = await response.json()
    if (data.length === 0) return null

    const contract = { ...data[0], id }
    setCache(cacheKey, contract)
    return contract
  } catch (error) {
    console.error('Error fetching contract:', error)
    return null
  }
}

export async function fetchEntities(limit = 20): Promise<{ name: string; nit: string; count: number }[]> {
  const cacheKey = `entities-${limit}`
  const cached = getFromCache<{ name: string; nit: string; count: number }[]>(cacheKey)
  if (cached) return cached

  // Get contracts and aggregate by entity
  const contracts = await fetchContracts({}, 1000)
  
  const entityMap = new Map<string, { name: string; nit: string; count: number }>()
  
  for (const contract of contracts) {
    const key = contract.nit_entidad
    if (!key) continue
    
    const existing = entityMap.get(key)
    if (existing) {
      existing.count++
    } else {
      entityMap.set(key, {
        name: contract.entidad,
        nit: key,
        count: 1,
      })
    }
  }

  const entities = Array.from(entityMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)

  setCache(cacheKey, entities)
  return entities
}

export async function fetchContractsByEntity(nitEntidad: string, limit = 100): Promise<SecopContract[]> {
  return fetchContracts({ entidad: nitEntidad }, limit)
}

export function parseContractValue(value: string | undefined): number {
  if (!value) return 0
  const cleaned = value.replace(/[^0-9.-]/g, '')
  return parseFloat(cleaned) || 0
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  } catch {
    return dateString
  }
}

// Dynamic query execution for AI chat - supports any SoQL params
export async function executeSecopQuery(params: Record<string, string>): Promise<{
  data: any[]
  count?: number
  error?: string
}> {
  const cacheKey = `query-${getCacheKey(params)}`
  const cached = getFromCache<{ data: any[]; count?: number }>(cacheKey)
  if (cached) return cached

  try {
    const queryString = new URLSearchParams(params).toString()
    const url = `${SECOP_API_BASE}?${queryString}`
    
    console.log('[v0] SECOP Query URL:', url)

    // Use App Token if available in environment (backend)
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    }
    
    // In Next.js, process.env is available on server side
    if (typeof process !== 'undefined' && process.env.SECOP_APP_TOKEN) {
      headers['X-App-Token'] = process.env.SECOP_APP_TOKEN
    }

    const response = await fetch(url, { headers })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[v0] SECOP API Error:', errorText)
      throw new Error(`SECOP API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('[v0] SECOP Response count:', data.length)
    
    // Improved count handling
    let count: number | undefined = undefined
    
    // If it's a simple count(*) query (no grouping or multiple fields)
    const isSimpleCount = params.$select?.toLowerCase().includes('count(*)') && 
                         !params.$group && 
                         !params.$select?.includes(',')

    if (isSimpleCount && data.length > 0) {
      // Socrata returns the count in the first record
      const firstRecord = data[0]
      const countValue = firstRecord.total || firstRecord.count || Object.values(firstRecord)[0]
      count = parseInt(countValue as string, 10)
      
      // If it's just a count, we return it but keep data empty if it's not a list
      return { data: [], count }
    }

    // If it's a list with a count alias in each record (e.g. group by)
    // we keep the data and don't set a global count
    
    // Add IDs to contracts if they look like contracts
    const processedData = data.map((item: any, index: number) => {
      // Check if it looks like a contract/process record
      if (item.entidad || item.id_del_proceso || item.urlproceso) {
        const url = typeof item.urlproceso === 'object' ? item.urlproceso.url : item.urlproceso
        const urlId = url?.includes('noticeUID=') ? url.split('noticeUID=').pop() : null
        
        return {
          ...item,
          id: item.id_del_proceso || item.referencia_del_proceso || urlId || item.id_contrato || item.numero_del_contrato || `item-${index}-${Math.random().toString(36).substr(2, 9)}`,
          nombre_entidad: item.entidad || item.nombre_entidad || 'Entidad no especificada',
          objeto_del_contrato: item.descripci_n_del_procedimiento || item.nombre_del_procedimiento || item.objeto_del_contrato || 'Objeto no definido',
          cuantia_contrato: item.valor_total_adjudicacion || item.precio_base || item.valor_del_contrato || '0',
          valor_del_contrato: item.valor_total_adjudicacion || item.precio_base || item.valor_del_contrato || '0',
          fecha_de_firma: item.fecha_de_publicacion_del || item.fecha_de_firma || item.fecha_de_ultima_publicaci,
          nombre_del_contratista: item.nombre_del_proveedor || item.nombre_del_contratista || 'Sin adjudicar',
          nit_del_contratista: item.nit_del_proveedor_adjudicado || item.nit_del_contratista,
          urlproceso: url,
        }
      }
      return item
    })

    const result = { data: processedData, count }
    setCache(cacheKey, result)
    return result
  } catch (error) {
    console.error('[v0] Error executing SECOP query:', error)
    return { 
      data: [], 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

// Get total count of contracts
export async function getContractCount(): Promise<number> {
  const result = await executeSecopQuery({
    $select: 'count(*) as total',
  })
  return result.count || 0
}

// Get unique entities
export async function getUniqueEntities(limit = 50): Promise<{ nombre_entidad: string; nit_entidad: string; count: number }[]> {
  const result = await executeSecopQuery({
    $select: 'entidad as nombre_entidad, nit_entidad, count(*) as count',
    $group: 'entidad, nit_entidad',
    $order: 'count DESC',
    $limit: limit.toString(),
  })
  
  return result.data.map((d: Record<string, string>) => ({
    nombre_entidad: d.nombre_entidad || 'Sin nombre',
    nit_entidad: d.nit_entidad || 'N/A',
    count: parseInt(d.count || '0', 10),
  }))
}

// Get contracts by various filters with SoQL
export async function searchContracts(options: {
  search?: string
  entidad?: string
  nitEntidad?: string
  modalidad?: string
  estado?: string
  valorMin?: number
  valorMax?: number
  fechaDesde?: string
  fechaHasta?: string
  limit?: number
  offset?: number
  orderBy?: string
}): Promise<SecopContract[]> {
  const params: Record<string, string> = {
    $limit: (options.limit || 50).toString(),
    $offset: (options.offset || 0).toString(),
    $order: options.orderBy || 'fecha_de_firma DESC',
  }

  const whereConditions: string[] = []

  if (options.search) {
    params.$q = options.search
  }

  if (options.entidad) {
    whereConditions.push(`entidad='${options.entidad}'`)
  }

  if (options.nitEntidad) {
    whereConditions.push(`nit_entidad='${options.nitEntidad}'`)
  }

  if (options.modalidad) {
    whereConditions.push(`modalidad_de_contratacion='${options.modalidad}'`)
  }

  if (options.estado) {
    whereConditions.push(`estado_contrato='${options.estado}'`)
  }

  if (options.valorMin) {
    whereConditions.push(`precio_base>=${options.valorMin}`)
  }

  if (options.valorMax) {
    whereConditions.push(`precio_base<=${options.valorMax}`)
  }

  if (options.fechaDesde) {
    whereConditions.push(`fecha_de_publicacion_del>='${options.fechaDesde}'`)
  }

  if (options.fechaHasta) {
    whereConditions.push(`fecha_de_publicacion_del<='${options.fechaHasta}'`)
  }

  if (whereConditions.length > 0) {
    params.$where = whereConditions.join(' AND ')
  }

  const result = await executeSecopQuery(params)
  return result.data
}
