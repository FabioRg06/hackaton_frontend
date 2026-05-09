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

export function HighlightedText({
  text,
  flags,
  highlights,
  selectedFlag,
  onHighlightRef,
}: HighlightedTextProps) {
  const processedText = useMemo(() => {
    if (!text) return []

    const lowerText = text.toLowerCase()
    const segments: {
      text: string
      type: 'normal' | 'highlight'
      severity?: AlertSeverity
      tooltip?: string
      flagId?: string
    }[] = []

    // Find all keyword matches
    const matches: { start: number; end: number; keyword: typeof KEYWORDS[0] }[] = []

    for (const keyword of KEYWORDS) {
      let index = 0
      while ((index = lowerText.indexOf(keyword.word, index)) !== -1) {
        matches.push({
          start: index,
          end: index + keyword.word.length,
          keyword,
        })
        index += keyword.word.length
      }
    }

    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start)

    // Remove overlapping matches
    const filteredMatches: typeof matches = []
    for (const match of matches) {
      const lastMatch = filteredMatches[filteredMatches.length - 1]
      if (!lastMatch || match.start >= lastMatch.end) {
        filteredMatches.push(match)
      }
    }

    // Build segments
    let currentIndex = 0
    for (const match of filteredMatches) {
      // Add normal text before match
      if (match.start > currentIndex) {
        segments.push({
          text: text.slice(currentIndex, match.start),
          type: 'normal',
        })
      }

      // Add highlighted text
      segments.push({
        text: text.slice(match.start, match.end),
        type: 'highlight',
        severity: match.keyword.severity,
        tooltip: match.keyword.tooltip,
        flagId: `keyword-${match.keyword.word}`,
      })

      currentIndex = match.end
    }

    // Add remaining text
    if (currentIndex < text.length) {
      segments.push({
        text: text.slice(currentIndex),
        type: 'normal',
      })
    }

    return segments
  }, [text])

  return (
    <TooltipProvider delayDuration={300}>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {processedText.map((segment, index) => {
          if (segment.type === 'normal') {
            return <Fragment key={index}>{segment.text}</Fragment>
          }

          const isSelected = selectedFlag?.id === segment.flagId

          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <span
                  ref={(el) => segment.flagId && onHighlightRef?.(segment.flagId, el)}
                  className={cn(
                    'cursor-help rounded px-0.5 py-0.5 transition-all',
                    segment.severity === 'info' && 'bg-blue-500/20 hover:bg-blue-500/30',
                    segment.severity === 'warning' && 'bg-risk-medio/20 hover:bg-risk-medio/30',
                    segment.severity === 'danger' && 'bg-risk-alto/20 hover:bg-risk-alto/30',
                    segment.severity === 'critical' && 'bg-risk-critico/20 hover:bg-risk-critico/30',
                    isSelected && 'ring-2 ring-primary ring-offset-1'
                  )}
                >
                  {segment.text}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">{segment.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </p>
    </TooltipProvider>
  )
}
