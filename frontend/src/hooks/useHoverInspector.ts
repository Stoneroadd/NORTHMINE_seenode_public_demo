import { useCallback, useState } from 'react'

export interface InspectorItem {
  module: string
  title: string
  kpi: string
  state?: 'normal' | 'warning' | 'critical' | 'success'
  recommendation?: string
  risk?: string
  timestamp?: string
}

const defaultInspector: InspectorItem = {
  module: 'NORTHMINE Command Center',
  title: 'Sistema operacional en monitoreo',
  kpi: 'Datos operacionales sincronizados',
  state: 'success',
  recommendation: 'Pasa el puntero sobre un modulo para inspeccionar contexto operacional.',
  risk: 'Sin riesgo critico activo',
}

export function useHoverInspector(initial: InspectorItem = defaultInspector) {
  const [item, setItem] = useState(initial)

  const inspect = useCallback((next: InspectorItem) => {
    setItem({
      timestamp: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      ...next,
    })
  }, [])

  const reset = useCallback(() => setItem(initial), [initial])

  return { item, inspect, reset }
}

