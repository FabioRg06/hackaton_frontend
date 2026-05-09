import type {
  SecopContract,
  RiskAnalysis,
  RedFlag,
  TextHighlight,
  EntityContext,
  RiskLevel,
  AlertSeverity,
  ContractWithRisk,
} from './types'
import { parseContractValue, formatCurrency } from './secop'

// Risk thresholds
const THRESHOLDS = {
  directContractingThreshold: 15, // Points for direct contracting
  highValueMultiplier: 3, // Contract value > 3x average
  recurringContractorMin: 3, // Min contracts for "recurring" flag
  fractioningMinSimilar: 2, // Min similar contracts for fractioning
  abnormalDurationDays: 365, // Contracts > 1 year
  shortDurationDays: 7, // Contracts < 1 week
}

export function calculateRiskScore(
  contract: SecopContract,
  context?: EntityContext
): RiskAnalysis {
  let score = 0
  const flags: RedFlag[] = []
  const highlights: TextHighlight[] = []

  // 1. Modalidad de Contratacion
  const modalidad = contract.modalidad_de_contratacion?.toLowerCase() || ''
  
  if (modalidad.includes('directa') || modalidad.includes('urgencia')) {
    score += THRESHOLDS.directContractingThreshold
    flags.push({
      id: 'modalidad-directa',
      category: 'Modalidad',
      severity: modalidad.includes('urgencia') ? 'danger' : 'warning',
      title: 'Contratacion Directa',
      description: modalidad.includes('urgencia')
        ? 'Contrato adjudicado por urgencia manifiesta sin proceso competitivo'
        : 'Este contrato fue adjudicado directamente sin licitacion',
      evidence: contract.modalidad_de_contratacion,
    })
  }

  // 2. Valor del Contrato vs Promedio
  const contractValue = parseContractValue(contract.cuantia_contrato)
  
  if (context && contractValue > 0) {
    const avgValue = context.averageContractValue
    
    if (avgValue > 0 && contractValue > avgValue * THRESHOLDS.highValueMultiplier) {
      const multiplier = (contractValue / avgValue).toFixed(1)
      score += 20
      flags.push({
        id: 'valor-anomalo',
        category: 'Valor',
        severity: 'danger',
        title: 'Cuantia Anomala',
        description: `El valor del contrato (${formatCurrency(contractValue)}) excede ${multiplier}x el promedio de la entidad (${formatCurrency(avgValue)})`,
        evidence: contract.cuantia_contrato,
      })
    }
  }

  // 3. Contratista Recurrente
  if (context && contract.nit_del_contratista) {
    const frequency = context.contractorFrequency[contract.nit_del_contratista] || 0
    
    if (frequency >= THRESHOLDS.recurringContractorMin) {
      score += 15 + Math.min(frequency * 2, 20) // Max 35 points
      flags.push({
        id: 'contratista-recurrente',
        category: 'Contratista',
        severity: frequency > 5 ? 'critical' : 'danger',
        title: 'Contratista Recurrente',
        description: `${contract.nombre_del_contratista} tiene ${frequency} contratos con esta entidad`,
        evidence: `NIT: ${contract.nit_del_contratista}`,
      })
    }
  }

  // 4. Plazo de Ejecucion Anomalo
  const plazo = contract.plazo_de_ejecucion?.toLowerCase() || ''
  const plazoMatch = plazo.match(/(\d+)/)
  
  if (plazoMatch) {
    const days = parseInt(plazoMatch[1])
    
    if (plazo.includes('dia') && days < THRESHOLDS.shortDurationDays) {
      score += 10
      flags.push({
        id: 'plazo-corto',
        category: 'Tiempo',
        severity: 'warning',
        title: 'Plazo Muy Corto',
        description: `El plazo de ejecucion (${contract.plazo_de_ejecucion}) es inusualmente corto`,
        evidence: contract.plazo_de_ejecucion,
      })
    }
    
    if (plazo.includes('mes') && days > 12) {
      score += 10
      flags.push({
        id: 'plazo-largo',
        category: 'Tiempo',
        severity: 'info',
        title: 'Plazo Extenso',
        description: `El contrato tiene un plazo de ejecucion de ${contract.plazo_de_ejecucion}`,
        evidence: contract.plazo_de_ejecucion,
      })
    }
  }

  // 5. Adiciones al Contrato
  const adiciones = parseContractValue(contract.valor_total_de_adiciones)
  
  if (adiciones > 0 && contractValue > 0) {
    const adicionPercent = (adiciones / contractValue) * 100
    
    if (adicionPercent > 50) {
      score += 25
      flags.push({
        id: 'adiciones-altas',
        category: 'Adiciones',
        severity: 'critical',
        title: 'Adiciones Significativas',
        description: `Las adiciones (${formatCurrency(adiciones)}) representan el ${adicionPercent.toFixed(0)}% del valor original`,
        evidence: contract.valor_total_de_adiciones,
      })
    } else if (adicionPercent > 25) {
      score += 15
      flags.push({
        id: 'adiciones-moderadas',
        category: 'Adiciones',
        severity: 'warning',
        title: 'Adiciones al Contrato',
        description: `Se han realizado adiciones por ${formatCurrency(adiciones)} (${adicionPercent.toFixed(0)}% del valor original)`,
        evidence: contract.valor_total_de_adiciones,
      })
    }
  }

  // 6. Estado del Contrato
  const estado = contract.estado_contrato?.toLowerCase() || ''
  
  if (estado.includes('liquidado') || estado.includes('terminado')) {
    // Reduce risk for completed contracts
    score = Math.max(0, score - 5)
  } else if (estado.includes('suspendido') || estado.includes('incumplimiento')) {
    score += 20
    flags.push({
      id: 'estado-problematico',
      category: 'Estado',
      severity: 'danger',
      title: 'Contrato con Problemas',
      description: `El contrato se encuentra en estado: ${contract.estado_contrato}`,
      evidence: contract.estado_contrato,
    })
  }

  // 7. Objeto del Contrato - Palabras clave sospechosas
  const objeto = contract.objeto_del_contrato?.toLowerCase() || ''
  const palabrasSospechosas = [
    { word: 'asesoria', points: 5, severity: 'info' as AlertSeverity },
    { word: 'consultoria', points: 5, severity: 'info' as AlertSeverity },
    { word: 'estudio', points: 3, severity: 'info' as AlertSeverity },
    { word: 'capacitacion', points: 3, severity: 'info' as AlertSeverity },
    { word: 'publicidad', points: 8, severity: 'warning' as AlertSeverity },
    { word: 'comunicacion estrategica', points: 10, severity: 'warning' as AlertSeverity },
    { word: 'evento', points: 8, severity: 'warning' as AlertSeverity },
  ]

  for (const { word, points, severity } of palabrasSospechosas) {
    if (objeto.includes(word)) {
      score += points
      
      // Find position in text for highlighting
      const start = objeto.indexOf(word)
      const end = start + word.length
      
      highlights.push({
        text: word,
        severity,
        flagId: `objeto-${word}`,
        start,
        end,
      })
      
      if (!flags.find(f => f.id === 'objeto-sospechoso')) {
        flags.push({
          id: 'objeto-sospechoso',
          category: 'Objeto',
          severity: 'info',
          title: 'Objeto Requiere Revision',
          description: `El objeto del contrato incluye terminos que merecen atencion especial`,
          evidence: contract.objeto_del_contrato,
        })
      }
    }
  }

  // Normalize score to 0-100
  score = Math.min(100, Math.max(0, score))

  // Determine level
  const level: RiskLevel = 
    score < 20 ? 'bajo' : 
    score < 45 ? 'medio' : 
    score < 70 ? 'alto' : 'critico'

  return {
    score,
    level,
    flags: flags.sort((a, b) => {
      const severityOrder = { critical: 0, danger: 1, warning: 2, info: 3 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    }),
    highlights,
  }
}

export function buildEntityContext(contracts: SecopContract[]): EntityContext {
  const contractorFrequency: Record<string, number> = {}
  let totalValue = 0
  let validValueCount = 0

  for (const contract of contracts) {
    // Count contractor frequency
    if (contract.nit_del_contratista) {
      contractorFrequency[contract.nit_del_contratista] = 
        (contractorFrequency[contract.nit_del_contratista] || 0) + 1
    }

    // Calculate average value
    const value = parseContractValue(contract.cuantia_contrato)
    if (value > 0) {
      totalValue += value
      validValueCount++
    }
  }

  return {
    nitEntidad: contracts[0]?.nit_entidad || '',
    totalContracts: contracts.length,
    averageContractValue: validValueCount > 0 ? totalValue / validValueCount : 0,
    contractorFrequency,
    contracts,
  }
}

export function analyzeContract(contract: SecopContract): RiskAnalysis {
  return calculateRiskScore(contract)
}

export function analyzeContracts(contracts: SecopContract[]): ContractWithRisk[] {
  const context = buildEntityContext(contracts)
  
  return contracts.map(contract => ({
    ...contract,
    riskAnalysis: calculateRiskScore(contract, context),
  }))
}

export function getRiskColor(level: RiskLevel): string {
  const colors = {
    bajo: '#22c55e',
    medio: '#eab308',
    alto: '#f97316',
    critico: '#ef4444',
  }
  return colors[level]
}

export function getSeverityColor(severity: AlertSeverity): string {
  const colors = {
    info: '#3b82f6',
    warning: '#eab308',
    danger: '#f97316',
    critical: '#ef4444',
  }
  return colors[severity]
}
