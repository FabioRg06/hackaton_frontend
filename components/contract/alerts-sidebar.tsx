'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ChevronLeft, ChevronRight, Info, AlertCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { RedFlag, AlertSeverity } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AlertsSidebarProps {
  flags: RedFlag[]
  selectedFlag: RedFlag | null
  onFlagClick: (flag: RedFlag) => void
  collapsed: boolean
  onCollapseChange: (collapsed: boolean) => void
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
}: AlertsSidebarProps) {
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
            className="fixed right-0 top-14 hidden h-[calc(100vh-3.5rem)] border-l bg-card lg:block"
          >
            <div className="flex h-full flex-col">
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
              <ScrollArea className="flex-1 p-4">
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
                              <motion.button
                                key={flag.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onFlagClick(flag)}
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
                                      'text-xs',
                                      severity === 'info' && 'border-blue-500/50 text-blue-500',
                                      severity === 'warning' && 'border-risk-medio/50 text-risk-medio',
                                      severity === 'danger' && 'border-risk-alto/50 text-risk-alto',
                                      severity === 'critical' && 'border-risk-critico/50 text-risk-critico'
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
            className="fixed right-0 top-14 hidden lg:block"
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
