'use client'

import { Fragment, useMemo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { RedFlag, TextHighlight, AlertSeverity } from '@/lib/types'
import { cn } from '@/lib/utils'

interface HighlightedTextProps {
  text: string
  flags: RedFlag[]
  highlights: TextHighlight[]
  selectedFlag: RedFlag | null
  onHighlightRef?: (flagId: string, element: HTMLElement | null) => void
}

// Keywords to highlight in contract text
const KEYWORDS: { word: string; severity: AlertSeverity; tooltip: string }[] = [
  { word: 'contratacion directa', severity: 'warning', tooltip: 'Modalidad que no requiere licitacion' },
  { word: 'urgencia manifiesta', severity: 'danger', tooltip: 'Procedimiento de emergencia sin competencia' },
  { word: 'unico oferente', severity: 'danger', tooltip: 'Sin competencia en el proceso' },
  { word: 'asesoria', severity: 'info', tooltip: 'Contrato de servicios profesionales' },
  { word: 'consultoria', severity: 'info', tooltip: 'Requiere revision de idoneidad' },
  { word: 'publicidad', severity: 'warning', tooltip: 'Contratos de comunicacion pueden tener sobrecostos' },
  { word: 'evento', severity: 'warning', tooltip: 'Alto riesgo de sobrecostos' },
  { word: 'capacitacion', severity: 'info', tooltip: 'Verificar necesidad y resultados' },
  { word: 'comunicacion estrategica', severity: 'warning', tooltip: 'Revisar justificacion y alcance' },
  { word: 'interventoria', severity: 'info', tooltip: 'Supervision de otros contratos' },
  { word: 'prestacion de servicios', severity: 'info', tooltip: 'Contrato de servicios' },
  { word: 'suministro', severity: 'info', tooltip: 'Adquisicion de bienes' },
  { word: 'obra', severity: 'info', tooltip: 'Contrato de construccion' },
]

type Segment = {
  text: string
  type: 'normal' | 'highlight'
  severity?: AlertSeverity
  tooltip?: string
  flagId?: string
  isFlagEvidence?: boolean
}

type MatchEntry = {
  start: number
  end: number
  severity: AlertSeverity
  tooltip: string
  flagId: string
  isFlagEvidence: boolean
}

export function HighlightedText({
  text,
  flags,
  highlights,
  selectedFlag,
  onHighlightRef,
}: HighlightedTextProps) {
  const processedText = useMemo(() => {
    if (!text) return [] as Segment[]

    const lowerText = text.toLowerCase()
    const segments: Segment[] = []
    const matches: MatchEntry[] = []

    // 1. Static keyword matches
    for (const keyword of KEYWORDS) {
      let index = 0
      while ((index = lowerText.indexOf(keyword.word, index)) !== -1) {
        matches.push({
          start: index,
          end: index + keyword.word.length,
          severity: keyword.severity,
          tooltip: keyword.tooltip,
          flagId: `keyword-${keyword.word}`,
          isFlagEvidence: false,
        })
        index += keyword.word.length
      }
    }

    // 2. Flag evidence matches – take higher visual priority
    for (const flag of flags) {
      if (!flag.evidence) continue
      const evidenceLower = flag.evidence.toLowerCase().trim()
      if (evidenceLower.length < 8) continue // skip very short fragments
      let index = 0
      while ((index = lowerText.indexOf(evidenceLower, index)) !== -1) {
        matches.push({
          start: index,
          end: index + evidenceLower.length,
          severity: flag.severity,
          tooltip: flag.title || flag.description || '',
          flagId: flag.id,
          isFlagEvidence: true,
        })
        index += evidenceLower.length
      }
    }

    // Sort: by start position; flag evidence beats keywords on ties; longer spans win
    matches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start
      if (a.isFlagEvidence !== b.isFlagEvidence) return a.isFlagEvidence ? -1 : 1
      return (b.end - b.start) - (a.end - a.start)
    })

    // Remove overlaps – flag evidence replaces keywords when they conflict
    const filtered: MatchEntry[] = []
    for (const match of matches) {
      const last = filtered[filtered.length - 1]
      if (!last || match.start >= last.end) {
        filtered.push(match)
      } else if (match.isFlagEvidence && !last.isFlagEvidence) {
        filtered[filtered.length - 1] = match
      }
    }

    // Build segments
    let currentIndex = 0
    for (const match of filtered) {
      if (match.start > currentIndex) {
        segments.push({ text: text.slice(currentIndex, match.start), type: 'normal' })
      }
      segments.push({
        text: text.slice(match.start, match.end),
        type: 'highlight',
        severity: match.severity,
        tooltip: match.tooltip,
        flagId: match.flagId,
        isFlagEvidence: match.isFlagEvidence,
      })

      currentIndex = match.end
    }

    if (currentIndex < text.length) {
      segments.push({ text: text.slice(currentIndex), type: 'normal' })
    }

    return segments
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, flags])

  return (
    <TooltipProvider delayDuration={300}>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {processedText.map((segment, index) => {
          if (segment.type === 'normal') {
            return <Fragment key={index}>{segment.text}</Fragment>
          }

          const isSelected = selectedFlag?.id === segment.flagId
          const isEvidence = segment.isFlagEvidence

          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <span
                  ref={(el) => segment.flagId && onHighlightRef?.(segment.flagId, el)}
                  className={cn(
                    'cursor-help rounded px-0.5 py-0.5 transition-all',
                    // Flag evidence: stronger red highlight
                    isEvidence && segment.severity === 'critical' && 'bg-risk-critico/30 text-risk-critico underline decoration-risk-critico decoration-2',
                    isEvidence && segment.severity === 'danger'   && 'bg-risk-alto/30 text-risk-alto underline decoration-risk-alto decoration-2',
                    isEvidence && segment.severity === 'warning'  && 'bg-risk-medio/25 text-risk-medio underline decoration-risk-medio',
                    isEvidence && segment.severity === 'info'     && 'bg-blue-500/20 text-blue-600 underline',
                    // Static keyword matches: lighter
                    !isEvidence && segment.severity === 'info'     && 'bg-blue-500/20 hover:bg-blue-500/30',
                    !isEvidence && segment.severity === 'warning'  && 'bg-risk-medio/20 hover:bg-risk-medio/30',
                    !isEvidence && segment.severity === 'danger'   && 'bg-risk-alto/20 hover:bg-risk-alto/30',
                    !isEvidence && segment.severity === 'critical' && 'bg-risk-critico/20 hover:bg-risk-critico/30',
                    isSelected && 'ring-2 ring-primary ring-offset-1',
                  )}
                >
                  {segment.text}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">{isEvidence ? `⚠ Alerta: ${segment.tooltip}` : segment.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </p>
    </TooltipProvider>
  )
}
