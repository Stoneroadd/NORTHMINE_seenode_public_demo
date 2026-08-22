import { useEffect, useState } from 'react'
import {
  DataConditionBanner,
  DetailDisclosure,
  MissionState,
  OperationalEventCard,
  OperationalTimeline,
  StatusIndicator,
} from '../mission-control/design-system'
import type { DataCondition, OperationalTone } from '../mission-control/design-system/semantics'

const INSPECTOR_ID = 'mc-ph03-inspector'
const STATUS_TONES: OperationalTone[] = ['normal', 'attention', 'critical', 'informational', 'unknown', 'recovering']
const DATA_CONDITIONS: Array<{ condition: DataCondition; detail: string }> = [
  { condition: 'fresh', detail: 'La fuente canónica cumple la ventana de frescura.' },
  { condition: 'delayed', detail: 'La última condición conocida no debe interpretarse como estado en vivo.' },
  { condition: 'incomplete', detail: 'Faltan observaciones requeridas para una conclusión operacional.' },
  { condition: 'conflicting', detail: 'Dos fuentes autorizadas informan condiciones incompatibles.' },
  { condition: 'unavailable', detail: 'No existe evidencia suficiente para mostrar estado actual.' },
]

const TIMELINE = [
  { id: 't-1', time: '10:31', label: 'PH03 se detuvo', detail: 'Estado de origen: demora mecánica.', kind: 'event' as const },
  { id: 't-2', time: '10:32', label: '6 camiones afectados', detail: 'Relación de asignación vigente al momento del evento.', kind: 'event' as const },
  { id: 't-3', time: '10:38', label: 'Redistribución registrada', detail: 'Acción humana; NORTHMINE no ejecutó comandos FMS.', kind: 'action' as const },
  { id: 't-4', time: '10:52', label: 'Operación estabilizada', detail: 'Condición normalizada; historial preservado.', kind: 'recovery' as const },
]

export function MissionControlDesignSystemPage() {
  const [inspected, setInspected] = useState(false)
  const [historyState, setHistoryState] = useState<'error' | 'loading' | 'recovered'>('error')

  useEffect(() => {
    if (historyState !== 'loading') return undefined
    const timer = window.setTimeout(() => setHistoryState('recovered'), 600)
    return () => window.clearTimeout(timer)
  }, [historyState])

  return (
    <div className="mc-surface mc-catalog">
      <header className="mc-catalog__header">
        <div>
          <h1>Mission Control primitives</h1>
          <p>Sistema visual 2.0 · datos sintéticos · EN VALIDACIÓN</p>
        </div>
        <div className="mc-catalog__status-row" aria-label="Estados semánticos">
          {STATUS_TONES.map((tone) => <StatusIndicator key={tone} tone={tone} compact />)}
        </div>
      </header>

      <DataConditionBanner
        condition="delayed"
        detail="La última condición conocida no debe interpretarse como estado en vivo."
        lastSuccessfulSync="Última sincronización 10:48"
      />

      <div className="mc-catalog__workspace">
        <section className="mc-catalog__primary" aria-labelledby="mc-active-heading">
          <div className="mc-section-heading">
            <h2 id="mc-active-heading">La situación debe dominar</h2>
            <p>Identidad, impacto y tiempo primero. La evidencia aparece cuando se solicita.</p>
          </div>

          <OperationalEventCard
            title="PH03 detenido"
            impact="6 camiones afectados"
            elapsed="Hace 14 min"
            tone="critical"
            lifecycle="CONFIRMADO"
            expanded={inspected}
            controlsId={INSPECTOR_ID}
            onInspect={() => setInspected((value) => !value)}
          />

          <div
            id={INSPECTOR_ID}
            className="mc-inspector-preview"
            role="region"
            aria-label="Detalle del evento PH03"
            hidden={!inspected}
          >
              <div>
                <h2>6 camiones requieren atención</h2>
                <p>Opciones sugeridas a partir de asignaciones sintéticas. Ninguna acción será ejecutada automáticamente.</p>
              </div>
              <DetailDisclosure label="Evidencia" description="Fuente, tiempo y calidad">
                <dl className="mc-evidence-list">
                  <div><dt>FACT</dt><dd>PH03 · demora mecánica · 10:31</dd></div>
                  <div><dt>DERIVED</dt><dd>6 asignaciones vigentes afectadas</dd></div>
                  <div><dt>QUALITY</dt><dd>Datos sintéticos determinísticos</dd></div>
                </dl>
              </DetailDisclosure>
              <DetailDisclosure label="Hipótesis" description="No presentada como hecho">
                <p>La duración de recuperación aún es desconocida; no se estima sin evidencia suficiente.</p>
              </DetailDisclosure>
          </div>
        </section>

        <aside className="mc-catalog__timeline" aria-labelledby="mc-timeline-heading">
          <div className="mc-section-heading">
            <h2 id="mc-timeline-heading">Recuperación preservada</h2>
            <p>El evento puede cerrar. La historia no desaparece.</p>
          </div>
          <OperationalTimeline entries={TIMELINE} />
        </aside>
      </div>

      <section className="mc-catalog__states" aria-label="Estados de superficie">
        <MissionState
          kind="stable"
          title="Operación estable"
          detail="No hay condiciones operacionales relevantes que requieran atención."
        />
        <MissionState
          kind={historyState === 'error' ? 'error' : historyState === 'loading' ? 'loading' : 'stable'}
          title={historyState === 'error' ? 'No fue posible cargar el historial' : historyState === 'loading' ? 'Recuperando historial' : 'Historial recuperado'}
          detail={historyState === 'error' ? 'La operación actual sigue disponible. Reintenta solamente esta consulta.' : historyState === 'loading' ? 'Reintentando solamente la consulta histórica.' : 'La consulta histórica volvió a estar disponible.'}
          actionLabel={historyState === 'error' ? 'Reintentar historial' : historyState === 'loading' ? 'Recuperando…' : 'Historial disponible'}
          actionDisabled={historyState !== 'error'}
          announce="polite"
          onAction={() => setHistoryState('loading')}
        />
      </section>

      <section className="mc-catalog__matrix" aria-labelledby="mc-matrix-heading">
        <div className="mc-section-heading">
          <h2 id="mc-matrix-heading">Condiciones de datos verificables</h2>
          <p>Desconocido nunca se convierte silenciosamente en normal o LIVE.</p>
        </div>
        <div className="mc-data-matrix">
          {DATA_CONDITIONS.map(({ condition, detail }) => (
            <DataConditionBanner key={condition} condition={condition} detail={detail} />
          ))}
        </div>
        <div className="mc-state-matrix">
          <MissionState kind="empty" title="Sin eventos en esta ventana" detail="No se inventan indicadores para llenar el espacio." />
          <MissionState kind="loading" title="Sincronizando contexto" detail="El estado anterior permanece cualificado hasta completar la carga." />
          <MissionState kind="connection" title="Conexión operacional interrumpida" detail="Último estado conocido preservado, pero no presentado como vivo." />
        </div>
      </section>
    </div>
  )
}
