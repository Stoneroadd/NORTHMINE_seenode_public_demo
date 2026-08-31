import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ChevronRight, CircleDot, Compass, Database, GitBranch, Layers3, Radio, RotateCcw } from 'lucide-react'
import { MissionState, StatusIndicator } from '../mission-control/design-system'
import { OperationalFlowCanvas, orderNodesForReading } from '../mission-control/operational-flow/OperationalFlowCanvas'
import { getOperationalFlowSnapshot } from '../mission-control/operational-flow/service'
import {
  assertionDetailLabel,
  assertionShortLabel,
  confidenceLabel,
  dataQualityLabel,
  entityKindLabel,
  eventStatusLabel,
  provenanceOriginLabel,
  relationshipLabel,
} from '../mission-control/operational-flow/presentation'
import type { FlowDetail, FlowNode, OperationalCondition } from '../mission-control/operational-flow/types'
import { sourceDisplayName } from '../lib/presentationSafety'
import { OperationalTourOverlay, type TourReport, type TourReportLine, type TourStep } from '../components/cockpit/OperationalTourOverlay'
import { downloadOperationalFlowReport } from '../lib/operationalFlowReportPdf'

const CONDITION_TOUR_LABEL: Record<OperationalCondition, string> = {
  CRITICAL: 'Critico',
  ATTENTION: 'Atencion',
  RECOVERING: 'Recuperando',
  UNKNOWN: 'Sin dato',
  NORMAL: 'Normal',
}

function conditionTourTone(condition: OperationalCondition): TourReportLine['tone'] {
  if (condition === 'CRITICAL') return 'critical'
  if (condition === 'ATTENTION') return 'caution'
  return 'nominal'
}

const EXPECTED_SCHEMA = 'mission-control.operational-flow.v2'
const DEFAULT_AT = '2026-08-20T10:45:00-04:00'

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

function groupedDetails(details: FlowDetail[]): Array<[string, FlowDetail[]]> {
  const groups = new Map<string, FlowDetail[]>()
  for (const detail of details) groups.set(detail.group, [...(groups.get(detail.group) ?? []), detail])
  return [...groups.entries()]
}

export function OperationalFlowPage() {
  const [selectedAt, setSelectedAt] = useState(DEFAULT_AT)
  const [selectedNodeId, setSelectedNodeId] = useState('loading-ph03')
  const [showImpact, setShowImpact] = useState(true)
  const [showAssertions, setShowAssertions] = useState(true)
  const [technicalDetailsOpen, setTechnicalDetailsOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const inspectorRef = useRef<HTMLElement>(null)
  const focusRelationNodeIdRef = useRef<string | null>(null)
  const query = useQuery({
    queryKey: ['mission-control', 'operational-flow', selectedAt],
    queryFn: () => getOperationalFlowSnapshot(selectedAt),
    // Sin esto, cada clic en la barra de instantes ("Instantes del escenario")
    // arma una queryKey nueva sin cache previo, así que isLoading vuelve a
    // true y la página entera se reemplaza por la pantalla de carga -- grafo,
    // inspector, todo -- para pasar de un instante al siguiente del mismo
    // escenario. Mantener los datos anteriores visibles mientras llega el
    // próximo instante evita ese parpadeo a pantalla en blanco.
    placeholderData: (previousData) => previousData,
  })

  useEffect(() => {
    const wantedNodeId = focusRelationNodeIdRef.current
    if (!wantedNodeId || !inspectorRef.current) return
    const target = inspectorRef.current.querySelector<HTMLButtonElement>(`[data-relation-target="${wantedNodeId}"]`)
    if (!target) return
    target.focus()
    focusRelationNodeIdRef.current = null
  }, [selectedNodeId, query.data])

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
        <MissionState kind="error" title="Proyección no disponible" detail="La vista recibida no puede representarse de forma segura. Actualiza la página o vuelve a intentarlo." />
      </div>
    )
  }
  const selectedNode = selectedNodeOrFirst(snapshot.nodes, selectedNodeId)
  const selectedEvidence = snapshot.evidence.filter((item) => selectedNode?.evidence_ids.includes(item.evidence_id))
  const connectedRelationships = snapshot.relationships.filter(
    (relationship) => relationship.source_node_id === selectedNode?.node_id || relationship.target_node_id === selectedNode?.node_id,
  )
  const nodesById = new Map(snapshot.nodes.map((node) => [node.node_id, node]))
  const event = snapshot.active_event
  const operationStable = !event

  const tourNodes = orderNodesForReading(snapshot.nodes)
  const tourSteps: TourStep[] = tourNodes.map((node) => ({
    targetSelector: `[data-node-id="${node.node_id}"]`,
    title: node.label,
    description: node.summary,
    onEnter: () => {
      setSelectedNodeId(node.node_id)
      if (node.technical_details.length > 0) setTechnicalDetailsOpen(true)
    },
  }))
  const tourReport: TourReport = {
    title: `Recorrido operacional — ${snapshot.shift_label} · ${snapshot.site_id.toUpperCase()}`,
    generatedAt: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    lines: tourNodes.map((node): TourReportLine => ({
      label: node.label,
      value: CONDITION_TOUR_LABEL[node.condition],
      tone: conditionTourTone(node.condition),
    })),
    recommendation: operationStable ? snapshot.stable_summary : snapshot.impact_summary,
  }

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
          <span>{eventStatusLabel(event?.status)}</span>
        </div>
      </section>

      <nav className="mc-flow-timebar" aria-label="Instantes del escenario">
        <div className="mc-flow-timebar__rail" aria-hidden="true" />
        {snapshot.scenario_moments.map((moment) => (
          <button
            key={moment.effective_at}
            type="button"
            className={[
              selectedAt === moment.effective_at ? 'is-active' : '',
              selectedAt === moment.effective_at && query.isFetching ? 'is-fetching' : '',
            ].filter(Boolean).join(' ')}
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
        <div className="mc-flow-toolbar__right">
          <button type="button" className="mc-flow-tour-trigger" onClick={() => setTourOpen(true)}>
            <Compass aria-hidden="true" size={15} /> Recorrido
          </button>
          <p><Radio aria-hidden="true" size={14} /> {dataQualityLabel(snapshot.data_quality)} · lectura operacional verificada</p>
        </div>
      </div>

      {tourOpen && (
        <OperationalTourOverlay
          steps={tourSteps}
          report={tourReport}
          onClose={() => setTourOpen(false)}
          onDownload={() => downloadOperationalFlowReport(snapshot, tourNodes)}
        />
      )}

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
          <aside className="mc-flow-inspector" aria-labelledby="mc-flow-inspector-title" ref={inspectorRef}>
            <div className="mc-flow-inspector__heading">
              <StatusIndicator tone={toneFromCondition(selectedNode.condition)} compact />
              <p>{entityKindLabel(selectedNode.entity_kind)}</p>
              <h2 id="mc-flow-inspector-title">{selectedNode.label}</h2>
              <strong>{selectedNode.summary}</strong>
            </div>

            <dl className="mc-flow-inspector__meta">
              <div><dt>Afirmación</dt><dd>{assertionDetailLabel(selectedNode.assertion_type)}</dd></div>
              <div><dt>Calidad</dt><dd>{dataQualityLabel(selectedNode.data_quality)}</dd></div>
              <div><dt>Procedencia</dt><dd>{provenanceOriginLabel(snapshot.provenance.origin)}</dd></div>
            </dl>

            <section aria-labelledby="mc-related-heading">
              <h3 id="mc-related-heading">Relaciones vigentes</h3>
              {connectedRelationships.length ? (
                <ul className="mc-flow-inspector__relations">
                  {connectedRelationships.map((relationship) => {
                    const isOutgoing = relationship.source_node_id === selectedNode.node_id
                    const counterpartNodeId = isOutgoing ? relationship.target_node_id : relationship.source_node_id
                    const counterpartLabel = nodesById.get(counterpartNodeId)?.label ?? 'Entidad no disponible'
                    return (
                      <li key={relationship.relationship_id}>
                        <button
                          type="button"
                          className="mc-flow-inspector__relation-link"
                          data-relation-target={counterpartNodeId}
                          onClick={() => {
                            focusRelationNodeIdRef.current = selectedNode.node_id
                            setSelectedNodeId(counterpartNodeId)
                          }}
                          disabled={!nodesById.has(counterpartNodeId)}
                        >
                          <span>{isOutgoing ? 'Hacia' : 'Desde'} {counterpartLabel}</span>
                          <ChevronRight aria-hidden="true" size={14} />
                        </button>
                        <span>{relationshipLabel(relationship.relationship_type, relationship.label)}</span>
                        <small>
                          {[
                            assertionShortLabel(relationship.assertion_type),
                            confidenceLabel(relationship.confidence_level),
                            `desde ${formatTimestamp(relationship.effective_from)}`,
                          ].filter(Boolean).join(' · ')}
                        </small>
                      </li>
                    )
                  })}
                </ul>
              ) : <p className="mc-flow-inspector__empty">Sin relaciones visibles en esta proyección.</p>}
            </section>

            <section aria-labelledby="mc-evidence-heading">
              <h3 id="mc-evidence-heading">Evidencia</h3>
              {selectedEvidence.length ? (
                <ul className="mc-flow-inspector__evidence">
                  {selectedEvidence.map((evidence) => (
                    <li key={evidence.evidence_id}>
                      <span>{assertionShortLabel(evidence.assertion_type)}</span>
                      <strong>{evidence.label}</strong>
                      <p>{evidence.value}</p>
                      <small>{formatTimestamp(evidence.observed_at)} · {sourceDisplayName(evidence.provenance.source_system)}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mc-flow-inspector__empty">No existe evidencia suficiente para calcular este impacto. NORTHMINE no inventa el valor.</p>
              )}
            </section>

            {selectedNode.technical_details.length > 0 && (
              <details
                className="mc-flow-inspector__disclosure"
                open={technicalDetailsOpen}
                onToggle={(event) => setTechnicalDetailsOpen(event.currentTarget.open)}
              >
                <summary>
                  <span>Datos técnicos</span>
                  <small>{selectedNode.technical_details.length} variables</small>
                </summary>
                <div className="mc-flow-inspector__details">
                  {groupedDetails(selectedNode.technical_details).map(([group, details]) => (
                    <section key={group} aria-label={group}>
                      <h3>{group}</h3>
                      <dl>
                        {details.map((detail) => (
                          <div key={detail.detail_id}>
                            <dt>{detail.label}</dt>
                            <dd>
                              <strong>{detail.value}{detail.unit ? ` ${detail.unit}` : ''}</strong>
                              <small>{assertionShortLabel(detail.assertion_type)} · {dataQualityLabel(detail.data_quality)} · {formatTimestamp(detail.observed_at)}</small>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </div>
              </details>
            )}

            <button className="mc-action mc-action--quiet" type="button" onClick={() => setSelectedNodeId(event?.primary_node_id ?? 'loading-ph03')}>
              <RotateCcw aria-hidden="true" size={15} /> Volver al evento
            </button>
          </aside>
        )}
      </div>

      <footer className="mc-flow-footnote">
        <span>Escenario: {snapshot.scenario_label}</span>
        <p>Demostración determinística. Las relaciones, eventos e impactos productivos no representan una faena real.</p>
      </footer>
    </div>
  )
}
