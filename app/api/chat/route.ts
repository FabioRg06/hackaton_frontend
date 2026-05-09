import { createOpenAI } from '@ai-sdk/openai'
import { streamText, tool, convertToModelMessages, createUIMessageStreamResponse } from 'ai'
import { z } from 'zod'
import { executeSecopQuery, searchContracts, getContractCount, getUniqueEntities } from '@/lib/secop'
import { analyzeContract } from '@/lib/risk-analyzer'

// OpenRouter Configuration
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': 'https://gobiaremaster.local',
    'X-Title': 'GobIA Auditor',
  },
})

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    console.log('[v0] Processing message loop...')
    
    const modelMessages = await convertToModelMessages(messages)

    const result = streamText({
      model: openrouter('openai/gpt-4o-mini'), 
      system: `Eres el Asistente de Auditoria de Contratos Publicos de Colombia (GobIA). 
Responde siempre en español. Usa azul en tus explicaciones si es relevante.`,
      messages: modelMessages,
      maxSteps: 5, // Enable automatic tool calling loop
      tools: {
        contar_contratos: tool({
          description: 'Obtener el número total de contratos electrónicos registrados en SECOP II.',
          parameters: z.object({}),
          execute: async () => {
            console.log('[v0] Tool: contar_contratos called')
            const count = await getContractCount()
            return { total: count }
          },
        }),
        buscar_contratos: tool({
          description: 'Buscar contratos específicos en SECOP II por palabra clave o entidad.',
          parameters: z.object({
            search: z.string().describe('Término de búsqueda o nombre de entidad'),
          }),
          execute: async ({ search }) => {
            console.log('[v0] Tool: buscar_contratos called with:', search)
            const contracts = await searchContracts({ search })
            return {
              contracts: contracts.map(c => ({ ...c, riskAnalysis: analyzeContract(c) })),
              count: contracts.length,
            }
          },
        }),
      },
    })

    // toUIMessageStreamResponse automatically handles the multi-step stream
    return (result as any).toUIMessageStreamResponse({
      originalMessages: messages
    })
  } catch (error) {
    console.error('[v0] Chat API Error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
