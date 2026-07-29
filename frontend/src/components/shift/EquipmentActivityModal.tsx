import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { formatNumber, formatTons } from '../cockpit/cockpitModel'
import { getEquipmentImage, getEquipmentLabel } from '../../data/equipmentAssets'
import {
  northmineApi,
  type ShiftComparisonEquipmentHourlyPoint,
  type ShiftComparisonEquipmentPoint,
  type ShiftComparisonEquipmentStatusBreakdown,
  type ShiftComparisonResponse,
} from '../../lib/api'

// Actividad WENCO completa de un equipo en el turno vigente: descargas,
// destinos, estados (demoras, colacion, averias/mantencion) y hora a hora.
// Se abre al presionar un equipo en el modulo Turno Actual.

export interface EquipmentActivityTarget {
  id: string
  model?: string
  type: 'loader' | 'truck'
}

interface Props {
  target: EquipmentActivityTarget
  onClose: () => void
}

function currentShiftOf(data: ShiftComparisonResponse): 'DIA' | 'NOCHE' {
  return data.operational_context?.turno_nombre === 'DIA' ? 'DIA' : 'NOCHE'
}

function rowStatuses(
  row: ShiftComparisonEquipmentHourlyPoint,
  shift: 'DIA' | 'NOCHE',
): ShiftComparisonEquipmentStatusBreakdown[] {
  return (shift === 'DIA' ? row.dia_status_breakdown : row.noche_status_breakdown) ?? []
}

function mergeStatuses(
  rows: ShiftComparisonEquipmentHourlyPoint[],
  shift: 'DIA' | 'NOCHE',
): ShiftComparisonEquipmentStatusBreakdown[] {
  const merged = new Map<string, ShiftComparisonEquipmentStatusBreakdown>()
  for (const row of rows) {
    for (const status of rowStatuses(row, shift)) {
      const current = merged.get(status.code)
      if (!current) {
        merged.set(status.code, { ...status, pct: undefined })
      } else {
        current.minutes += status.minutes
        current.occurrences = (current.occurrences ?? 0) + (status.occurrences ?? 0)
      }
    }
  }
  const total = [...merged.values()].reduce((sum, status) => sum + status.minutes, 0)
  return [...merged.values()]
    .map(status => ({
      ...status,
      minutes: Math.round(status.minutes * 10) / 10,
      pct: total > 0 ? Math.round((status.minutes / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes)
}

function isColacion(status: ShiftComparisonEquipmentStatusBreakdown): boolean {
  return status.code === 'O02' || status.description.toUpperCase().includes('COLACION')
}

function minutesLabel(value: number): string {
  if (value >= 60) return `${Math.floor(value / 60)}h ${String(Math.round(value % 60)).padStart(2, '0')}m`
  return `${formatNumber(value, value < 10 ? 1 : 0)} min`
}

export function EquipmentActivityModal({ target, onClose }: Props) {
  const query = useQuery({
    queryKey: ['shift-comparison', 'equipment-activity'],
    queryFn: () => northmineApi.shiftComparison(),
    staleTime: 30000,
    refetchInterval: 60000,
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [onClose])

  const data = query.data
  const shift: 'DIA' | 'NOCHE' = data ? currentShiftOf(data) : 'NOCHE'

  const item: ShiftComparisonEquipmentPoint | null = useMemo(() => {
    if (!data) return null
    const pool = target.type === 'loader' ? data.loading_units : data.caex
    return pool.find(entry => entry.id.toUpperCase() === target.id.toUpperCase()) ?? null
  }, [data, target])

  const hourlyRows = useMemo(() => {
    if (!data) return []
    const pool = target.type === 'loader' ? (data.loading_unit_hourly ?? []) : (data.caex_hourly ?? [])
    return pool.filter(row => row.equipment_id.toUpperCase() === target.id.toUpperCase())
  }, [data, target])

  const statuses = useMemo(() => mergeStatuses(hourlyRows, shift), [hourlyRows, shift])

  const tonnes = item ? (shift === 'DIA' ? item.dia_tonnes : item.noche_tonnes) : 0
  const cycles = item ? (shift === 'DIA' ? item.dia_cycles : item.noche_cycles) : 0
  const operator = item ? (shift === 'DIA' ? item.dia_operator : item.noche_operator) ?? item.operator : null
  const destinations = item
    ? (shift === 'DIA' ? item.dia_destination_breakdown : item.noche_destination_breakdown)
      ?? item.destination_breakdown ?? []
    : []
  const bench = item
    ? (shift === 'DIA' ? item.dia_bench_mesh : item.noche_bench_mesh) ?? item.bench_mesh
    : null
  const avgDistanceKm = item
    ? (shift === 'DIA' ? item.dia_avg_distance_km : item.noche_avg_distance_km) ?? item.avg_distance_km
    : null
  const visualModel = target.model ?? item?.model
  const equipmentImage = getEquipmentImage(target.id, visualModel)
  const equipmentLabel = getEquipmentLabel(target.id, visualModel)

  const maintenanceMinutes = statuses.filter(s => s.category === 'MANTENCION').reduce((sum, s) => sum + s.minutes, 0)
  const colacionMinutes = statuses.filter(isColacion).reduce((sum, s) => sum + s.minutes, 0)
  const delayMinutes = statuses
    .filter(s => (s.category === 'STANDBY' || s.category === 'OPERACIONAL') && !isColacion(s))
    .reduce((sum, s) => sum + s.minutes, 0)

  const activeHours = hourlyRows.filter(row => {
    const rowTonnes = shift === 'DIA' ? row.dia_tonnes : row.noche_tonnes
    const rowCycles = shift === 'DIA' ? row.dia_cycles : row.noche_cycles
    return rowTonnes > 0 || rowCycles > 0 || rowStatuses(row, shift).length > 0
  })

  const modal = (
    <div className="nmcp-detail-layer nm-shift-activity-layer" role="dialog" aria-modal="true" aria-label={`Actividad WENCO ${target.id}`}>
      <button className="nmcp-detail-backdrop" type="button" onClick={onClose} aria-label="Cerrar detalle" />
      <aside className="nmcp-detail-modal nm-shift-activity-modal">
        <header className="nmcp-detail-header">
          <div className="nmcp-shift-detail-title">
            <span className={`nmcp-equipment-visual is-${target.type}`}>
              <img
                className="nm-shift-modal-equipment-img"
                src={equipmentImage}
                alt={equipmentLabel}
                loading="eager"
              />
            </span>
            <div>
              <span className="nmcp-section-kicker">Actividad WENCO / Turno {shift}</span>
              <h2>{target.id}</h2>
              <p>{target.model ?? item?.model ?? 'Sin modelo'}{bench ? ` - ${bench}` : ''}</p>
              <p>Operador: {operator ?? 'Sin dato'}</p>
            </div>
          </div>
          <button className="nmcp-icon-button" type="button" onClick={onClose} aria-label="Cerrar detalle">
            <X size={17} />
          </button>
        </header>

        {query.isLoading && <div className="nmcp-detail-empty">Cargando actividad WENCO...</div>}
        {query.isError && <div className="nmcp-detail-empty">No se pudo cargar /api/shift-comparison. Reintenta.</div>}
        {data && !item && (
          <div className="nmcp-detail-empty">
            {target.id} sin ciclos registrados en el turno {shift}. WENCO no entrego actividad para este equipo.
          </div>
        )}

        {item && (
          <>
            <div className="nmcp-detail-kpis">
              <span><small>Toneladas</small><strong>{formatTons(tonnes)}</strong></span>
              <span><small>Descargas</small><strong>{formatNumber(cycles)}</strong></span>
              <span><small>Distancia / ciclo</small><strong>{avgDistanceKm != null ? `${formatNumber(avgDistanceKm, 1)} km` : 'Sin dato'}</strong></span>
              <span><small>Demoras</small><strong>{delayMinutes > 0 ? minutesLabel(delayMinutes) : 'Sin registro'}</strong></span>
              <span><small>Colacion</small><strong>{colacionMinutes > 0 ? minutesLabel(colacionMinutes) : 'Sin registro'}</strong></span>
              <span><small>Averia / Mantencion</small><strong>{maintenanceMinutes > 0 ? minutesLabel(maintenanceMinutes) : 'Sin registro'}</strong></span>
            </div>

            <section className="nmcp-status-detail-card">
              <div className="nmcp-panel-header">
                <div>
                  <span className="nmcp-section-kicker">Descargas por destino</span>
                  <h3>{target.id} / Turno {shift}</h3>
                </div>
                <span className="nmcp-panel-tag">{destinations.length ? `${destinations.length} destinos` : 'Sin destino'}</span>
              </div>
              {destinations.length ? (
                <div className="nm-activity-destinations">
                  {destinations.map(entry => (
                    <article key={entry.name}>
                      <b>{entry.name}</b>
                      <span>{formatTons(entry.tonnes)}</span>
                      <small>{formatNumber(entry.cycles)} descargas / {formatNumber(entry.pct, 1)}%</small>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="nmcp-detail-empty">Sin destinos registrados para este turno.</div>
              )}
            </section>

            <section className="nmcp-status-detail-card">
              <div className="nmcp-panel-header">
                <div>
                  <span className="nmcp-section-kicker">Estados WENCO</span>
                  <h3>Demoras, colacion, averias y operacion</h3>
                </div>
                <span className="nmcp-panel-tag">{statuses.length ? `${statuses.length} estados` : 'Sin estado'}</span>
              </div>
              {statuses.length ? (
                <div className="nmcp-status-grid">
                  {statuses.slice(0, 12).map(status => (
                    <article key={status.code} className={`nmcp-status-chip is-${status.category.toLowerCase()}`}>
                      <b>{status.code}</b>
                      <span>{status.description}</span>
                      <small>{minutesLabel(status.minutes)} / {formatNumber(status.pct ?? 0, 1)}%</small>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="nmcp-detail-empty">WENCO no entrego transiciones de estado para este equipo en el turno.</div>
              )}
            </section>

            <section className="nmcp-status-detail-card">
              <div className="nmcp-panel-header">
                <div>
                  <span className="nmcp-section-kicker">Hora a hora</span>
                  <h3>Actividad del turno</h3>
                </div>
                <span className="nmcp-panel-tag">{activeHours.length} horas con registro</span>
              </div>
              {activeHours.length ? (
                <div className="nm-activity-hours">
                  {activeHours.map(row => {
                    const rowTonnes = shift === 'DIA' ? row.dia_tonnes : row.noche_tonnes
                    const rowCycles = shift === 'DIA' ? row.dia_cycles : row.noche_cycles
                    const hour = shift === 'DIA' ? row.dia_hour : row.noche_hour
                    const origin = (shift === 'DIA' ? row.dia_origin : row.noche_origin) ?? 'Sin origen'
                    const destination = (shift === 'DIA' ? row.dia_destination : row.noche_destination) ?? 'Sin destino'
                    const rowDistance = shift === 'DIA' ? row.dia_distance_km : row.noche_distance_km
                    const topStatuses = rowStatuses(row, shift).slice(0, 2)
                    return (
                      <article key={row.slot}>
                        <span className="nm-activity-hour">
                          <b>{row.label}</b>
                          <small>{hour}</small>
                        </span>
                        <span className="nm-activity-route">
                          <small>{origin}</small>
                          <small>{destination}</small>
                        </span>
                        <span className="nm-activity-tons">
                          <b>{formatTons(rowTonnes)}</b>
                          <small>{formatNumber(rowCycles)} descargas{rowDistance != null ? ` / ${formatNumber(rowDistance, 1)} km/ciclo` : ''}</small>
                        </span>
                        <span className="nm-activity-status">
                          {topStatuses.length
                            ? topStatuses.map(status => (
                              <small key={status.code} className={`is-${status.category.toLowerCase()}`}>
                                {status.code} {status.description} / {minutesLabel(status.minutes)}
                              </small>
                            ))
                            : <small className="is-operacion">Operacion continua</small>}
                        </span>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="nmcp-detail-empty">Sin actividad horaria registrada en el turno.</div>
              )}
            </section>
          </>
        )}
      </aside>
    </div>
  )

  return createPortal(modal, document.body)
}
