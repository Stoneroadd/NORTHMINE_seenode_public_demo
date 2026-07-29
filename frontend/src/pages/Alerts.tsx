import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  MapPinned,
  ShieldCheck,
  Target,
  Truck,
  Zap,
} from 'lucide-react'
import { NorthmineAI } from '../components/ai/NorthmineAI'
import { getOperationalAlerts } from '../services/alertsService'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import { AlertSeverityBadge, normalizeSeverity } from '../components/alerts/AlertSeverityBadge'
import { EquipmentDetailDrawer } from '../components/equipment/detail/EquipmentDetailDrawer'
import { getEquipmentFamilyLabel, getEquipmentImage, getEquipmentLabel } from '../data/equipmentAssets'
import { axisLabel, formatNumber, formatTons, premiumPalette, tooltipBase } from '../components/charts/premium/chartTheme'
import type { DestinationDistribution, LowCaexAlert, OperationalAlertsResponse, SmartAlert } from '../lib/api'
import { useModuleT } from '../i18n/useModuleT'
import { alertsT, type AlertsT } from '../i18n/modules/alerts'

const filters = ['TODAS', 'CRITICA', 'ALTA', 'MEDIA', 'BAJA'] as const

const severityColors: Record<string, string> = {
  CRITICA: '#FF2D55',
  ALTA: '#FF8B24',
  MEDIA: '#FFD100',
  BAJA: 'rgba(148, 163, 184, 0.74)',
}

const severityRank: Record<string, number> = {
  CRITICA: 0,
  ALTA: 1,
  MEDIA: 2,
  BAJA: 3,
}

function getDomainLabels(t: AlertsT): Record<string, string> {
  return {
    Flota: t.domain_flota,
    Carguio: t.domain_carguio,
    Destino: t.domain_destino,
    Produccion: t.domain_produccion,
    Seguridad: t.domain_seguridad,
    Mantencion: t.domain_mantencion,
    Operacion: t.domain_operacion,
  }
}

function filterLabel(filter: (typeof filters)[number], t: AlertsT) {
  return filter === 'TODAS' ? t.filter_todas : t.severity_labels[filter] ?? filter
}

const domainIcons: Record<string, typeof Truck> = {
  Flota: Truck,
  Carguio: Activity,
  Destino: MapPinned,
  Produccion: Target,
  Seguridad: ShieldCheck,
  Mantencion: Zap,
}

function getAlertTitle(alert: SmartAlert, t: AlertsT) {
  return alert.titulo ?? alert.title ?? t.alert_title_fallback
}

function getAlertDescription(alert: SmartAlert, t: AlertsT) {
  return alert.descripcion ?? alert.description ?? t.alert_description_fallback
}

function getAlertAction(alert: SmartAlert, t: AlertsT) {
  return alert.recomendacion ?? t.alert_action_fallback
}

function getAlertDomain(alert: SmartAlert) {
  const raw = alert.modulo ?? alert.type ?? 'Operacion'
  if (raw.toLowerCase().includes('fleet') || raw.toLowerCase().includes('flota')) return 'Flota'
  if (raw.toLowerCase().includes('load') || raw.toLowerCase().includes('carg')) return 'Carguio'
  if (raw.toLowerCase().includes('dest')) return 'Destino'
  if (raw.toLowerCase().includes('prod')) return 'Produccion'
  if (raw.toLowerCase().includes('mant')) return 'Mantencion'
  return raw
}

function extractAlertEquipment(alert: SmartAlert) {
  const fleet = alert.id.match(/^AL-FLEET-(.+)$/)
  const loading = alert.id.match(/^AL-LOAD-(.+)$/)
  const operational = alert.id.match(/^OP-(?:CAEX|LOAD|LOWCYC)-(.+?)(?:-CRIT)?$/)
  const equipmentId = alert.equipment_id ?? fleet?.[1] ?? loading?.[1] ?? operational?.[1]

  if (!equipmentId) return null

  return {
    id: equipmentId,
    image: getEquipmentImage(equipmentId),
    label: getEquipmentLabel(equipmentId),
    family: getEquipmentFamilyLabel(equipmentId),
  }
}

function relativeTime(minutes: number | undefined, t: AlertsT) {
  if (minutes === undefined || Number.isNaN(minutes)) return t.time_now
  if (minutes < 1) return t.time_now
  if (minutes < 60) return t.time_ago_min(minutes)
  return t.time_ago_hour_min(Math.floor(minutes / 60), String(minutes % 60).padStart(2, '0'))
}

function formatTimestamp(value: string | undefined, t: AlertsT) {
  if (!value) return t.no_timestamp
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSource(source: string | undefined, t: AlertsT) {
  const normalized = String(source ?? '').toUpperCase()
  if (normalized.includes('REAL') || normalized.includes('SQL') || normalized.includes('WENCO')) return t.source_real
  if (normalized.includes('DEMO')) return t.source_demo
  return source ? source.toUpperCase() : t.source_none
}

function alertPriorityScore(alert: SmartAlert, t: AlertsT) {
  const severity = normalizeSeverity(alert)
  const severityScore = {
    CRITICA: 400,
    ALTA: 300,
    MEDIA: 200,
    BAJA: 100,
  }[severity] ?? 0
  const domain = getAlertDomain(alert)
  const domainScore = domain === 'Flota' ? 36 : domain === 'Carguio' ? 32 : domain === 'Produccion' ? 28 : 16
  const ageScore = Math.min(alert.relative_minutes ?? 0, 360) / 6
  const text = `${getAlertTitle(alert, t)} ${getAlertDescription(alert, t)}`.toLowerCase()
  const noContributionScore = text.includes('sin aporte') || text.includes('posible averia') ? 45 : 0
  const lowPerformanceScore = text.includes('bajo promedio') || text.includes('bajo el promedio') ? 28 : 0

  return severityScore + domainScore + ageScore + noContributionScore + lowPerformanceScore
}

function sortAlerts(items: SmartAlert[], t: AlertsT) {
  return [...items].sort((a, b) => {
    const sevA = severityRank[normalizeSeverity(a)] ?? 9
    const sevB = severityRank[normalizeSeverity(b)] ?? 9
    if (sevA !== sevB) return sevA - sevB
    return alertPriorityScore(b, t) - alertPriorityScore(a, t)
  })
}

function findLowCaex(alert: SmartAlert, lowCaex: LowCaexAlert[]) {
  const equipment = extractAlertEquipment(alert)?.id
  if (!equipment) return undefined
  return lowCaex.find((item) => item.caex_id.toUpperCase() === equipment.toUpperCase())
}

function alertImpactLabel(alert: SmartAlert, data: OperationalAlertsResponse, t: AlertsT) {
  const lowCaex = findLowCaex(alert, data.low_caex)
  if (lowCaex) {
    return t.impact_pct_avg(formatTons(lowCaex.toneladas), lowCaex.porcentaje_promedio)
  }

  const description = getAlertDescription(alert, t).toLowerCase()
  if (description.includes('sin aporte') || description.includes('sin actividad')) {
    return t.impact_no_contribution(relativeTime(alert.relative_minutes, t).toLowerCase())
  }
  if (getAlertDomain(alert) === 'Carguio') return t.impact_loading
  if (getAlertDomain(alert) === 'Destino') return t.impact_destination
  return t.impact_generic
}

function buildExecutiveSummary(data: OperationalAlertsResponse, t: AlertsT) {
  const sorted = sortAlerts(data.items, t)
  const priority = sorted[0] ?? null
  const affectedEquipment = new Set(
    data.items
      .map((alert) => alert.equipment_id ?? extractAlertEquipment(alert)?.id)
      .filter(Boolean),
  ).size
  const urgentCount = (data.counts.CRITICA ?? 0) + (data.counts.ALTA ?? 0)
  const topDestination = [...data.destination_distribution].sort((a, b) => b.porcentaje - a.porcentaje)[0]
  const worstLowCaex = [...data.low_caex].sort((a, b) => a.porcentaje_promedio - b.porcentaje_promedio)[0]
  const noContributionCount = data.items.filter((alert) => {
    const text = `${getAlertTitle(alert, t)} ${getAlertDescription(alert, t)}`.toLowerCase()
    return text.includes('sin aporte') || text.includes('sin actividad') || text.includes('posible averia')
  }).length
  const loadingAlerts = data.items.filter((alert) => getAlertDomain(alert) === 'Carguio').length

  return {
    priority,
    affectedEquipment,
    urgentCount,
    topDestination,
    worstLowCaex,
    noContributionCount,
    loadingAlerts,
  }
}

function buildOperationalDiagnosis(data: OperationalAlertsResponse, summary: ReturnType<typeof buildExecutiveSummary>, t: AlertsT) {
  if (!summary.priority) {
    return {
      title: t.diagnosis_no_alerts_title,
      description: t.diagnosis_no_alerts_desc,
      action: t.diagnosis_no_alerts_action,
    }
  }

  const critical = data.counts.CRITICA ?? 0
  const high = data.counts.ALTA ?? 0
  const priorityEquipment = extractAlertEquipment(summary.priority)?.id
  const priorityImpact = alertImpactLabel(summary.priority, data, t)
  const title = critical > 0
    ? t.diagnosis_title_critical(critical, high)
    : t.diagnosis_title_high_only(high)

  return {
    title,
    description: t.diagnosis_desc(priorityEquipment ?? t.equipment_operational_fallback, getAlertTitle(summary.priority, t), priorityImpact),
    action: getAlertAction(summary.priority, t),
  }
}

function groupAlertsByDomain(alerts: SmartAlert[]) {
  return alerts.reduce<Record<string, SmartAlert[]>>((acc, alert) => {
    const domain = getAlertDomain(alert)
    acc[domain] = acc[domain] ? [...acc[domain], alert] : [alert]
    return acc
  }, {})
}

function buildWeekdayOption(data: OperationalAlertsResponse, t: AlertsT): EChartsOption {
  return {
    animationDuration: 780,
    grid: { top: 18, right: 18, bottom: 34, left: 72 },
    tooltip: {
      ...tooltipBase(),
      formatter: (params: unknown) => {
        const row = params as { dataIndex: number }
        const item = data.weekday_productivity[row.dataIndex]
        return `<strong>${item.label}</strong><br/>${formatTons(item.toneladas)}<br/>${t.chart_vs_average(item.delta_pct)}`
      },
    },
    xAxis: {
      type: 'category',
      data: data.weekday_productivity.map((item) => item.label),
      axisLine: { lineStyle: { color: premiumPalette.grid } },
      axisTick: { show: false },
      axisLabel,
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: premiumPalette.grid } },
      axisLabel: { ...axisLabel, formatter: (value: number) => formatNumber(value) },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 32,
        data: data.weekday_productivity.map((item) => ({
          value: item.toneladas,
          itemStyle: {
            borderRadius: [7, 7, 0, 0],
            borderColor: item.is_best ? '#29E76F' : item.is_worst ? '#FF4848' : 'transparent',
            borderWidth: item.is_best || item.is_worst ? 2 : 0,
            color: item.is_best ? '#29E76F' : item.is_worst ? '#FF4848' : '#16C8F3',
          },
        })),
      },
    ],
  } as EChartsOption
}

function buildDestinationOption(items: DestinationDistribution[], t: AlertsT): EChartsOption {
  const rows = [...items].sort((a, b) => a.porcentaje - b.porcentaje)
  return {
    animationDuration: 780,
    grid: { top: 14, right: 42, bottom: 28, left: 126 },
    tooltip: {
      ...tooltipBase(),
      formatter: (params: unknown) => {
        const row = params as { dataIndex: number }
        const item = rows[row.dataIndex]
        return `<strong>${item.destino}</strong><br/>${formatTons(item.tonelaje)}<br/>${t.chart_cycles(item.ciclos)}<br/>${t.chart_pct_material(item.porcentaje)}`
      },
    },
    xAxis: {
      type: 'value',
      max: 100,
      splitLine: { lineStyle: { color: premiumPalette.grid } },
      axisLabel: { ...axisLabel, formatter: (value: number) => `${value}%` },
    },
    yAxis: {
      type: 'category',
      data: rows.map((item) => item.destino),
      axisLine: { lineStyle: { color: premiumPalette.grid } },
      axisTick: { show: false },
      axisLabel,
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 24,
        data: rows.map((item) => ({
          value: item.porcentaje,
          itemStyle: { borderRadius: [0, 7, 7, 0], color: item.porcentaje > 70 ? '#FFC928' : '#16C8F3' },
        })),
        label: {
          show: true,
          position: 'right',
          color: premiumPalette.text,
          formatter: (params: { dataIndex: number }) => {
            const item = rows[params.dataIndex]
            return `${item.porcentaje}% / ${formatTons(item.tonelaje)}`
          },
        },
      },
    ],
  } as EChartsOption
}

function AlertMetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'neutral',
  onClick,
  active,
}: {
  icon: typeof Bell
  label: string
  value: string | number
  detail: string
  tone?: 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'neutral'
  onClick?: () => void
  active?: boolean
}) {
  const Tag = onClick ? 'button' : 'article'
  return (
    <Tag type={onClick ? 'button' : undefined} className={`alert-metric-card is-${tone} ${active ? 'is-active' : ''}`} onClick={onClick}>
      <span className="alert-metric-icon"><Icon size={17} /></span>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </Tag>
  )
}

function AlertRow({
  alert,
  reviewed,
  onReviewed,
  onSelectEquipment,
}: {
  alert: SmartAlert
  reviewed: boolean
  onReviewed: () => void
  onSelectEquipment: (equipmentId: string) => void
}) {
  const t = useModuleT(alertsT)
  const equipment = extractAlertEquipment(alert)
  const severityName = normalizeSeverity(alert)
  const domain = getAlertDomain(alert)
  const action = getAlertAction(alert, t)

  return (
    <article
      className={`operational-alert-row alert-severity-${severityName.toLowerCase()} ${reviewed ? 'is-reviewed' : ''}`}
      style={{ borderLeftColor: severityColors[severityName] }}
    >
      {equipment && (
        <button
          className="alert-machine-thumb compact"
          type="button"
          onClick={() => onSelectEquipment(equipment.id)}
          aria-label={`Ver detalle operacional ${equipment.id}`}
        >
          <img src={equipment.image} alt={equipment.label} loading="lazy" />
          <span>{equipment.family}</span>
        </button>
      )}
      <button
        className="operational-alert-main"
        type="button"
        onClick={() => equipment && onSelectEquipment(equipment.id)}
      >
        <div className="operational-alert-copy">
          <div className="alert-row-meta">
            <AlertSeverityBadge severity={severityName} />
            <span>{getDomainLabels(t)[domain] ?? domain}</span>
            <span><Clock3 size={12} /> {relativeTime(alert.relative_minutes, t)}</span>
          </div>
          <h3>{getAlertTitle(alert, t)}</h3>
          <p>{getAlertDescription(alert, t)}</p>
          <small>{formatTimestamp(alert.timestamp, t)} / {alert.estado ?? 'ABIERTA'}</small>
          <div className="alert-row-action">
            <Zap size={13} />
            <span>{action}</span>
          </div>
        </div>
      </button>
      <button
        className="review-button"
        type="button"
        onClick={onReviewed}
      >
        <CheckCircle2 size={14} /> {reviewed ? 'Revisado' : 'Marcar'}
      </button>
    </article>
  )
}

export function Alerts() {
  const t = useModuleT(alertsT)
  const [severity, setSeverity] = useState<(typeof filters)[number]>('TODAS')
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null)
  const [reviewed, setReviewed] = useState<Set<string>>(() => new Set())
  const query = useQuery({ queryKey: ['operational-alerts'], queryFn: () => getOperationalAlerts(), refetchInterval: 60000 })

  const sortedAlerts = useMemo(() => sortAlerts(query.data?.items ?? [], t), [query.data?.items, t])
  const filtered = useMemo(() => {
    return severity === 'TODAS' ? sortedAlerts : sortedAlerts.filter((item) => normalizeSeverity(item) === severity)
  }, [sortedAlerts, severity])

  const weekdayOption = useMemo(() => query.data ? buildWeekdayOption(query.data, t) : undefined, [query.data, t])
  const destinationOption = useMemo(() => query.data ? buildDestinationOption(query.data.destination_distribution, t) : undefined, [query.data, t])
  const grouped = useMemo(() => groupAlertsByDomain(filtered), [filtered])
  const priorityActions = useMemo(() => sortAlerts(filtered, t).slice(0, 5), [filtered, t])

  if (query.isLoading) return <LoadingState label="Cargando alertas operacionales..." />
  if (query.isError || !query.data) return <ErrorState detail="No se pudo cargar /api/alerts/operational." />

  const data = query.data
  const summary = buildExecutiveSummary(data, t)
  const diagnosis = buildOperationalDiagnosis(data, summary, t)
  const destinationTotal = data.destination_distribution.reduce((acc, item) => acc + item.porcentaje, 0)
  const prioritySeverity = summary.priority ? normalizeSeverity(summary.priority) : 'BAJA'
  const sourceLabel = formatSource(data.source, t)

  return (
    <>
      <div className="module-page operational-alerts-page">
        <ModuleHeader
          icon={Bell}
          eyebrow="Alertas"
          title="Alertas operacionales"
          description="Prioridad, causa probable y accion inmediata sobre flota, carguio, destinos y productividad."
          meta={`${sourceLabel} / Actualizado ${formatTimestamp(data.generated_at, t)}`}
          actions={
            <div className="filter-bar">
              {filters.map((filter) => (
                <button key={filter} className={severity === filter ? 'active' : ''} onClick={() => setSeverity(filter)}>
                  {filter}
                </button>
              ))}
            </div>
          }
        />

        <section className={`alerts-command-panel panel priority-${prioritySeverity.toLowerCase()}`}>
          <div className="alerts-command-copy">
            <span className="panel-kicker">Lectura ejecutiva</span>
            <h2>{diagnosis.title}</h2>
            <p>{diagnosis.description}</p>
            <div className="alerts-command-tags">
              <span>{sourceLabel}</span>
              <span>{data.count} alertas abiertas</span>
              <span>{summary.affectedEquipment} equipos afectados</span>
              <span>{summary.noContributionCount} sin aporte o posible averia</span>
              <span>{summary.loadingAlerts} foco{summary.loadingAlerts === 1 ? '' : 's'} de carguio</span>
              {summary.topDestination && <span>Destino lider: {summary.topDestination.destino} ({summary.topDestination.porcentaje}%)</span>}
            </div>
          </div>
          <div className="alerts-priority-card">
            <div className="alerts-priority-head">
              <span>Prioridad inmediata</span>
              <AlertSeverityBadge severity={prioritySeverity} />
            </div>
            <strong>{diagnosis.action}</strong>
            <small>{summary.priority ? `${getAlertDomain(summary.priority)} / ${relativeTime(summary.priority.relative_minutes, t)}` : 'Sin accion critica activa.'}</small>
            {summary.priority && ['CRITICA', 'ALTA'].includes(prioritySeverity) && (
              <NorthmineAI
                tipo="alerta"
                label="Analizar prioridad con IA"
                contexto={{
                  severidad: prioritySeverity,
                  descripcion: getAlertDescription(summary.priority, t),
                  equipo: summary.priority.equipment_id ?? extractAlertEquipment(summary.priority)?.id ?? '',
                  ultima_actividad: relativeTime(summary.priority.relative_minutes, t),
                  turno: 'ACTUAL',
                  hora_actual: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
                }}
              />
            )}
          </div>
        </section>

        <section className="alerts-executive-grid">
          <AlertMetricCard
            icon={AlertTriangle}
            label="Criticas"
            value={data.counts.CRITICA ?? 0}
            detail="requieren accion inmediata"
            tone="red"
            active={severity === 'CRITICA'}
            onClick={() => setSeverity(severity === 'CRITICA' ? 'TODAS' : 'CRITICA')}
          />
          <AlertMetricCard
            icon={Zap}
            label="Altas"
            value={data.counts.ALTA ?? 0}
            detail="priorizar dentro del turno"
            tone="orange"
            active={severity === 'ALTA'}
            onClick={() => setSeverity(severity === 'ALTA' ? 'TODAS' : 'ALTA')}
          />
          <AlertMetricCard
            icon={Truck}
            label="CAEX bajo 80%"
            value={data.low_caex.length}
            detail={summary.worstLowCaex ? `${summary.worstLowCaex.caex_id} menor aporte` : 'sin foco bajo promedio'}
            tone="yellow"
          />
          <AlertMetricCard
            icon={Activity}
            label="Equipos afectados"
            value={summary.affectedEquipment}
            detail="con alerta asociada"
            tone="cyan"
          />
          <AlertMetricCard
            icon={MapPinned}
            label="Destino lider"
            value={summary.topDestination ? `${summary.topDestination.porcentaje}%` : 'N/D'}
            detail={summary.topDestination?.destino ?? 'sin distribucion'}
            tone={summary.topDestination && summary.topDestination.porcentaje > 70 ? 'yellow' : 'green'}
          />
        </section>

        <section className="alerts-action-queue panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Orden operacional</span>
              <h2>Que atender primero</h2>
            </div>
            <span className="panel-tag">{priorityActions.length} acciones priorizadas</span>
          </div>
          {!priorityActions.length ? <EmptyState title="Sin acciones abiertas para el filtro activo." /> : (
            <div className="alerts-action-list">
              {priorityActions.map((alert, index) => {
                const severityName = normalizeSeverity(alert)
                const equipment = extractAlertEquipment(alert)
                return (
                  <button
                    key={alert.id}
                    type="button"
                    className={`alerts-action-item is-${severityName.toLowerCase()}`}
                    onClick={() => equipment && setSelectedEquipmentId(equipment.id)}
                    disabled={!equipment}
                  >
                    <span className="alerts-action-rank">{index + 1}</span>
                    <span className="alerts-action-copy">
                      <strong>{getAlertTitle(alert, t)}</strong>
                      <small>{getAlertDomain(alert)} / {equipment?.id ?? 'sin equipo'} / {relativeTime(alert.relative_minutes, t)}</small>
                    </span>
                    <span className="alerts-action-next">{getAlertAction(alert, t)}</span>
                    <span className="alerts-action-impact">{alertImpactLabel(alert, data, t)}</span>
                    <AlertSeverityBadge severity={severityName} />
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className="alerts-work-grid">
          <div className="panel">
            <div className="panel-header">
              <div><span className="panel-kicker">Alertas ordenadas</span><h2>Plan de accion por dominio</h2></div>
              <span className="panel-tag">{filtered.length} visibles</span>
            </div>
            {!filtered.length ? <EmptyState /> : (
              <div className="alert-domain-grid">
                {Object.entries(grouped).map(([domain, alerts]) => {
                  const DomainIcon = domainIcons[domain] ?? Bell
                  return (
                    <section key={domain} className="alert-domain-column">
                      <div className="alert-domain-title">
                        <span><DomainIcon size={15} /> {getDomainLabels(t)[domain] ?? domain}</span>
                        <strong>{alerts.length}</strong>
                      </div>
                      <div className="alert-domain-list">
                        {alerts.map((alert) => (
                          <AlertRow
                            key={alert.id}
                            alert={alert}
                            reviewed={reviewed.has(alert.id)}
                            onReviewed={() => setReviewed((prev) => new Set(prev).add(alert.id))}
                            onSelectEquipment={setSelectedEquipmentId}
                          />
                        ))}
                      </div>
                    </section>
                  )
                })}
              </div>
            )}
          </div>

          <aside className="panel alerts-low-panel">
            <div className="panel-header">
              <div><span className="panel-kicker">CAEX bajo promedio</span><h2>Equipos a revisar</h2></div>
              <span className="panel-tag">{data.low_caex.length} equipos</span>
            </div>
            <div className="low-caex-list">
              {data.low_caex.map((item, index) => (
                <button key={item.caex_id} type="button" onClick={() => setSelectedEquipmentId(item.caex_id)}>
                  <span className="low-caex-rank">{index + 1}</span>
                  <span>
                    <strong>{item.caex_id}</strong>
                    <small>{item.modelo} / ultimo ciclo {relativeTime(Math.max(0, Math.floor((Date.now() - new Date(item.ultimo_ciclo).getTime()) / 60000)), t)}</small>
                  </span>
                  <span>
                    {formatTons(item.toneladas)}
                    <small>{item.porcentaje_promedio}% del promedio</small>
                  </span>
                  <i style={{ width: `${Math.min(100, Math.max(4, item.porcentaje_promedio))}%` }} />
                  <b className={`low-caex-${item.badge.toLowerCase()}`}>{item.badge}</b>
                </button>
              ))}
              {!data.low_caex.length && <div className="executive-empty-state is-small">Sin CAEX bajo el umbral del filtro activo.</div>}
            </div>
          </aside>
        </section>

        <section className="two-column alerts-analytics-grid">
          <div className="panel">
            <div className="panel-header">
              <div><span className="panel-kicker">Patron semanal</span><h2>Produccion por dia de semana</h2></div>
              <span className="panel-tag">Mejor {data.best_weekday.label}</span>
            </div>
            <div className="alerts-chart">
              {weekdayOption && <ReactECharts option={weekdayOption} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} />}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div><span className="panel-kicker">Destinos</span><h2>Concentracion de material</h2></div>
              <span className="panel-tag">Suma {destinationTotal.toFixed(1)}%</span>
            </div>
            <div className="alerts-chart">
              {destinationOption && <ReactECharts option={destinationOption} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} />}
            </div>
          </div>
        </section>
      </div>

      <EquipmentDetailDrawer
        equipmentId={selectedEquipmentId}
        open={Boolean(selectedEquipmentId)}
        onClose={() => setSelectedEquipmentId(null)}
      />
    </>
  )
}
