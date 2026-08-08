import type { AgentWidgetSnapshot } from '../agentRegistry/types'

/**
 * Contrato semantico para el widget "Mapa Operacional 3D" (Etapa 5, seccion
 * Three.js del brief). Documentado explicitamente porque el nombre invita a
 * confusion: esto es un grafo de conocimiento operacional renderizado en
 * Three.js (nodos = modulos/metricas de NORTHMINE, aristas = relaciones
 * entre ellos), NO una escena de terreno o equipos con posiciones fisicas
 * reales. No existen coordenadas de faena, GPS de equipos ni geometria de
 * rajo en esta vista - `nodePosition3d` referencial de layout (constelacion),
 * no una posicion geografica.
 */

export type MindMapNode3dPosition = { x: number; y: number; z?: number }

export interface SceneWidgetSnapshot extends AgentWidgetSnapshot {
  type: 'canvas'
  viewMode: string
  quality: string
  paused: boolean
  selectedNodeId: string | null
  selectedNodeLabel: string | null
  focusedNodeId: string | null
  nodesVisibleCount: number
  nodesTotalCount: number
  alertCount: number
  alertsCritical: boolean
  dataSource?: string
  backendStatus?: string
}
