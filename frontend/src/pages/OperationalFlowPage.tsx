import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, CircleDot, Database, GitBranch, Layers3, Radio, RotateCcw } from 'lucide-react'
import { MissionState, StatusIndicator } from '../mission-control/design-system'
import { OperationalFlowCanvas } from '../mission-control/operational-flow/OperationalFlowCanvas'
import { getOperationalFlowSnapshot } from '../mission-control/operational-flow/service'
import type { AssertionType, FlowNode, OperationalCondition } from '../mission-control/operational-flow/types'

const EXPECTED_SCHEMA = 'mission-control.operational-flow.v1'
const DEFAULT_AT = '2026-08-20T10:45:00-04:00'

function assertionLabel(assertion: AssertionType): string {
  if (assertion === 'FACT') return 'Hecho de fuente'
  if (assertion === 'DERIVED') return 'Derivación determinística'
  return 'Hipótesis · requiere validación'
}

function toneFromCondition(condition: OperationalCondition) {
  if (condition === 'CRITICAL') return 'critical' as const
  if (condition === 'ATTENTION') return 'attention' as const
  if (condition === 'RECOVERING') return 'recovering' as const
  if (condition === 'UNKNOWN') return 'unknown' as const
  return 'normal' as const
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Santiago',
  }).format(new Date(value))
}

function selectedNodeOrFirst(nodes: FlowNode[], selectedNodeId: string): FlowNode | undefined {
  return nodes.find((node) => node.node_id === selectedNodeId) ?? nodes[0]
}

export function OperationalFlowPage() {
  const [selectedAt, setSelectedAt] = useState(DEFAULT_AT)
  const [selectedNodeId, setSelectedNodeId] = useState('loading-ph03')
  const [showImpact, setShowImpact] = useState(true)
  const [showAssertions, setShowAssertions] = useState(true)
  const query = useQuery({
    queryKey: ['mission-control', 'operational-flow', selectedAt],
    queryFn: () => getOperationalFlowSnapshot(selectedAt),
  })

  if (query.isLoading) {
    return (
      <div className="mc-surface mc-flow-page">
        <MissionState kind="loading" title="Reconstruyendo estado operacional" detail="Aplicando identidad, tiempo, relaciones y evidencia del escenario." />
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <div className="mc-surface mc-flow-page">
        <MissionState
          kind="error"
          title="Operational Flow no está disponible"
          detail="No se alteró el último estado conocido. Reintenta la consulta del snapshot sintético."
          actionLabel="Reintentar"
          onAction={() => void query.refetch()}
        />
      </div>
    )
  }

  const snapshot = query.data
  if (snapshot.schema_version !== EXPECTED_SCHEMA) {
    return (
      <div className="mc-surface mc-flow-page">
        <MissionState kind="error" title="Proyección incompatible" detail={`La interfaz requiere ${EXPECTED_SCHEMA}. El backend entregó ${snapshot.schema_version}.`} />
      </div>
    )
  }
  const selectedNode = selectedNodeOrFirst(snapshot.nodes, selectedNodeId)
  const selectedEvidence = snapshot.evidence.filter((item) => selectedNode?.evidence_ids.includes(item.evidence_id))
  const connectedRelationships = snapshot.relationships.filter(
    (relationship) => relationship.source_node_id === selectedNode?.node_id || relationship.target_node_id === selectedNode?.node_id,
  )
  const event = snapshot.active_event
  const operationStable = !event

  return (
    <div className="mc-surface mc-flow-page">
      <header className="mc-flow-context">
        <div className="mc-flow-context__brand">
          <GitBranch aria-hidden="true" size={22} />
          <div>
            <h1>Operational Flow</h1>
            <p>Operational Graph · proyección temporal</p>
          </div>
        </div>
        <dl className="mc-flow-context__facts">
          <div><dt>Faena</dt><dd>{snapshot.site_id.toUpperCase()}</dd></div>
          <div><dt>Turno</dt><dd>{snapshot.shift_label}</dd></div>
          <div><dt>Tiempo</dt><dd><time dateTime={snapshot.effective_at}>{formatTimestamp(snapshot.effective_at)}</time></dd></div>
        </dl>
        <div className="mc-flow-context__mode" aria-label="Contexto de datos">
          <Database aria-hidden="true" size={16} />
          <span>ESCENARIO SINTÉTICO</span>
          <small>SIN WENCO</small>
        </div>
      </header>

      <section className={`mc-flow-situation ${operationStable ? 'is-stable' : 'is-event'}`} aria-live="polite">
        <div className="mc-flow-situation__signal">
          {operationStable ? <CheckCircle2 aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
          <div>
            <h2>{operationStable ? 'Operación estable' : event.title}</h2>
            <p>{operationStable ? snapshot.stable_summary : snapshot.impact_summary}</p>
          </div>
        </div>
        <div className="mc-flow-situation__status">
          <StatusIndicator tone={operationStable ? 'normal' : event.status === 'NORMALIZED' ? 'normal' : event.status === 'RECOVERING' ? 'recovering' : 'critical'} />
          <span>{event?.status ?? 'ESTABLE'}</span>
        </div>
      </section>

      <nav className="mc-flow-timebar" aria-label="Instantes del escenario">
        <div className="mc-flow-timebar__rail" aria-hidden="true" />
        {snapshot.scenario_moments.map((moment) => (
          <button
            key={moment.effective_at}
            type="button"
            className={selectedAt === moment.effective_at ? 'is-active' : ''}
            aria-pressed={selectedAt === moment.effective_at}
            onClick={() => setSelectedAt(moment.effective_at)}
          >
            <span>{formatTimestamp(moment.effective_at)}</span>
            <small>{moment.label}</small>
          </button>
        ))}
      </nav>

      <div className="mc-flow-toolbar">
        <div aria-label="Capas visibles">
          <span className="mc-flow-toolbar__label"><Layers3 aria-hidden="true" size={16} /> Capas</span>
          <button type="button" aria-pressed="true" disabled>Topología</button>
          <button type="button" aria-pressed={showImpact} onClick={() => setShowImpact((value) => !value)}>Impacto</button>
          <button type="button" aria-pressed={showAssertions} onClick={() => setShowAssertions((value) => !value)}>Afirmaciones</button>
        </div>
        <p><Radio aria-hidden="true" size={14} /> Calidad {snapshot.data_quality} · generado por backend</p>
      </div>

      <div className="mc-flow-workspace">
        <section className="mc-flow-stage" aria-label="Visualización Operational Flow">
          <OperationalFlowCanvas
            snapshot={snapshot}
            selectedNodeId={selectedNode?.node_id ?? ''}
            showImpact={showImpact}
            showAssertions={showAssertions}
            onSelectNode={setSelectedNodeId}
          />
          <div className="mc-flow-legend" aria-label="Leyenda de afirmaciones">
            <span className="is-fact"><CircleDot aria-hidden="true" /> Hecho</span>
            <span className="is-derived"><CircleDot aria-hidden="true" /> Derivado</span>
            <span className="is-hypothesis"><CircleDot aria-hidden="true" /> Hipótesis</span>
          </div>
        </section>

        {selectedNode && (
          <aside className="mc-flow-inspector" aria-labelledby="mc-flow-inspector-title">
            <div className="mc-flow-inspector__heading">
              <StatusIndicator tone={toneFromCondition(selectedNode.condition)} compact />
              <p>{selectedNode.entity_kind.split('_').join(' ')}</p>
              <h2 id="mc-flow-inspector-title">{selectedNode.label}</h2>
              <strong>{selectedNode.summary}</strong>
            </div>

            <dl className="mc-flow-inspector__meta">
              <div><dt>Afirmación</dt><dd>{assertionLabel(selectedNode.assertion_type)}</dd></div>
              <div><dt>Calidad</dt><dd>{selectedNode.data_quality}</dd></div>
              <div><dt>Procedencia</dt><dd>{snapshot.provenance.origin}</dd></div>
            </dl>

            <section aria-labelledby="mc-related-heading">
              <h3 id="mc-related-heading">Relaciones vigentes</h3>
              {connectedRelationships.length ? (
                <ul className="mc-flow-inspector__relations">
                  {connectedRelationships.map((relationship) => (
                    <li key={relationship.relationship_id}>
                      <span>{relationship.relationship_type.split('_').join(' ')}</span>
                      <small>{relationship.assertion_type} · desde {formatTimestamp(relationship.effective_from)}</small>
                    </li>
                  ))}
                </ul>
              ) : <p className="mc-flow-inspector__empty">Sin relaciones visibles en esta proyección.</p>}
            </section>

            <section aria-labelledby="mc-evidence-heading">
              <h3 id="mc-evidence-heading">Evidencia</h3>
              {selectedEvidence.length ? (
                <ul className="mc-flow-inspector__evidence">
                  {selectedEvidence.map((evidence) => (
                    <li key={evidence.evidence_id}>
                      <span>{evidence.assertion_type}</span>
                      <strong>{evidence.label}</strong>
                      <p>{evidence.value}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mc-flow-inspector__empty">No existe evidencia suficiente para calcular este impacto. NORTHMINE no inventa el valor.</p>
              )}
            </section>

            <button className="mc-action mc-action--quiet" type="button" onClick={() => setSelectedNodeId(event?.primary_node_id ?? 'loading-ph03')}>
              <RotateCcw aria-hidden="true" size={15} /> Volver al evento
            </button>
          </aside>
        )}
      </div>

      <footer className="mc-flow-footnote">
        <span>{snapshot.scenario} · {snapshot.scenario_label}</span>
        <p>Demostración determinística. Las relaciones, eventos e impactos productivos no representan una faena real.</p>
      </footer>
    </div>
  )
}
