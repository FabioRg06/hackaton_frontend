'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, Sparkles, Loader2, Minimize2, Maximize2, AlertCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChatMessage } from './chat-message'
import { cn } from '@/lib/utils'
import type { ContractWithRisk, ViewMode } from '@/lib/types'

interface ChatInterfaceProps {
  expanded: boolean
  onExpandChange: (expanded: boolean) => void
  onDynamicUIChange: (mode: ViewMode, data: unknown) => void
  contracts: ContractWithRisk[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const SUGGESTED_PROMPTS = [
  'Los 5 contratos con mayor valor en SECOP',
  'Gráfica de contratos por modalidad de contratación',
  'Contratos de contratación directa en Bogotá (últimos 20)',
  'Muestrame los contratos de mayor riesgo',
  'Top 10 entidades con más contratos registrados',
  'Contratos adjudicados con un solo oferente',
]

function getToolMessage(part: {
  type?: string
  output?: Record<string, unknown>
  state?: string
  toolName?: string
}): string {
  // AI SDK v6: tool parts have type 'tool-<name>' and state 'output-available'
  const hasOutput = (part.state === 'output-available' || (part as any).state === 'output-available') && part.output
  if (!hasOutput) return ''

  if (part.output!.type === 'count' && typeof part.output!.total === 'number') {
    return `Hay ${new Intl.NumberFormat('es-CO').format(part.output!.total as number)} contratos en total.`
  }

  if (part.output!.type === 'contract-list' && typeof part.output!.count === 'number') {
    return `Encontré ${new Intl.NumberFormat('es-CO').format(part.output!.count as number)} contratos para tu consulta.`
  }

  return ''
}

// Helper to extract visible text from message parts
function getMessageText(message: {
  parts?: Array<{
    type: string
    text?: string
    state?: string
    output?: Record<string, unknown>
    toolName?: string
  }>
}): string {
  if (!message.parts || !Array.isArray(message.parts)) return ''

  const textParts = message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text)
    .join('')

  if (textParts.trim()) return textParts

  return message.parts
    .filter((p) => p.type.startsWith('tool-'))
    .map((p) => getToolMessage(p))
    .filter(Boolean)
    .join('\n')
}

export function ChatInterface({
  expanded,
  onExpandChange,
  onDynamicUIChange,
  open: openProp,
  onOpenChange,
}: ChatInterfaceProps) {
  const [isOpenInternal, setIsOpenInternal] = useState(false)
  const isOpen = openProp !== undefined ? openProp : isOpenInternal
  const setIsOpen = (value: boolean) => {
    setIsOpenInternal(value)
    onOpenChange?.(value)
  }
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const processedToolCallIdsRef = useRef<Set<string>>(new Set())

  const handleToolResult = (result: Record<string, unknown> | undefined) => {
    if (!result?.type) return

    const uiType = result.type as string

    if (uiType === 'contract-list' && result.contracts) {
      onDynamicUIChange('contract-list', result.contracts)
    } else if (uiType === 'contract-detail' && result.contract) {
      onDynamicUIChange('contract-detail', result.contract)
    } else if (uiType === 'exploratory' && result.stats) {
      onDynamicUIChange('exploratory', { stats: result.stats, contracts: result.contracts })
    } else if (uiType === 'entity-list' && result.entities) {
      onDynamicUIChange('entity-list', result.entities)
    } else if (uiType === 'count' && typeof result.total === 'number') {
      onDynamicUIChange('count', result.total)
    } else if (uiType === 'query-result') {
      onDynamicUIChange('query-result', { data: result.data, count: result.count })
    } else if (uiType === 'secop-full-list') {
      onDynamicUIChange('secop-full-list', { data: result.data, count: result.count, label: result.label })
    } else if (uiType === 'secop-table') {
      onDynamicUIChange('secop-table', { data: result.data, count: result.count, label: result.label })
    } else if (uiType === 'secop-chart') {
      onDynamicUIChange('secop-chart', {
        chartType: result.chartType,
        title: result.title,
        data: result.data,
        xKey: result.xKey,
        yKey: result.yKey,
        color: result.color,
        yLabel: result.yLabel,
      })
    } else if (uiType === 'high-risk-contract-list') {
      onDynamicUIChange('high-risk-contract-list', { contratos: result.contratos, total: result.total })
    } else if (uiType === 'analysis-report') {
      onDynamicUIChange('analysis-report', result)
    } else if (uiType === 'schema-info') {
      onDynamicUIChange('schema-info', result)
    } else if (uiType === 'field-values') {
      onDynamicUIChange('field-values', result)
    }
  }

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    onToolCall: ({ toolCall }) => {
      // Handle tool results to update UI dynamically
      if (toolCall.dynamic) return

      handleToolResult(toolCall.result as Record<string, unknown> | undefined)
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Process tool results from messages to update UI
  // AI SDK v6: tool parts have type 'tool-<toolName>' (not 'tool-output-available')
  // and carry the result under .output when .state === 'output-available'
  useEffect(() => {
    for (const message of messages) {
      if (message.role === 'assistant' && message.parts) {
        for (const part of message.parts as any[]) {
          const isToolResult =
            typeof part.type === 'string' &&
            part.type.startsWith('tool-') &&
            part.state === 'output-available'
          if (!isToolResult) continue

          const toolCallId = typeof part.toolCallId === 'string' ? part.toolCallId : undefined
          if (toolCallId && processedToolCallIdsRef.current.has(toolCallId)) continue
          if (toolCallId) processedToolCallIdsRef.current.add(toolCallId)

          handleToolResult(part.output as Record<string, unknown> | undefined)
        }
      }
    }
  }, [messages])

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || isLoading) return

    setInput('')
    await sendMessage({ text: messageText })
  }

  return (
    <>
      {/* Chat Toggle - Integrated Input Style */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-8 right-8 z-50"
          >
            <div 
              className="flex items-center gap-3 bg-background/90 backdrop-blur-2xl border-2 border-primary/30 rounded-2xl pl-5 pr-3 py-3 shadow-[0_20px_50px_rgba(37,99,235,0.3)] cursor-pointer group hover:border-primary hover:shadow-[0_20px_50px_rgba(37,99,235,0.4)] transition-all w-[340px]"
              onClick={() => setIsOpen(true)}
            >
              <Search className="h-5 w-5 text-primary animate-pulse" />
              <div className="flex-1 text-sm text-muted-foreground font-semibold group-hover:text-primary transition-colors">
                ¿Qué quieres auditar hoy?
              </div>
              <div className="bg-primary/10 px-2 py-1 rounded text-[10px] font-bold text-primary border border-primary/20">
                ESC
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating close button visible when chat is open */}
      <AnimatePresence>
        {isOpen && (
          <motion.button
            key="chat-close-fab"
            initial={{ y: 20, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-8 right-8 z-[60] flex h-10 w-10 items-center justify-center rounded-full bg-background/90 backdrop-blur-xl border border-border shadow-lg hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-colors"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar chatbot"
            title="Cerrar chatbot"
          >
            <X className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 100, scale: 0.9, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              'fixed z-50 flex min-h-0 flex-col overflow-hidden rounded-[2rem] border bg-background/80 backdrop-blur-xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)]',
              expanded
                ? 'bottom-6 left-6 right-6 top-24 lg:left-auto lg:right-6 lg:w-[600px]'
                : 'bottom-6 right-6 h-[600px] w-[400px]'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b bg-muted/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Asistente GobIA</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Online</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl hover:bg-muted"
                  onClick={() => onExpandChange(!expanded)}
                >
                  {expanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center py-12">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                    <Sparkles className="relative h-16 w-16 text-primary" />
                  </div>
                  <h4 className="mb-2 text-xl font-bold tracking-tight">¿En qué puedo ayudarte hoy?</h4>
                  <p className="mb-8 text-sm text-muted-foreground max-w-[280px]">
                    Puedo analizar contratos, buscar riesgos y generar estadísticas en tiempo real.
                  </p>
                  <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <Button
                        key={prompt}
                        variant="outline"
                        size="sm"
                        className="justify-start h-auto py-3 px-4 rounded-2xl text-xs hover:bg-primary/5 hover:border-primary/50 transition-all border-dashed"
                        onClick={() => handleSend(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 pb-4">
                  {messages.map((message) => (
                    <ChatMessage 
                      key={message.id} 
                      message={{
                        id: message.id,
                        role: message.role,
                        content: getMessageText(message),
                      }} 
                    />
                  ))}
                  {isLoading && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3 text-sm text-muted-foreground pl-2"
                    >
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="font-medium animate-pulse">Analizando SECOP II...</span>
                    </motion.div>
                  )}
                  {error && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/5 text-sm text-destructive border border-destructive/10">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <p>Error: {error.message}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input - Floating Style */}
            <div className="p-6 pt-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
                className="relative group"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-primary/30 rounded-[2rem] blur opacity-25 group-focus-within:opacity-50 transition duration-1000 group-focus-within:duration-200" />
                <div className="relative flex items-center gap-2 bg-muted/50 p-2 rounded-[1.8rem] border border-border/50 group-focus-within:border-primary/50 transition-all shadow-inner">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe tu consulta..."
                    disabled={isLoading}
                    className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 h-12 text-sm"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={!input.trim() || isLoading}
                    className="h-12 w-12 rounded-[1.4rem] shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
              <p className="mt-3 text-[10px] text-center text-muted-foreground/60 uppercase font-bold tracking-widest">
                GobIA v2.0 • IA Audit System
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
