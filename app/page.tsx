'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { EntityList } from '@/components/dashboard/entity-list'
import { ContractCard, ContractCardSkeleton } from '@/components/dashboard/contract-card'
import { StatsOverview } from '@/components/dashboard/stats-overview'
import { ChatInterface } from '@/components/chat/chat-interface'
import { DynamicUIRenderer } from '@/components/chat/dynamic-ui-renderer'
import { useContracts, useEntities, useDashboardStats } from '@/hooks/use-contracts'
import type { ContractWithRisk, ViewMode } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function HomePage() {
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [selectedContract, setSelectedContract] = useState<ContractWithRisk | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [chatExpanded, setChatExpanded] = useState(false)
  const [dynamicView, setDynamicView] = useState<{ mode: ViewMode; data: unknown } | null>(null)

  const { contracts, isLoading: contractsLoading } = useContracts(
    { entidad: selectedEntity || undefined },
    100
  )
  const { entities, isLoading: entitiesLoading } = useEntities()
  const stats = useDashboardStats(contracts)

  const handleContractClick = (contract: ContractWithRisk) => {
    setSelectedContract(contract)
    setDynamicView({ mode: 'contract-detail', data: contract })
  }

  const handleDynamicUIChange = (mode: ViewMode, data: unknown) => {
    setDynamicView({ mode, data })
    if (mode !== 'dashboard') {
      setChatExpanded(false)
    }
  }

  const handleBackToDashboard = () => {
    setDynamicView(null)
    setSelectedContract(null)
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-none">Auditor Total</h1>
              <p className="text-xs text-muted-foreground">SECOP II</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Entity List */}
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="hidden shrink-0 border-r bg-card lg:block h-full overflow-hidden"
            >
              <EntityList
                entities={entities}
                selectedEntity={selectedEntity}
                onSelectEntity={setSelectedEntity}
                isLoading={entitiesLoading}
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 top-14 h-[calc(100%-3.5rem)] w-72 border-r bg-card"
                onClick={(e) => e.stopPropagation()}
              >
                <EntityList
                  entities={entities}
                  selectedEntity={selectedEntity}
                  onSelectEntity={(nit) => {
                    setSelectedEntity(nit)
                    setSidebarOpen(false)
                  }}
                  isLoading={entitiesLoading}
                />
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {dynamicView ? (
              <motion.div
                key="dynamic-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full"
              >
                <DynamicUIRenderer
                  viewMode={dynamicView.mode}
                  data={dynamicView.data}
                  onBack={handleBackToDashboard}
                  onContractClick={handleContractClick}
                />
              </motion.div>
            ) : (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 lg:p-6"
              >
                {/* Stats */}
                <div className="mb-6">
                  <h2 className="mb-4 text-xl font-semibold">
                    {selectedEntity
                      ? `Contratos de ${entities.find((e) => e.nit === selectedEntity)?.name || 'Entidad'}`
                      : 'Resumen General'}
                  </h2>
                  <StatsOverview stats={stats} isLoading={contractsLoading} />
                </div>

                {/* Contracts List */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                      Contratos Recientes
                      {!contractsLoading && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({contracts.length})
                        </span>
                      )}
                    </h2>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                    {contractsLoading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <ContractCardSkeleton key={i} />
                        ))
                        : contracts.slice(0, 12).map((contract, index) => (
                          <ContractCard
                            key={`${contract.id}-${index}`}
                            contract={contract}
                            index={index}
                            onClick={() => handleContractClick(contract)}
                          />
                        ))}
                  </div>

                  {!contractsLoading && contracts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Shield className="mb-4 h-12 w-12 text-muted-foreground/50" />
                      <h3 className="text-lg font-medium">No se encontraron contratos</h3>
                      <p className="text-sm text-muted-foreground">
                        Intenta seleccionar otra entidad o ajusta los filtros
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Chat Interface */}
        <ChatInterface
          expanded={chatExpanded}
          onExpandChange={setChatExpanded}
          onDynamicUIChange={handleDynamicUIChange}
          contracts={contracts}
        />
      </div>
    </div>
  )
}
