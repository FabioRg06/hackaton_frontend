import { createOpenAI } from '@ai-sdk/openai'
import { streamText, tool } from 'ai'
import { z } from 'zod'
import { executeSecopQuery, searchContracts, getContractCount, getUniqueEntities } from '@/lib/secop'
import { analyzeContract } from '@/lib/risk-analyzer'

// Fields exposed to the LLM as context about the SECOP dataset
const SECOP_SCHEMA_HINT = `
Campos disponibles en p6dx-8zbt (SECOP II):
  entidad, nit_entidad, departamento_entidad, ciudad_entidad,
  id_del_proceso, referencia_del_proceso, nombre_del_procedimiento,
  descripci_n_del_procedimiento, fase, fecha_de_publicacion_del,
  fecha_de_ultima_publicaci, precio_base, valor_total_adjudicacion,
  modalidad_de_contratacion, justificaci_n_modalidad_de,
  duracion, unidad_de_duracion, ciudad_de_la_unidad_de, nombre_de_la_unidad_de,
  proveedores_invitados, proveedores_con_invitacion, proveedores_que_manifestaron,
  respuestas_al_procedimiento, conteo_de_respuestas_a_ofertas, proveedores_unicos_con,
  numero_de_lotes, estado_del_procedimiento, adjudicado,
  nombre_del_proveedor, nit_del_proveedor_adjudicado, urlproceso.
SoQL operators: $select, $where, $group, $order, $limit, $offset, $q (full-text search).
`

// OpenRouter Configuration
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  compatibility: 'compatible', // forces /v1/chat/completions (OpenRouter does not support the Responses API)
  headers: {
    'HTTP-Referer': 'https://gobiaremaster.local',
    'X-Title': 'GobIA Auditor',
  },
} as any)

// Use the same model as the backend, or fall back to a free-tier model
const CHAT_MODEL = process.env.OPENROUTER_LLM_MODEL ?? 'qwen/qwen3-235b-a22b'

function getPlainTextFromMessage(message: { role?: string; parts?: Array<{ type?: string; text?: string }> }) {
  if (!Array.isArray(message.parts)) return ''

  return message.parts
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text?.trim() ?? '')
    .filter(Boolean)
    .join('\n')
}

function normalizeMessages(messages: Array<{ role?: string; parts?: Array<{ type?: string; text?: string }> }>) {
  return messages
    .filter((message) => message.role === 'user')
    .map((message) => ({
      role: 'user' as const,
      content: getPlainTextFromMessage(message),
    }))
    .filter((message) => message.content)
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    console.log('[chat] Processing message, model:', CHAT_MODEL)

    const modelMessages = normalizeMessages(Array.isArray(messages) ? messages : [])

    const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001/api').replace(/\/$/, '')

    const result = streamText({
      model: openrouter(CHAT_MODEL),
      system: `Eres el Asistente de Auditoria de Contratos Publicos de Colombia (GobIA).
Responde siempre en español.
Tienes acceso a la API SECOP II (${SECOP_SCHEMA_HINT}).
Cuando el usuario pida cualquier análisis, listado, conteo o visualización de contratos, USA la herramienta consultar_secop con los parámetros SoQL adecuados.
Cuando el usuario pida contratos de mayor riesgo, alto riesgo, mas alertas, o similares Y la base interna esté disponible, USA contratos_alto_riesgo; si no, USA consultar_secop con $order por precio_base DESC.
Cuando pidan una gráfica o visualización específica, USA la herramienta generar_grafica (primero obtén datos con consultar_secop si es necesario).
Cuando el usuario pida: análisis general, qué análisis hay disponibles, informe general, diagnóstico, resumen del sistema, estadísticas globales, panorama general — USA la herramienta analizar_sistema. Incluye tus observaciones clave como insights.
Cuando el usuario pida entidades con más alertas, entidades con más red flags, entidades de mayor riesgo, ranking de entidades por riesgo, o similares — USA la herramienta listar_entidades_alertas.
Siempre devuelve el resultado con la herramienta; NO inventes datos.`,
      messages: modelMessages,
      maxSteps: 5,
      tools: {
        contar_contratos: tool({
          description: 'Obtener el número total de contratos electrónicos registrados en SECOP II.',
          parameters: z.object({}),
          execute: async () => {
            console.log('[chat] Tool: contar_contratos called')
            const count = await getContractCount()
            return {
              type: 'count',
              total: count,
            }
          },
        } as any),
        buscar_contratos: tool({
          description: 'Buscar contratos específicos en SECOP II por palabra clave o entidad. NO usar para buscar contratos de alto riesgo.',
          parameters: z.object({
            search: z.string().describe('Término de búsqueda o nombre de entidad'),
          }),
          execute: async ({ search = '' }: { search?: string }) => {
            console.log('[chat] Tool: buscar_contratos called with:', search)
            const contracts = await searchContracts({ search })
            return {
              type: 'contract-list',
              contracts: contracts.map(c => ({ ...c, riskAnalysis: analyzeContract(c) })),
              count: contracts.length,
            }
          },
        } as any),
        contratos_alto_riesgo: tool({
          description: 'Obtener los contratos con mayor riesgo o más alertas de la base de datos evaluada. Usar cuando el usuario pida contratos de mayor riesgo, alto riesgo, más alertas, contratos peligrosos, o similares.',
          parameters: z.object({
            nivelRiesgo: z.enum(['ALTO', 'CRITICO', 'MEDIO', '']).optional().describe('Filtrar por nivel de riesgo: ALTO, CRITICO, MEDIO. Dejar vacío para todos.'),
            limit: z.number().optional().describe('Número de contratos a retornar (máx 50). Por defecto 20.'),
          }),
          execute: async ({ nivelRiesgo, limit = 20 }: { nivelRiesgo?: string; limit?: number }) => {
            console.log('[chat] Tool: contratos_alto_riesgo called, nivelRiesgo:', nivelRiesgo, 'limit:', limit)
            const qs = new URLSearchParams({
              limit: String(Math.min(limit, 50)),
              offset: '0',
              orderBy: 'score',
              ...(nivelRiesgo ? { nivelRiesgo } : {}),
            })
            const res = await fetch(`${BACKEND_URL}/contratos?${qs}`)
            if (!res.ok) throw new Error(`Backend error ${res.status}`)
            const data = await res.json()
            const contratos = (data.contratos ?? []).map((c: any) => {
              const evaluacion = Array.isArray(c.evaluacion) ? c.evaluacion[0] : c.evaluacion
              const hallazgos: any[] = Array.isArray(c.opacidad_hallazgo) ? c.opacidad_hallazgo : []
              const flagCount = hallazgos.length
              const flagCritico = hallazgos.filter((h: any) => h.severidad === 'CRITICA').length
              const flagAlto = hallazgos.filter((h: any) => h.severidad === 'ALTA').length
              return {
                id: c.id,
                secop_id: c.secop_id,
                objeto: c.objeto,
                valor_inicial: c.valor_inicial,
                fecha_firma: c.fecha_firma,
                modalidad: c.modalidad_contratacion,
                entidad: c.entidad?.nombre,
                nivel_riesgo: evaluacion?.nivel_riesgo ?? 'N/A',
                score: evaluacion?.score_final ?? 0,
                total_alertas: flagCount,
                alertas_criticas: flagCritico,
                alertas_altas: flagAlto,
                url_proceso: c.url_proceso,
              }
            })
            return {
              type: 'high-risk-contract-list',
              contratos,
              total: data.total ?? contratos.length,
            }
          },
        } as any),
        consultar_secop: tool({
          description: `Consultar CUALQUIER dato de SECOP II usando parámetros SoQL.
Usa este tool para: listas de contratos, conteos, rankings, filtros por entidad/modalidad/valor/fecha, contratos por proveedor, etc.
Ejemplos de params:
 - 5 contratos de mayor valor: {select:"*", order:"precio_base DESC", limit:5}
 - contratos de Bogotá: {where:"ciudad_entidad='Bogotá'", limit:20}
 - conteo por modalidad: {select:"modalidad_de_contratacion,count(*) as total", group:"modalidad_de_contratacion", order:"total DESC"}
 - buscar texto libre: {q:"consultoría ambiental", limit:10}`,
          parameters: z.object({
            select: z.string().optional().describe('$select SoQL. Ej: "entidad,precio_base" o "modalidad_de_contratacion,count(*) as total"'),
            where: z.string().optional().describe('$where SoQL. Ej: "precio_base > 500000000"'),
            group: z.string().optional().describe('$group SoQL para agregaciones. Ej: "modalidad_de_contratacion"'),
            order: z.string().optional().describe('$order SoQL. Ej: "precio_base DESC"'),
            limit: z.number().optional().describe('Número de resultados (máx 100). Default 20.'),
            offset: z.number().optional().describe('Offset de paginación.'),
            q: z.string().optional().describe('Búsqueda full-text libre.'),
            label: z.string().optional().describe('Título descriptivo para mostrar en la interfaz. Ej: "5 contratos con mayor valor"'),
          }),
          execute: async ({ select, where, group, order, limit = 20, offset = 0, q, label }: {
            select?: string; where?: string; group?: string; order?: string
            limit?: number; offset?: number; q?: string; label?: string
          }) => {
            console.log('[chat] Tool: consultar_secop', { select, where, group, order, limit })
            const params: Record<string, string> = {
              $limit: String(Math.min(limit, 100)),
              $offset: String(offset),
            }
            if (select) params.$select = select
            if (where) params.$where = where
            if (group) params.$group = group
            if (order) params.$order = order
            if (q) params.$q = q

            const result = await executeSecopQuery(params)
            if (result.error) throw new Error(result.error)

            // Determine if it's contract data (has entidad/proceso fields) or aggregate/chart data
            const isContractData = result.data.length > 0 &&
              (result.data[0].entidad || result.data[0].id_del_proceso || result.data[0].urlproceso)

            return {
              type: isContractData ? 'secop-full-list' : 'secop-table',
              data: result.data,
              count: result.count ?? result.data.length,
              label: label ?? `Resultados SECOP (${result.count ?? result.data.length} registros)`,
            }
          },
        } as any),
        generar_grafica: tool({
          description: `Generar una gráfica visual (barra, línea o pastel) con datos de SECOP II.
Primero obtén los datos con consultar_secop y luego llama a esta herramienta con los datos ya procesados.
Usa para: distribución por modalidad, contratos por mes, top entidades por valor, etc.`,
          parameters: z.object({
            chartType: z.enum(['bar', 'line', 'pie']).describe('Tipo de gráfica'),
            title: z.string().describe('Título de la gráfica'),
            xKey: z.string().describe('Nombre del campo para el eje X o las etiquetas del pastel'),
            yKey: z.string().describe('Nombre del campo numérico para el eje Y o el valor del pastel'),
            data: z.array(z.record(z.string(), z.any())).describe('Array de objetos con los datos a graficar'),
            color: z.string().optional().describe('Color en hex o nombre (opcional)'),
            yLabel: z.string().optional().describe('Etiqueta del eje Y'),
          }),
          execute: async ({ chartType, title, xKey, yKey, data, color, yLabel }: {
            chartType: 'bar' | 'line' | 'pie'; title: string; xKey: string; yKey: string
            data: Record<string, any>[]; color?: string; yLabel?: string
          }) => {
            return {
              type: 'secop-chart',
              chartType,
              title,
              xKey,
              yKey,
              data,
              color: color ?? '#2563eb',
              yLabel,
            }
          },
        } as any),
        listar_entidades_alertas: tool({
          description: 'Obtener las entidades públicas con más alertas o red flags en sus contratos evaluados. Usar cuando el usuario pida: entidades con más alertas, entidades de mayor riesgo, ranking de entidades por riesgo, cuáles entidades tienen más problemas, o similares.',
          parameters: z.object({
            limit: z.number().optional().describe('Número de entidades a retornar (máx 30). Por defecto 20.'),
          }),
          execute: async ({ limit = 20 }: { limit?: number }) => {
            console.log('[chat] Tool: listar_entidades_alertas called, limit:', limit)
            const qs = new URLSearchParams({ limit: '100', offset: '0', orderBy: 'score' })
            const res = await fetch(`${BACKEND_URL}/contratos?${qs}`)
            if (!res.ok) throw new Error(`Backend error ${res.status}`)
            const data = await res.json()

            // Group by entity, accumulate alert counts
            const byEntity = new Map<string, {
              nit: string; name: string; total_contratos: number;
              total_alertas: number; alertas_criticas: number; alertas_altas: number; max_score: number
            }>()

            for (const c of data.contratos ?? []) {
              const nit = c.entidad?.nit ?? 'unknown'
              const name = c.entidad?.nombre ?? 'Entidad desconocida'
              const evaluacion = Array.isArray(c.evaluacion) ? c.evaluacion[0] : c.evaluacion
              const hallazgos: any[] = Array.isArray(c.opacidad_hallazgo) ? c.opacidad_hallazgo : []
              const score = evaluacion?.score_final ?? 0
              const criticas = hallazgos.filter((h: any) => h.severidad === 'CRITICA').length
              const altas = hallazgos.filter((h: any) => h.severidad === 'ALTA').length
              const existing = byEntity.get(nit)
              if (existing) {
                existing.total_contratos++
                existing.total_alertas += hallazgos.length
                existing.alertas_criticas += criticas
                existing.alertas_altas += altas
                existing.max_score = Math.max(existing.max_score, score)
              } else {
                byEntity.set(nit, { nit, name, total_contratos: 1, total_alertas: hallazgos.length, alertas_criticas: criticas, alertas_altas: altas, max_score: score })
              }
            }

            const entities = Array.from(byEntity.values())
              .sort((a, b) => b.total_alertas - a.total_alertas || b.max_score - a.max_score)
              .slice(0, Math.min(limit, 30))
              .map(e => ({ name: e.name, nit: e.nit, count: e.total_contratos, total_alertas: e.total_alertas, alertas_criticas: e.alertas_criticas, alertas_altas: e.alertas_altas, max_score: e.max_score }))

            return { type: 'entity-list', entities }
          },
        } as any),
        analizar_sistema: tool({
          description: `Generar un informe de análisis completo y profesional del sistema SECOP II con estadísticas, gráficas y observaciones.
Usar cuando el usuario pida: análisis general, qué análisis se puede obtener, informe general, diagnóstico, estadísticas del sistema, panorama general, resumen ejecutivo, o cualquier petición amplia de análisis sin filtros específicos.`,
          parameters: z.object({
            titulo: z.string().optional().describe('Título del informe'),
            insights: z.array(z.string()).optional().describe('3 a 5 observaciones clave que el asistente identifica sobre los datos'),
          }),
          execute: async ({ titulo, insights = [] }: { titulo?: string; insights?: string[] }) => {
            console.log('[chat] Tool: analizar_sistema called')
            const [modalidades, departamentos, estados, anual] = await Promise.allSettled([
              executeSecopQuery({
                $select: 'modalidad_de_contratacion,count(*) as total',
                $group: 'modalidad_de_contratacion',
                $order: 'total DESC',
                $limit: '10',
              }),
              executeSecopQuery({
                $select: 'departamento_entidad,count(*) as total',
                $group: 'departamento_entidad',
                $order: 'total DESC',
                $limit: '12',
              }),
              executeSecopQuery({
                $select: 'estado_del_procedimiento,count(*) as total',
                $group: 'estado_del_procedimiento',
                $order: 'total DESC',
                $limit: '8',
              }),
              executeSecopQuery({
                $select: 'date_trunc_ym(fecha_de_publicacion_del) as mes,count(*) as total',
                $group: 'mes',
                $order: 'mes ASC',
                $limit: '24',
              }),
            ])
            const totalResult = await executeSecopQuery({ $select: 'count(*) as total', $limit: '1' })
            const total = Number(totalResult.data?.[0]?.total ?? 0)

            return {
              type: 'analysis-report',
              title: titulo ?? 'Análisis de Contratación Pública — SECOP II',
              total,
              charts: [
                {
                  chartType: 'pie',
                  title: 'Distribución por Modalidad de Contratación',
                  data: modalidades.status === 'fulfilled' ? (modalidades.value.data ?? []) : [],
                  xKey: 'modalidad_de_contratacion',
                  yKey: 'total',
                },
                {
                  chartType: 'bar',
                  title: 'Top Departamentos por Número de Contratos',
                  data: departamentos.status === 'fulfilled' ? (departamentos.value.data ?? []) : [],
                  xKey: 'departamento_entidad',
                  yKey: 'total',
                  yLabel: 'Contratos',
                },
                {
                  chartType: 'bar',
                  title: 'Contratos por Estado del Procedimiento',
                  data: estados.status === 'fulfilled' ? (estados.value.data ?? []) : [],
                  xKey: 'estado_del_procedimiento',
                  yKey: 'total',
                  yLabel: 'Contratos',
                },
                {
                  chartType: 'line',
                  title: 'Evolución Temporal de Publicaciones',
                  data: (anual.status === 'fulfilled' ? (anual.value.data ?? []) : [])
                    .filter((r: any) => r.mes),
                  xKey: 'mes',
                  yKey: 'total',
                  yLabel: 'Contratos',
                },
              ],
              insights,
            }
          },
        } as any),
      },
    } as any)

    return result.toUIMessageStreamResponse({ originalMessages: messages })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    // Log the full error so it appears in Next.js server logs
    console.error('[chat] API Error:', msg, error)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
