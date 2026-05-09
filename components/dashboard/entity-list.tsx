'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, ChevronRight, Search, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Entity {
  name: string
  nit: string
  count: number
  avgRisk?: number
}

interface EntityListProps {
  entities: Entity[]
  selectedEntity: string | null
  onSelectEntity: (nit: string | null) => void
  isLoading?: boolean
  isLoadingMore?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  totalContratosGlobal?: number
}

export function EntityList({
  entities,
  selectedEntity,
  onSelectEntity,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  totalContratosGlobal,
}: EntityListProps) {
  const [search, setSearch] = useState('')
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const onLoadMoreRef = useRef(onLoadMore)
  onLoadMoreRef.current = onLoadMore

  const filteredEntities = useMemo(
    () => entities.filter((entity) => entity.name.toLowerCase().includes(search.toLowerCase())),
    [entities, search],
  )

  // IntersectionObserver for infinite scroll — root is the scroll container
  useEffect(() => {
    if (!onLoadMore || hasMore === false) return
    const el = sentinelRef.current
    const root = scrollContainerRef.current
    if (!el || !root) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMoreRef.current?.()
        }
      },
      { root, rootMargin: '200px', threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!onLoadMore, hasMore])

  if (isLoading) {
    return (
      <div className="space-y-2 p-4 h-full overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-2 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Search */}
      <div className="border-b p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar entidad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
              onClick={() => setSearch('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* All contracts button */}
      <div className="border-b p-2">
        <Button
          variant={selectedEntity === null ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onSelectEntity(null)}
        >
          <Building2 className="mr-2 h-4 w-4" />
          Todas las Entidades
          <span className="ml-auto text-xs text-muted-foreground">
            {totalContratosGlobal
              ? totalContratosGlobal.toLocaleString('es-CO')
              : entities.length}{' '}
            {totalContratosGlobal ? 'contratos' : 'entidades'}
          </span>
        </Button>
      </div>

      {/* Entity list */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="space-y-1 p-2">
          <AnimatePresence mode="popLayout">
            {filteredEntities.map((entity, index) => (
              <motion.button
                key={entity.nit}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
                onClick={() => onSelectEntity(entity.nit)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors',
                  'hover:bg-muted/80',
                  selectedEntity === entity.nit && 'bg-primary/10 text-primary'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                    selectedEntity === entity.nit
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {entity.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entity.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {entity.count} contratos
                  </p>
                </div>
                <ChevronRight
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                    selectedEntity === entity.nit && 'text-primary rotate-90'
                  )}
                />
              </motion.button>
            ))}
          </AnimatePresence>

          {filteredEntities.length === 0 && !isLoadingMore && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No se encontraron entidades
            </div>
          )}

          {/* Infinite scroll sentinel — only shown when not filtering locally */}
          {!search && onLoadMore && hasMore !== false && (
            <div ref={sentinelRef} className="py-2 flex justify-center">
              {isLoadingMore && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
