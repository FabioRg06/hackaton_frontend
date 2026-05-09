'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ChevronLeft, ChevronRight, Info, AlertCircle, XCircle, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { RedFlag, AlertSeverity, SecopContract } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AlertsSidebarProps {
  flags: RedFlag[]
  selectedFlag: RedFlag | null
  onFlagClick: (flag: RedFlag) => void
  collapsed: boolean
  onCollapseChange: (collapsed: boolean) => void
  contract?: SecopContract
}

const severityIcons: Record<AlertSeverity, React.ReactNode> = {
  info: <Info className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  danger: <AlertCircle className="h-4 w-4" />,
  critical: <XCircle className="h-4 w-4" />,
}

const severityLabels: Record<AlertSeverity, string> = {
  info: 'Informativo',
  warning: 'Advertencia',
  danger: 'Peligro',
  critical: 'Critico',
}

export function AlertsSidebar({
  flags,
  selectedFlag,
  onFlagClick,
  collapsed,
  onCollapseChange,
  contract,
}: AlertsSidebarProps) {
  const [explanations, setExplanations] = useState<Record<string, string>>({})
  const [loadingFlagId, setLoadingFlagId] = useState<string | null>(null)

  const explainFlag = useCallback(async (flag: RedFlag) => {
    if (explanations[flag.id] || loadingFlagId === flag.id) return
    setLoadingFlagId(flag.id)
    setExplanations((prev) => ({ ...prev, [flag.id]: '' }))
    try {
      const res = await fetch('/api/explain-flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag, contract }),
      })
      if (!res.ok || !res.body) throw new Error('Error al consultar IA')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setExplanations((prev) => ({ ...prev, [flag.id]: text }))
      }
    } catch {
      setExplanations((prev) => ({ ...prev, [flag.id]: 'No se pudo obtener la explicación.' }))
    } finally {
      setLoadingFlagId(null)
    }
  }, [contract, explanations, loadingFlagId])

  const handleFlagClick = (flag: RedFlag) => {
    onFlagClick(flag)
    explainFlag(flag)
  }

  const groupedFlags = flags.reduce((acc, flag) => {
    if (!acc[flag.severity]) acc[flag.severity] = []
    acc[flag.severity].push(flag)
    return acc
  }, {} as Record<AlertSeverity, RedFlag[]>)

  const severityOrder: AlertSeverity[] = ['critical', 'danger', 'warning', 'info']

  return (
    <>
      {/* Desktop Sidebar */}
      <AnimatePresence mode="wait">
        {!collapsed ? (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sticky top-0 hidden h-[calc(100vh-3.5rem)] shrink-0 self-start border-l bg-card lg:block"
          >
            <div className="flex h-full min-h-0 flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-risk-alto" />
                  <h3 className="font-semibold">Alertas</h3>
                  <Badge variant="secondary">{flags.length}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onCollapseChange(true)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Flags List */}
              <ScrollArea className="min-h-0 flex-1 p-4">
                {flags.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="mb-3 rounded-full bg-risk-bajo/20 p-3">
                      <AlertTriangle className="h-6 w-6 text-risk-bajo" />
                    </div>
                    <p className="text-sm font-medium">Sin alertas</p>
                    <p className="text-xs text-muted-foreground">
                      Este contrato no presenta irregularidades
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {severityOrder.map((severity) => {
                      const severityFlags = groupedFlags[severity]
                      if (!severityFlags?.length) return null

                      return (
                        <div key={severity}>
                          <div className="mb-2 flex items-center gap-2">
                            <span
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded',
                                severity === 'info' && 'bg-blue-500/20 text-blue-500',
                                severity === 'warning' && 'bg-risk-medio/20 text-risk-medio',
                                severity === 'danger' && 'bg-risk-alto/20 text-risk-alto',
                                severity === 'critical' && 'bg-risk-critico/20 text-risk-critico'
                              )}
                            >
                              {severityIcons[severity]}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                              {severityLabels[severity]} ({severityFlags.length})
                            </span>
                          </div>
                          <div className="space-y-2">
                            {severityFlags.map((flag) => (
                              <div key={flag.id}>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleFlagClick(flag)}
                                className={cn(
                                  'w-full rounded-lg border p-3 text-left transition-all',
                                  'hover:bg-muted/50',
                                  selectedFlag?.id === flag.id &&
                                    'border-primary bg-primary/5 ring-1 ring-primary'
                                )}
                              >
                                <div className="mb-1 flex items-center justify-between">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-xs font-semibold',
                                      severity === 'info' && 'border-blue-500/50 bg-blue-500/10 !text-blue-500',
                                      severity === 'warning' && 'border-risk-medio/50 bg-risk-medio/10 !text-risk-medio',
                                      severity === 'danger' && 'border-risk-alto/50 bg-risk-alto/10 !text-risk-alto',
                                      severity === 'critical' && 'border-risk-critico/50 bg-risk-critico/10 !text-risk-critico'
                                    )}
                                  >
                                    {flag.category}
                                  </Badge>
                                </div>
                                <p className="text-sm font-medium">{flag.title}</p>
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                  {flag.description}
                                </p>
                              </motion.button>

                              {/* AI Explanation Panel */}
                              <AnimatePresence>
                                {selectedFlag?.id === flag.id && (explanations[flag.id] !== undefined || loadingFlagId === flag.id) && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden rounded-b-lg border border-t-0 border-primary/30 bg-primary/5 px-3 pb-3"
                                  >
                                    <div className="flex items-center gap-1.5 pb-1 pt-2">
                                      <Sparkles className="h-3 w-3 text-primary" />
                                      <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                                        Análisis IA
                                      </span>
                                      {loadingFlagId === flag.id && (
                                        <Loader2 className="ml-auto h-3 w-3 animate-spin text-primary" />
                                      )}
                                    </div>
                                    <div className="max-h-52 overflow-y-auto pr-1">
                                      <p className="whitespace-pre-wrap text-xs text-foreground/80 leading-relaxed">
                                        {explanations[flag.id] || ''}
                                      </p>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Summary Footer */}
              {flags.length > 0 && (
                <div className="border-t p-4">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {severityOrder.map((severity) => (
                      <div key={severity} className="rounded-lg bg-muted/50 p-2">
                        <span
                          className={cn(
                            'text-lg font-bold',
                            severity === 'info' && 'text-blue-500',
                            severity === 'warning' && 'text-risk-medio',
                            severity === 'danger' && 'text-risk-alto',
                            severity === 'critical' && 'text-risk-critico'
                          )}
                        >
                          {groupedFlags[severity]?.length || 0}
                        </span>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {severity === 'info' ? 'Info' : severity}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="sticky top-0 hidden shrink-0 self-start lg:block"
          >
            <Button
              variant="outline"
              size="icon"
              className="m-2 h-10 w-10"
              onClick={() => onCollapseChange(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
