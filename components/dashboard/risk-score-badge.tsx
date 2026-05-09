'use client'

import { cn } from '@/lib/utils'
import type { RiskLevel } from '@/lib/types'

interface RiskScoreBadgeProps {
  score: number
  level: RiskLevel
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const levelLabels: Record<RiskLevel, string> = {
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
  critico: 'Critico',
}

export function RiskScoreBadge({
  score,
  level,
  size = 'md',
  showLabel = true,
  className,
}: RiskScoreBadgeProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-16 w-16 text-base',
  }

  const ringSize = {
    sm: 'h-10 w-10',
    md: 'h-14 w-14',
    lg: 'h-20 w-20',
  }

  // Calculate the stroke dash for the circular progress
  const radius = size === 'lg' ? 30 : size === 'md' ? 20 : 14
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('relative flex items-center justify-center', ringSize[size])}>
        {/* Background ring */}
        <svg
          className="absolute inset-0 -rotate-90"
          viewBox={`0 0 ${radius * 2 + 8} ${radius * 2 + 8}`}
        >
          <circle
            cx={radius + 4}
            cy={radius + 4}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={size === 'lg' ? 4 : 3}
            className="text-muted/30"
          />
          <circle
            cx={radius + 4}
            cy={radius + 4}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={size === 'lg' ? 4 : 3}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn(
              'transition-all duration-500',
              level === 'bajo' && 'text-risk-bajo',
              level === 'medio' && 'text-risk-medio',
              level === 'alto' && 'text-risk-alto',
              level === 'critico' && 'text-risk-critico'
            )}
          />
        </svg>
        
        {/* Score number */}
        <span
          className={cn(
            'font-bold tabular-nums',
            sizeClasses[size],
            'flex items-center justify-center',
            level === 'bajo' && 'text-risk-bajo',
            level === 'medio' && 'text-risk-medio',
            level === 'alto' && 'text-risk-alto',
            level === 'critico' && 'text-risk-critico'
          )}
        >
          {score}
        </span>
      </div>
      
      {showLabel && (
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Riesgo</span>
          <span
            className={cn(
              'text-sm font-medium capitalize',
              level === 'bajo' && 'text-risk-bajo',
              level === 'medio' && 'text-risk-medio',
              level === 'alto' && 'text-risk-alto',
              level === 'critico' && 'text-risk-critico'
            )}
          >
            {levelLabels[level]}
          </span>
        </div>
      )}
    </div>
  )
}

export function RiskBadgeSmall({ level }: { level: RiskLevel }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        level === 'bajo' && 'bg-risk-bajo/20 text-risk-bajo',
        level === 'medio' && 'bg-risk-medio/20 text-risk-medio',
        level === 'alto' && 'bg-risk-alto/20 text-risk-alto',
        level === 'critico' && 'bg-risk-critico/20 text-risk-critico'
      )}
    >
      {levelLabels[level]}
    </span>
  )
}
