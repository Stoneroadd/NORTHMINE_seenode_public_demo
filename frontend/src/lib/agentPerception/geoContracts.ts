import type { AgentWidgetSnapshot } from '../agentRegistry/types'

/**
 * Contrato semantico generico para widgets tipo mapa (Etapa 5, seccion
 * Leaflet/Vista Aerea del brief). Este contrato existe para que un futuro
 * visor georreferenciado real (con coordenadas de equipos) pueda declarar
 * su estado sin romper el contrato de percepcion - hoy NINGUN modulo de
 * NORTHMINE lo llena completo:
 *
 * Vista Aerea (AerialPage/OrthomosaicViewer) es un visor de imagen (zoom/pan
 * sobre un JPEG generado desde el TIF), no un mapa Leaflet georreferenciado,
 * y el backend no expone coordenadas de equipos para esta vista. Por eso
 * `MapWidgetSnapshot.geo` es `null` hasta que esa capacidad exista de verdad
 * - nunca se inventa un centro/zoom/marker para aparentar una capacidad que
 * no esta implementada.
 */

export interface MapLatLngBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface MapMarker {
  id: string
  label: string
  lat: number
  lng: number
  entityType?: string
  entityId?: string
}

export interface MapGeoState {
  center: { lat: number; lng: number }
  zoomLevel: number
  bounds: MapLatLngBounds
  markers: MapMarker[]
}

export interface MapWidgetSnapshot extends AgentWidgetSnapshot {
  type: 'map'
  /** null mientras el visor no sea un mapa georreferenciado real (ver comentario arriba). */
  geo: MapGeoState | null
  imageZoomPercent?: number
  activeFileName?: string | null
}
