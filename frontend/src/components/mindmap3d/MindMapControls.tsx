import { AlertTriangle, Pause, Play, RotateCcw, SlidersHorizontal } from 'lucide-react'
import type { MindMapQuality, MindMapViewMode } from './mindMapModel'
import { useModuleT } from '../../i18n/useModuleT'
import { mindmap3dT, type MindMap3dT } from '../../i18n/modules/mindmap3d'

interface Props {
  viewMode: MindMapViewMode
  quality: MindMapQuality
  paused: boolean
  alertCount: number
  alertsAreCritical: boolean
  onViewModeChange: (mode: MindMapViewMode) => void
  onQualityChange: (quality: MindMapQuality) => void
  onPausedChange: (paused: boolean) => void
  onReset: () => void
  onAlertTour: () => void
}

function buildViewModes(t: MindMap3dT): Array<{ id: MindMapViewMode; label: string }> {
  return [
    { id: 'CONSTELACION', label: t.view_constelacion },
    { id: 'RADIAL', label: t.view_radial },
    { id: 'FLUJO', label: t.view_flujo },
    { id: 'RIESGO', label: t.view_riesgo },
    { id: 'ECONOMIA', label: t.view_economia },
  ]
}

function buildQualityModes(t: MindMap3dT): Array<{ id: MindMapQuality; label: string }> {
  return [
    { id: 'AUTO', label: t.quality_auto },
    { id: 'ALTA', label: t.quality_alta },
    { id: 'MEDIA', label: t.quality_media },
    { id: 'BAJA', label: t.quality_baja },
  ]
}

export function MindMapControls({
  viewMode,
  quality,
  paused,
  alertCount,
  alertsAreCritical,
  onViewModeChange,
  onQualityChange,
  onPausedChange,
  onReset,
  onAlertTour,
}: Props) {
  const t = useModuleT(mindmap3dT)
  const viewModes = buildViewModes(t)
  const qualityModes = buildQualityModes(t)
  return (
    <div className="nm-map-controls" aria-label={t.controls_aria_label}>
      <div className="nm-map-control-group">
        <span>{t.controls_modo}</span>
        <div className="nm-map-segmented">
          {viewModes.map(mode => (
            <button
              key={mode.id}
              type="button"
              className={viewMode === mode.id ? 'is-active' : ''}
              onClick={() => onViewModeChange(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="nm-map-control-group is-compact">
        <span><SlidersHorizontal size={13} /> {t.controls_calidad}</span>
        <select value={quality} onChange={event => onQualityChange(event.target.value as MindMapQuality)}>
          {qualityModes.map(mode => (
            <option key={mode.id} value={mode.id}>{mode.label}</option>
          ))}
        </select>
      </div>

      <button
        className={`nm-map-tool-button ${alertsAreCritical ? 'is-alert' : ''}`}
        type="button"
        onClick={onAlertTour}
        disabled={alertCount === 0}
        title={alertCount === 0 ? t.controls_sin_alertas_title : t.controls_enfocar_title}
      >
        <AlertTriangle size={16} />
        {alertCount === 0 ? t.controls_sin_alertas : t.controls_recorrer_alertas(alertCount)}
      </button>
      <button className="nm-map-tool-button" type="button" onClick={() => onPausedChange(!paused)} aria-pressed={paused}>
        {paused ? <Play size={16} /> : <Pause size={16} />}
        {paused ? t.controls_reanudar : t.controls_pausar}
      </button>
      <button className="nm-map-tool-button" type="button" onClick={onReset}>
        <RotateCcw size={16} />
        {t.controls_reset}
      </button>
    </div>
  )
}
