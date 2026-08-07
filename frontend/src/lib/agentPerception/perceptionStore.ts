import { create } from 'zustand'
import type { PerceptionMode, VisualObservation, VisualCaptureFailureReason } from './types'
import { getPerceptionMode } from './privacy'

/**
 * Estado de percepcion visible para React (Etapa 5). Separado de
 * runtimeStore (Etapa 4) a proposito: la percepcion es un concern propio
 * (Nivel 1/2/3), no parte de la maquina de estados de la investigacion -
 * una captura visual puede ocurrir con el Runtime en 'idle'.
 */

interface PerceptionConflictView {
  conflictId: string
  description: string
  uiValue: unknown
  backendValue: unknown
  widgetId: string | null
}

interface PerceptionStoreState {
  mode: PerceptionMode
  isCapturing: boolean
  isAnalyzing: boolean
  lastObservation: VisualObservation | null
  lastConflict: PerceptionConflictView | null
  lastCaptureError: { reason: VisualCaptureFailureReason; message: string } | null
  lastCaptureUrl: string | null
  currentModuleId: string | null
  focusedWidgetId: string | null

  setMode: (mode: PerceptionMode) => void
  setCapturing: (value: boolean) => void
  setAnalyzing: (value: boolean) => void
  setObservation: (observation: VisualObservation | null) => void
  setConflict: (conflict: PerceptionConflictView | null) => void
  setCaptureError: (error: { reason: VisualCaptureFailureReason; message: string } | null) => void
  setCaptureUrl: (url: string | null) => void
  setScreenState: (moduleId: string | null, focusedWidgetId: string | null) => void
}

export const usePerceptionStore = create<PerceptionStoreState>((set, get) => ({
  mode: getPerceptionMode(),
  isCapturing: false,
  isAnalyzing: false,
  lastObservation: null,
  lastConflict: null,
  lastCaptureError: null,
  lastCaptureUrl: null,
  currentModuleId: null,
  focusedWidgetId: null,

  setMode: (mode) => set({ mode }),
  setCapturing: (value) => set({ isCapturing: value }),
  setAnalyzing: (value) => set({ isAnalyzing: value }),
  setObservation: (observation) => set({ lastObservation: observation, lastCaptureError: null }),
  setConflict: (conflict) => set({ lastConflict: conflict }),
  setCaptureError: (error) => set({ lastCaptureError: error }),
  setCaptureUrl: (url) => {
    const previous = get().lastCaptureUrl
    if (previous) URL.revokeObjectURL(previous)
    set({ lastCaptureUrl: url })
  },
  setScreenState: (moduleId, focusedWidgetId) => set({ currentModuleId: moduleId, focusedWidgetId }),
}))
