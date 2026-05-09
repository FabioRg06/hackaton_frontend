import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  compatibility: 'compatible', // forces /v1/chat/completions (OpenRouter does not support the Responses API)
  headers: {
    'HTTP-Referer': 'https://gobiaremaster.local',
    'X-Title': 'GobIA Auditor',
  },
})

export async function POST(req: Request) {
  try {
    const { flag, contract } = await req.json()

    if (!flag) {
      return new Response(JSON.stringify({ error: 'flag is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const contractContext = contract
      ? `
Contexto del contrato:
- Entidad contratante: ${contract.entidad || contract.nombre_entidad || 'No especificada'}
- Objeto/descripción: ${contract.objeto_del_contrato || contract.descripci_n_del_procedimiento || 'No disponible'}
- Modalidad de contratación: ${contract.modalidad_de_contratacion || contract.modalidad_de_contratacion || 'No especificada'}
- Valor: ${contract.cuantia_contrato || contract.valor_del_contrato || 'No especificado'}
- Contratista: ${contract.nombre_del_contratista || contract.nombre_del_proveedor || 'No especificado'}
- Estado: ${contract.estado_contrato || 'No especificado'}
`
      : ''

    const flagContext = `
Alerta detectada:
- Categoría: ${flag.category}
- Severidad: ${flag.severity}
- Título: ${flag.title}
- Descripción: ${flag.description}
- Evidencia: ${flag.evidence || 'No disponible'}
`

    const result = streamText({
    model: openrouter(process.env.OPENROUTER_LLM_MODEL ?? 'qwen/qwen3-235b-a22b'),
      system: `Eres GobIA, un experto en auditoría de contratos públicos de Colombia y en el sistema SECOP II.
Tu función es explicar de manera clara y concisa por qué una alerta de riesgo en un contrato es importante.
Usa lenguaje técnico pero accesible. Responde siempre en español.
Estructura tu respuesta así:
1. **Por qué es una alerta**: Explica el riesgo específico que representa esta señal de alerta.
2. **Marco normativo**: Menciona brevemente la norma colombiana relevante (Ley 80/93, Ley 1150/07, Estatuto Anticorrupción, etc.) si aplica.
3. **Qué revisar**: Indica qué documentos o aspectos concretos del contrato se deberían verificar.
Sé conciso (máximo 200 palabras en total).`,
      prompt: `Explica por qué la siguiente alerta fue detectada en este contrato y qué riesgo representa:\n${flagContext}\n${contractContext}`,
      maxTokens: 400,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[explain-flag] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
