import type { DashboardKpis, FleetEquipment, LoadingUnit } from '../lib/api'

export type InsightPriority = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'
export type InsightCategory = 'PRODUCCION' | 'FLOTA' | 'CARGUIO' | 'AVERIAS' | 'SEGURIDAD'
export type OperationalStatus = 'CONTROLADO' | 'PREVENTIVO' | 'CRITICO'

export interface OperationalInsight {
  id: string
  priority: InsightPriority
  category: InsightCategory
  title: string
  explanation: string
  action: string
  impact?: string
  equipment?: string
}

export interface ExecutiveDiagnosis {
  status: OperationalStatus
  statusColor: string
  headline: string
  narrative: string
  topRisk: OperationalInsight | null
  insights: OperationalInsight[]
}

const PRIORITY_ORDER: Record<InsightPriority, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 }

export const STATUS_CONFIG: Record<OperationalStatus, { color: string; label: string; desc: string }> = {
  CONTROLADO: { color: '#10b981', label: 'CONTROLADO', desc: 'Operación dentro de parámetros normales' },
  PREVENTIVO:  { color: '#f59e0b', label: 'PREVENTIVO',  desc: 'Se requiere atención para evitar desviación' },
  CRITICO:    { color: '#ef4444', label: 'CRÍTICO',    desc: 'Acción inmediata requerida' },
}

export function computeOperationalInsights(opts: {
  kpis: DashboardKpis
  currentShiftCompliance?: number
  averiasActive?: number
  averiasCritical?: number
  bottomFleet?: FleetEquipment[]
  bottomUC?: LoadingUnit[]
  criticalAlerts?: number
}): ExecutiveDiagnosis {
  const { kpis, averiasActive = 0, averiasCritical = 0, bottomFleet, bottomUC, criticalAlerts = 0, currentShiftCompliance } = opts
  const insights: OperationalInsight[] = []

  const brecha = kpis.tonelaje_total - kpis.meta_acumulada
  const brechaFin = kpis.proyeccion_fin_mes - kpis.meta_mensual

  // 1. Cumplimiento mensual
  if (kpis.cumplimiento_pct < 100) {
    const priority: InsightPriority = kpis.cumplimiento_pct < 80 ? 'CRITICA' : kpis.cumplimiento_pct < 90 ? 'ALTA' : 'MEDIA'
    insights.push({
      id: 'monthly-compliance',
      priority,
      category: 'PRODUCCION',
      title: `Cumplimiento mensual ${kpis.cumplimiento_pct.toFixed(1)}%`,
      explanation: `El acumulado del mes registra ${kpis.cumplimiento_pct.toFixed(1)}% vs plan, con una brecha de ${Math.abs(brecha).toLocaleString('es-CL')} t.`,
      action: 'Revisar ritmo operacional. Aumentar despacho y reducir tiempos de espera entre ciclos.',
      impact: brecha < 0 ? `-${Math.abs(brecha).toLocaleString('es-CL')} t vs plan` : undefined,
    })
  }

  // 2. Cumplimiento turno actual
  if (currentShiftCompliance !== undefined && currentShiftCompliance < 90) {
    insights.push({
      id: 'shift-compliance',
      priority: currentShiftCompliance < 75 ? 'CRITICA' : 'ALTA',
      category: 'PRODUCCION',
      title: `Turno activo al ${currentShiftCompliance.toFixed(1)}%`,
      explanation: `El turno en curso registra ${currentShiftCompliance.toFixed(1)}% de cumplimiento de meta operacional.`,
      action: 'Coordinar con dispatch reasignación de CAEX y optimización de destinos de descarga.',
      impact: `Cumplimiento turno: ${currentShiftCompliance.toFixed(1)}%`,
    })
  }

  // 3. Proyección fin mes
  if (brechaFin < -50000) {
    const ritmo = kpis.dias_restantes > 0
      ? ((kpis.meta_mensual - kpis.tonelaje_total) / kpis.dias_restantes).toLocaleString('es-CL', { maximumFractionDigits: 0 })
      : '-'
    insights.push({
      id: 'projection',
      priority: brechaFin < -200000 ? 'ALTA' : 'MEDIA',
      category: 'PRODUCCION',
      title: `Proyección: déficit de ${Math.abs(brechaFin).toLocaleString('es-CL')} t`,
      explanation: `Con el ritmo actual, se proyecta cerrar el mes con déficit de ${Math.abs(brechaFin).toLocaleString('es-CL')} t.`,
      action: `Mantener mínimo ${ritmo} t/día los próximos ${kpis.dias_restantes} días.`,
      impact: `Déficit proyectado: -${Math.abs(brechaFin).toLocaleString('es-CL')} t`,
    })
  }

  // 4. CAEX bajo rendimiento
  if (bottomFleet && bottomFleet.length > 0) {
    const worst = [...bottomFleet].sort((a, b) => a.toneladas - b.toneladas)[0]
    if (worst && worst.ciclos < 10 && worst.estado !== 'ACTIVO') {
      insights.push({
        id: `caex-${worst.caex_id}`,
        priority: worst.estado === 'MANTENCION' ? 'ALTA' : 'MEDIA',
        category: 'FLOTA',
        title: `${worst.caex_id} bajo rendimiento`,
        explanation: `${worst.caex_id} (${worst.modelo}) acumula solo ${worst.toneladas.toLocaleString('es-CL')} t con ${worst.ciclos} ciclos. Estado: ${worst.estado}.`,
        action: 'Revisar asignación, tiempos de espera y posibles demoras técnicas.',
        impact: `${worst.toneladas.toLocaleString('es-CL')} t · ${worst.ciclos} ciclos`,
        equipment: worst.caex_id,
      })
    }
  }

  // 5. UC bajo rendimiento
  if (bottomUC && bottomUC.length > 0) {
    const worstUC = [...bottomUC].sort((a, b) => a.variacion_pct - b.variacion_pct)[0]
    if (worstUC && worstUC.variacion_pct < -15) {
      insights.push({
        id: `uc-${worstUC.carguio_id}`,
        priority: worstUC.variacion_pct < -30 ? 'ALTA' : 'MEDIA',
        category: 'CARGUIO',
        title: `${worstUC.carguio_id} ${Math.abs(worstUC.variacion_pct).toFixed(0)}% bajo promedio`,
        explanation: `${worstUC.carguio_id} opera a ${worstUC.rendimiento_tph.toFixed(0)} TPH, ${Math.abs(worstUC.variacion_pct).toFixed(0)}% bajo el promedio de su modelo.`,
        action: 'Verificar operador, posición de banco y estado mecánico del carguío.',
        impact: `TPH: ${worstUC.rendimiento_tph.toFixed(0)} · Desviación: ${worstUC.variacion_pct.toFixed(0)}%`,
        equipment: worstUC.carguio_id,
      })
    }
  }

  // 6. Averías activas
  if (averiasCritical > 0) {
    insights.push({
      id: 'averias-critical',
      priority: 'CRITICA',
      category: 'AVERIAS',
      title: `${averiasCritical} avería(s) crítica(s) activa(s)`,
      explanation: `${averiasActive} equipos con averías activas, ${averiasCritical} de severidad crítica afectan disponibilidad de flota.`,
      action: 'Activar protocolo de mantención correctiva inmediata. Notificar jefe de mantención.',
      impact: `${averiasActive} equipos detenidos`,
    })
  } else if (averiasActive > 2) {
    insights.push({
      id: 'averias-multiple',
      priority: 'ALTA',
      category: 'AVERIAS',
      title: `${averiasActive} averías activas en flota`,
      explanation: `Se registran ${averiasActive} equipos con averías que reducen disponibilidad operacional.`,
      action: 'Priorizar reparación de equipos de mayor tonelaje. Revisar plan de mantención preventiva.',
      impact: `Disponibilidad reducida: ${averiasActive} equipos`,
    })
  }

  // 7. Alertas críticas
  if (criticalAlerts > 3) {
    insights.push({
      id: 'critical-alerts',
      priority: criticalAlerts > 5 ? 'CRITICA' : 'ALTA',
      category: 'SEGURIDAD',
      title: `${criticalAlerts} alertas críticas sin gestionar`,
      explanation: `El sistema detecta ${criticalAlerts} alertas de prioridad crítica/alta pendientes de resolución.`,
      action: 'Revisar panel de alertas y derivar a área responsable según protocolo.',
      impact: `${criticalAlerts} alertas activas`,
    })
  }

  insights.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  const status: OperationalStatus =
    insights.some(i => i.priority === 'CRITICA') ? 'CRITICO' :
    insights.some(i => i.priority === 'ALTA') ? 'PREVENTIVO' :
    'CONTROLADO'

  const topRisk = insights[0] ?? null
  const compliance = kpis.cumplimiento_pct

  let narrative = compliance >= 100
    ? `La operación se mantiene sobre plan con ${compliance.toFixed(1)}% de cumplimiento y ${kpis.tonelaje_total.toLocaleString('es-CL')} t registradas. `
    : compliance >= 90
      ? `La operación registra ${compliance.toFixed(1)}% de cumplimiento, con una brecha de ${Math.abs(brecha).toLocaleString('es-CL')} t contra el plan acumulado. `
      : `La operación presenta déficit: ${compliance.toFixed(1)}% de cumplimiento y brecha de ${Math.abs(brecha).toLocaleString('es-CL')} t. `

  if (topRisk?.category === 'FLOTA')     narrative += `La principal desviación corresponde a la flota CAEX${topRisk.equipment ? `, particularmente ${topRisk.equipment}` : ''}. `
  else if (topRisk?.category === 'CARGUIO')  narrative += `La principal desviación se registra en unidades de carguío. `
  else if (topRisk?.category === 'AVERIAS') narrative += `El factor crítico es la disponibilidad de flota por averías activas. `
  else if (topRisk?.category === 'PRODUCCION') narrative += `El ritmo operacional requiere ajuste para alcanzar la meta mensual. `

  narrative += brechaFin >= 0
    ? `Proyección favorable al cierre: +${brechaFin.toLocaleString('es-CL')} t sobre meta mensual.`
    : kpis.dias_restantes > 0
      ? `Se requiere mantener ${((kpis.meta_mensual - kpis.tonelaje_total) / kpis.dias_restantes).toLocaleString('es-CL', { maximumFractionDigits: 0 })} t/día para alcanzar la meta.`
      : 'Cierre de mes en curso.'

  const headline = status === 'CRITICO'
    ? (topRisk?.title ?? 'Situación crítica detectada')
    : status === 'PREVENTIVO'
      ? `${compliance.toFixed(1)}% cumplimiento — acción preventiva recomendada`
      : `Operación bajo control · ${compliance.toFixed(1)}% cumplimiento`

  return {
    status,
    statusColor: STATUS_CONFIG[status].color,
    headline,
    narrative,
    topRisk,
    insights: insights.slice(0, 10),
  }
}
