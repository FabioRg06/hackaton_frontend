'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Menu, X, Loader2, BarChart3, List, ChevronLeft, Building2, DollarSign, FileText, AlertTriangle, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { EntityList } from '@/components/dashboard/entity-list'
import { ContractCard, ContractCardSkeleton } from '@/components/dashboard/contract-card'
import { StatsOverview } from '@/components/dashboard/stats-overview'
import { ChatInterface } from '@/components/chat/chat-interface'
import { DynamicUIRenderer } from '@/components/chat/dynamic-ui-renderer'
import { useContractsInfinite, useEntitiesInfinite, useDashboardStats } from '@/hooks/use-contracts'
import { ExploratoryDashboard } from '@/components/charts/exploratory-dashboard'
import type { ContractWithRisk, ViewMode } from '@/lib/types'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/secop'

const EMPTY_CONTRACTS: ContractWithRisk[] = []


export default function HomePage() {
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [selectedContract, setSelectedContract] = useState<ContractWithRisk | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [chatExpanded, setChatExpanded] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [dynamicView, setDynamicView] = useState<{ mode: ViewMode; data: unknown } | null>(null)
  const [showEntityDashboard, setShowEntityDashboard] = useState(false)

  const sentinelRef = useRef<HTMLDivElement>(null)

  // Stable refs — the IntersectionObserver reads these without being recreated on every render
  const hasMoreRef = useRef(true)
  const isLoadingMoreRef = useRef(false)
  const loadMoreRef = useRef<() => void>(() => {})

  const {
    entities: backendEntities,
    entityContractsByNit,
    isLoading: backendEntitiesLoading,
    isLoadingMore: entitiesLoadingMore,
    hasMore: entitiesHasMore,
    loadMore: loadMoreEntities,
    totalValor: totalValorGlobal,
  } = useEntitiesInfinite()

  const selectedEntityContracts = selectedEntity
    ? (entityContractsByNit[selectedEntity] ?? EMPTY_CONTRACTS)
    : EMPTY_CONTRACTS

  const {
    contracts,
    isLoading: contractsLoading,
    isLoadingMore: contractsLoadingMore,
    hasMore: contractsHasMore,
    loadMore: loadMoreContracts,
  } = useContractsInfinite({ entidad: selectedEntity || undefined }, 50, selectedEntityContracts)

  // Sync latest values into refs every render (no observer re-creation needed)
  hasMoreRef.current = contractsHasMore
  isLoadingMoreRef.current = contractsLoadingMore
  loadMoreRef.current = loadMoreContracts

  const entities = backendEntities

  // Total contract count across all loaded entities (shown on "Todas las Entidades" button)
  const totalContratosGlobal = backendEntities.reduce((sum, e) => sum + e.count, 0)

  const entitiesLoading = backendEntitiesLoading && contracts.length === 0

  const stats = useDashboardStats(contracts)

  // Stable IntersectionObserver — never re-created on state changes, reads from refs
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !isLoadingMoreRef.current) {
          loadMoreRef.current()
        }
      },
      { rootMargin: '400px', threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity]) // only re-create when the entity filter changes

  const handleContractClick = (contract: ContractWithRisk) => {
    setSelectedContract(contract)
    setDynamicView({ mode: 'contract-detail', data: contract })
    setChatOpen(false)
  }

  // Reset dashboard toggle whenever the selected entity changes
  useEffect(() => {
    setShowEntityDashboard(false)
  }, [selectedEntity])

  const handleDynamicUIChange = (mode: ViewMode, data: unknown) => {
    setDynamicView({ mode, data })
    if (mode !== 'dashboard') {
      setChatExpanded(false)
    }
    if (mode === 'contract-detail') {
      setChatOpen(false)
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
                isLoadingMore={entitiesLoadingMore}
                hasMore={entitiesHasMore}
                onLoadMore={loadMoreEntities}
                totalContratosGlobal={totalContratosGlobal}
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
                  isLoadingMore={entitiesLoadingMore}
                  hasMore={entitiesHasMore}
                  onLoadMore={loadMoreEntities}
                  totalContratosGlobal={totalContratosGlobal}
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
                initial={{ opacity: 0, filter: 'blur(14px)', scale: 0.985 }}
                animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                exit={{ opacity: 0, filter: 'blur(14px)', scale: 0.985 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="h-full"
              >
                <DynamicUIRenderer
                  viewMode={dynamicView.mode}
                  data={dynamicView.data}
                  onBack={handleBackToDashboard}
                  onContractClick={handleContractClick}
                />
              </motion.div>
            ) : selectedEntity === null ? (
              /* ── All-entities grid ───────────────────────────────────── */
              <motion.div
                key="entity-grid"
                initial={{ opacity: 0, filter: 'blur(8px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(8px)' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="p-4 lg:p-6"
              >
                {/* ── Global stats dashboard ─────────────────────────── */}
                <div className="mb-6">
                  <h2 className="mb-1 text-xl font-semibold">Todas las Entidades</h2>
                  {!backendEntitiesLoading && (
                    <p className="text-sm text-muted-foreground">
                      {entities.length} entidades&nbsp;·&nbsp;
                      {totalContratosGlobal.toLocaleString('es-CO')} contratos en total
                    </p>
                  )}
                </div>

                {/* Stat cards */}
                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Total entidades */}
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0 }}>
                    <div className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 opacity-60" />
                      <div className="relative flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Total Entidades</p>
                          {backendEntitiesLoading
                            ? <div className="mt-1 h-7 w-16 animate-pulse rounded bg-muted" />
                            : <p className="mt-1 text-2xl font-bold tabular-nums">{entities.length.toLocaleString('es-CO')}</p>}
                          <p className="mt-0.5 text-xs text-muted-foreground">registradas en SECOP II</p>
                        </div>
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Total contratos */}
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.07 }}>
                    <div className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5 opacity-60" />
                      <div className="relative flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Total Contratos</p>
                          {backendEntitiesLoading
                            ? <div className="mt-1 h-7 w-20 animate-pulse rounded bg-muted" />
                            : <p className="mt-1 text-2xl font-bold tabular-nums">{totalContratosGlobal.toLocaleString('es-CO')}</p>}
                          <p className="mt-0.5 text-xs text-muted-foreground">en todas las entidades</p>
                        </div>
                        <div className="rounded-lg bg-blue-500/10 p-2">
                          <FileText className="h-5 w-5 text-blue-500" />
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Valor total */}
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.14 }}>
                    <div className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 opacity-60" />
                      <div className="relative flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Valor Total Contratos</p>
                          {backendEntitiesLoading
                            ? <div className="mt-1 h-7 w-24 animate-pulse rounded bg-muted" />
                            : <p className="mt-1 text-2xl font-bold tabular-nums">{formatCurrency(totalValorGlobal)}</p>}
                          <p className="mt-0.5 text-xs text-muted-foreground">suma de precio base</p>
                        </div>
                        <div className="rounded-lg bg-emerald-500/10 p-2">
                          <DollarSign className="h-5 w-5 text-emerald-500" />
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Entidad con más contratos */}
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.21 }}>
                    <div className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm">
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-amber-500/5 opacity-60" />
                      <div className="relative flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-muted-foreground">Mayor Contratante</p>
                          {backendEntitiesLoading
                            ? <div className="mt-1 h-7 w-20 animate-pulse rounded bg-muted" />
                            : <>
                                <p className="mt-1 text-2xl font-bold tabular-nums">{entities[0]?.count.toLocaleString('es-CO') ?? '—'}</p>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">{entities[0]?.name ?? '—'}</p>
                              </>}
                        </div>
                        <div className="ml-2 rounded-lg bg-amber-500/10 p-2 shrink-0">
                          <TrendingUp className="h-5 w-5 text-amber-500" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* ── Entity cards ──────────────────────────────────── */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {backendEntitiesLoading
                    ? Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
                            <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
                          </div>
                          <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
                          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                        </div>
                      ))
                    : entities.map((entity) => (
                        <button
                          key={entity.nit}
                          onClick={() => setSelectedEntity(entity.nit)}
                          className="rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                              {entity.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                              {entity.count.toLocaleString('es-CO')}
                            </span>
                          </div>
                          <p className="mt-3 line-clamp-2 text-sm font-medium leading-tight">
                            {entity.name}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {entity.count.toLocaleString('es-CO')} contratos
                          </p>
                        </button>
                      ))}
                </div>
              </motion.div>
            ) : (
              /* ── Selected-entity contract list ───────────────────────── */
              <motion.div
                key={`entity-contracts-${selectedEntity}`}
                initial={{ opacity: 0, filter: 'blur(8px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(8px)' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="p-4 lg:p-6"
              >
                {/* Breadcrumb */}
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Todas las Entidades
                </button>

                {/* Entity header + stats */}
                <div className="mb-6">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                      {(entities.find((e) => e.nit === selectedEntity)?.name ?? 'E').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold leading-tight">
                        {entities.find((e) => e.nit === selectedEntity)?.name || 'Entidad'}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {entities.find((e) => e.nit === selectedEntity)?.count.toLocaleString('es-CO')} contratos en total
                        &nbsp;·&nbsp;NIT {selectedEntity}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <StatsOverview stats={stats} isLoading={contractsLoading} />
                  </div>
                </div>

                {/* Contracts section */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                      Contratos
                      {!contractsLoading && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({contracts.length} cargados)
                        </span>
                      )}
                    </h2>

                    {/* Dashboard toggle */}
                    {!contractsLoading && contracts.length > 0 && (
                      <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
                        <button
                          onClick={() => setShowEntityDashboard(false)}
                          className={cn(
                            'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                            !showEntityDashboard
                              ? 'bg-background shadow-sm text-foreground'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <List className="h-3.5 w-3.5" />
                          Lista
                        </button>
                        <button
                          onClick={() => setShowEntityDashboard(true)}
                          className={cn(
                            'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                            showEntityDashboard
                              ? 'bg-background shadow-sm text-foreground'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                          Dashboard
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Entity contracts dashboard */}
                  {showEntityDashboard && !contractsLoading && contracts.length > 0 && (
                    <motion.div
                      key="entity-dashboard"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <ExploratoryDashboard
                        stats={{}}
                        contracts={contracts}
                        onContractClick={handleContractClick}
                      />
                    </motion.div>
                  )}

                  {/* Contract grid */}
                  {!showEntityDashboard && (
                    <>
                      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                        {contractsLoading
                          ? Array.from({ length: 6 }).map((_, i) => (
                              <ContractCardSkeleton key={i} />
                            ))
                          : contracts.map((contract, index) => (
                              <ContractCard
                                key={`${contract.id}-${index}`}
                                contract={contract}
                                index={index}
                                onClick={() => handleContractClick(contract)}
                              />
                            ))}
                      </div>

                      {/* Infinite scroll sentinel */}
                      <div ref={sentinelRef} className="py-4 flex justify-center">
                        {contractsLoadingMore && (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        )}
                      </div>

                      {!contractsLoading && contracts.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Building2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
                          <h3 className="text-lg font-medium">No se encontraron contratos</h3>
                          <p className="text-sm text-muted-foreground">
                            Esta entidad no tiene contratos registrados en la muestra
                          </p>
                        </div>
                      )}
                    </>
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
          open={chatOpen}
          onOpenChange={setChatOpen}
        />
      </div>
    </div>
  )
}
