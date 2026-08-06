import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, RefreshCcw, ShieldCheck, Timer, Truck, Wrench } from 'lucide-react'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { ExecutiveKpiCard } from '../components/kpi/ExecutiveKpiCard'
import { EquipmentDetailDrawer } from '../components/equipment/detail/EquipmentDetailDrawer'
import { getFleetStatus } from '../services/fleetService'
import { getShiftExport, type FleetEquipment } from '../lib/api'
import { useModuleT } from '../i18n/useModuleT'
import { fleetT, type FleetT } from '../i18n/modules/fleet'
import { useAgentWidget } from '../lib/agentRegistry/useAgentWidget'
import type { AgentWidgetSnapshot } from '../lib/agentRegistry/types'

type StatusFilter = 'TODOS' | 'ACTIVO' | 'STANDBY' | 'DEMORA' | 'MANTENCION' | 'SIN ACTIVIDAD'
type SortKey = 'caex_id' | 'estado' | 'toneladas' | 'ciclos' | 'minutos_sin_actividad' | 'status_code'
type SortDirection = 'asc' | 'desc'

const statusFilters: StatusFilter[] = ['TODOS', 'ACTIVO', 'STANDBY', 'DEMORA', 'MANTENCION', 'SIN ACTIVIDAD']

function tons(value?: number | null) {
  return `${Math.round(value ?? 0).toLocaleString('es-CL')} t`
}

function number(value?: number | null, digits = 0) {
  return (value ?? 0).toLocaleString('es-CL', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function minutes(value?: number | null) {
  const raw = Math.max(0, Math.round(value ?? 0))
  if (raw < 60) return `${raw} min`
  const hours = Math.floor(raw / 60)
  const mins = raw % 60
  return mins ? `${hours}h ${mins}m` : `${hours}h`
}

function statusClass(value?: string | null) {
  return `fleet-status-${String(value || 'sin-dato').toLowerCase().replace(/\s+/g, '-')}`
}

function isStandby(item: FleetEquipment) {
  return (
    item.estado === 'STANDBY' ||
    item.status_category === 'STANDBY' ||
    String(item.status_code || '').toUpperCase().startsWith('S')
  )
}

function operationalStatus(item: FleetEquipment) {
  if (isStandby(item)) return 'STANDBY'
  return item.estado || 'SIN DATO'
}

function statusDetail(item: FleetEquipment, t: FleetT) {
  if (item.status_code || item.status_desc) {
    return [item.status_code, item.status_desc].filter(Boolean).join(' - ')
  }
  return item.alerta || t.no_substate
}

async function downloadCsv(setLoading: (value: boolean) => void) {
  setLoading(true)
  try {
    const blob = await getShiftExport('caex')
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'northmine_flota_status_actual.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  } finally {
    setLoading(false)
  }
}

function FleetStatusCard({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: StatusFilter
  value: number
  tone: string
  active: boolean
  onClick: () => void
}) {
  const t = useModuleT(fleetT)
  return (
    <button type="button" className={`fleet-status-filter ${tone} ${active ? 'is-active' : ''}`} onClick={onClick}>
      <span>{t.status_label(label)}</span>
      <strong>{value}</strong>
    </button>
  )
}

export function FleetPage() {
  const t = useModuleT(fleetT)
  const [exporting, setExporting] = useState(false)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusFilter>('TODOS')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('caex_id')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const query = useQuery({
    queryKey: ['fleet-status-current', 'ACTUAL'],
    queryFn: () => getFleetStatus('ACTUAL'),
    refetchInterval: 60000,
  })

  const data = query.data
  const rows = data?.lista_equipos ?? []
  const statusCounts = useMemo(() => {
    const base: Record<StatusFilter, number> = {
      TODOS: rows.length,
      ACTIVO: 0,
      STANDBY: 0,
      DEMORA: 0,
      MANTENCION: 0,
      'SIN ACTIVIDAD': 0,
    }
    rows.forEach((item) => {
      const state = operationalStatus(item)
      if (state in base) base[state as StatusFilter] += 1
    })
    return base
  }, [rows])

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toUpperCase()
    const filtered = rows.filter((item) => {
      const state = operationalStatus(item)
      const matchesStatus = status === 'TODOS' || state === status
      const text = [
        item.caex_id,
        item.modelo,
        item.operador,
        item.carguio_actual,
        item.destino_actual,
        item.status_code,
        item.status_desc,
      ].filter(Boolean).join(' ').toUpperCase()
      return matchesStatus && (!normalizedSearch || text.includes(normalizedSearch))
    })

    return [...filtered].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1
      const left = sortKey === 'estado' ? operationalStatus(a) : a[sortKey] ?? ''
      const right = sortKey === 'estado' ? operationalStatus(b) : b[sortKey] ?? ''
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction
      return String(left).localeCompare(String(right)) * direction
    })
  }, [rows, search, sortDirection, sortKey, status])

  const standbyRows = useMemo(() => rows.filter(isStandby), [rows])
  const activeRows = useMemo(() => rows.filter((item) => operationalStatus(item) === 'ACTIVO'), [rows])
  const latestRecord = useMemo(() => {
    const timestamps = rows.map((item) => item.ultimo_registro || item.ultima_actividad).filter(Boolean)
    const sorted = timestamps.sort()
    return sorted.length ? new Date(sorted[sorted.length - 1] as string).toLocaleString('es-CL') : t.no_record
  }, [rows, t])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortKey(key)
    setSortDirection(key === 'caex_id' || key === 'estado' ? 'asc' : 'desc')
  }

  const fleetTableWidget = useAgentWidget({
    id: 'fleet-status-table',
    moduleId: 'flota',
    type: 'table',
    label: t.panel_full_list,
    description: 'Estado, tonelaje y ciclos de cada CAEX del turno actual.',
    supportedActions: ['focus_widget', 'explain_widget'],
    getSnapshot: (): AgentWidgetSnapshot => ({
      widgetId: 'fleet-status-table',
      type: 'table',
      label: t.panel_full_list,
      updatedAt: new Date().toISOString(),
      columns: ['caex_id', 'estado', 'toneladas', 'ciclos', 'minutos_sin_actividad'],
      rowCount: filteredRows.length,
      filters: { status, search: search || undefined },
      statusCounts,
    }),
  })

  if (query.isLoading) return <LoadingState label={t.loading_label} />
  if (query.isError || !data) return <ErrorState detail={t.error_detail} onRetry={() => query.refetch()} />

  const dataSource = data.source === 'wenco-sql-live' ? t.live_wenco : String(data.source || 'API').toUpperCase()

  return (
    <>
      <div className="module-page fleet-status-page">
        <ModuleHeader
          icon={Truck}
          eyebrow={t.eyebrow}
          title={t.title}
          description={t.description}
          meta={t.meta(dataSource, latestRecord)}
          actions={
            <>
              <button className="command-button command-button-secondary" type="button" onClick={() => query.refetch()}>
                <RefreshCcw size={15} className={query.isFetching ? 'is-spinning' : undefined} />
                {t.refresh}
              </button>
              <button className="command-button command-button-secondary" type="button" onClick={() => downloadCsv(setExporting)} disabled={exporting}>
                <Download size={15} />
                {exporting ? t.exporting : t.export_csv}
              </button>
            </>
          }
        />

        <section className="kpi-grid compact">
          <ExecutiveKpiCard title={t.kpi_caex_total_title} value={`${data.total_equipos}`} subtitle={t.kpi_caex_total_subtitle} trend={t.kpi_caex_total_trend(filteredRows.length)} tone="cyan" icon={Truck} />
          <ExecutiveKpiCard title={t.kpi_active_title} value={`${data.equipos_activos}`} subtitle={t.kpi_active_subtitle} trend={t.kpi_active_trend(number(data.utilizacion_pct, 1))} tone="green" icon={ShieldCheck} />
          <ExecutiveKpiCard title={t.kpi_standby_title} value={`${data.equipos_standby ?? standbyRows.length}`} subtitle={t.kpi_standby_subtitle} trend={t.kpi_standby_trend} tone="slate" icon={Timer} />
          <ExecutiveKpiCard title={t.kpi_maint_title} value={`${data.equipos_mantencion + data.equipos_en_demora}`} subtitle={t.kpi_maint_subtitle(data.equipos_mantencion, data.equipos_en_demora)} trend={t.kpi_maint_trend(number(data.disponibilidad_pct, 1))} tone="amber" icon={Wrench} />
        </section>

        <section className="fleet-status-board">
          {statusFilters.map((item) => (
            <FleetStatusCard
              key={item}
              label={item}
              value={statusCounts[item]}
              active={status === item}
              tone={`tone-${item.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setStatus(item)}
            />
          ))}
        </section>

        <section className="fleet-status-layout">
          <div className="panel fleet-status-table-panel" ref={fleetTableWidget.ref}>
            <div className="panel-header">
              <div>
                <span className="panel-kicker">{t.panel_current_status}</span>
                <h2>{t.panel_full_list}</h2>
              </div>
              <div className="fleet-table-tools">
                <input value={search} onChange={(event) => setSearch(event.target.value.toUpperCase())} placeholder={t.search_placeholder} />
                <span className="panel-tag">{t.panel_tag_equipos(filteredRows.length)}</span>
              </div>
            </div>

            <div className="table-wrap fleet-ranking-table fleet-status-table">
              <table>
                <thead>
                  <tr>
                    {[
                      ['caex_id', t.col_caex],
                      ['estado', t.col_estado],
                      ['status_code', t.col_substate],
                      ['toneladas', t.col_tonnage],
                      ['ciclos', t.col_cycles],
                      ['minutos_sin_actividad', t.col_no_cycle],
                    ].map(([key, label]) => (
                      <th key={key}>
                        <button type="button" onClick={() => handleSort(key as SortKey)}>
                          {label} {sortKey === key ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                        </button>
                      </th>
                    ))}
                    <th>{t.col_operator}</th>
                    <th>{t.col_origin}</th>
                    <th>{t.col_destination}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((item) => {
                    const state = operationalStatus(item)
                    return (
                      <tr key={item.caex_id} onClick={() => setSelectedEquipmentId(item.caex_id)}>
                        <td><strong>{item.caex_id}</strong><small>{item.modelo}</small></td>
                        <td><span className={`fleet-status-pill ${statusClass(state)}`}>{state}</span></td>
                        <td><span className="fleet-status-detail">{statusDetail(item, t)}</span></td>
                        <td>{tons(item.toneladas)}</td>
                        <td>{number(item.ciclos)}</td>
                        <td>{minutes(item.minutos_sin_actividad)}</td>
                        <td>{item.operador || t.no_operator}</td>
                        <td>{item.carguio_actual || item.origen_principal || t.no_data}</td>
                        <td>{item.destino_actual || item.destino_principal || t.no_data}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="fleet-status-side">
            <div className="panel fleet-current-summary">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">{t.operational_reading}</span>
                  <h2>{t.fleet_status}</h2>
                </div>
                <span className="panel-tag">{dataSource}</span>
              </div>
              <div className="fleet-current-metrics">
                <span><small>{t.productive}</small><strong>{activeRows.length}</strong></span>
                <span><small>{t.standby}</small><strong>{standbyRows.length}</strong></span>
                <span><small>{t.no_activity}</small><strong>{data.equipos_sin_actividad}</strong></span>
                <span><small>{t.out_of_service}</small><strong>{data.equipos_mantencion + data.equipos_en_demora}</strong></span>
              </div>
              <p>
                {t.standby_explanation}
              </p>
            </div>

            <div className="panel fleet-standby-panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">{t.standby_slack}</span>
                  <h2>{t.caex_out_of_performance}</h2>
                </div>
                <span className="panel-tag">{standbyRows.length}</span>
              </div>
              {standbyRows.length ? (
                <div className="fleet-standby-list">
                  {standbyRows.slice(0, 8).map((item) => (
                    <button key={item.caex_id} type="button" onClick={() => setSelectedEquipmentId(item.caex_id)}>
                      <strong>{item.caex_id}</strong>
                      <span>{statusDetail(item, t)}</span>
                      <small>{item.operador || t.no_operator} · {minutes(item.minutos_sin_actividad)} {t.no_cycle_suffix}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="executive-empty-state">{t.no_standby}</div>
              )}
            </div>
          </aside>
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
