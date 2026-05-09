'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, ChevronRight, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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
}

export function EntityList({
  entities,
  selectedEntity,
  onSelectEntity,
  isLoading,
}: EntityListProps) {
  const [search, setSearch] = useState('')

  const filteredEntities = entities.filter((entity) =>
    entity.name.toLowerCase().includes(search.toLowerCase())
  )

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
            {entities.reduce((sum, e) => sum + e.count, 0)}
          </span>
        </Button>
      </div>

      {/* Entity list */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          <AnimatePresence mode="popLayout">
            {filteredEntities.map((entity, index) => (
              <motion.button
                key={entity.nit}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
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

          {filteredEntities.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No se encontraron entidades
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
