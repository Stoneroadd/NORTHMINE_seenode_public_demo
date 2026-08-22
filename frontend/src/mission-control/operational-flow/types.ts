export type AssertionType = 'FACT' | 'DERIVED' | 'HYPOTHESIS'
export type OperationalCondition = 'NORMAL' | 'ATTENTION' | 'CRITICAL' | 'RECOVERING' | 'UNKNOWN'
export type DataQuality = 'FRESH' | 'STALE' | 'INCOMPLETE' | 'CONFLICTING' | 'UNAVAILABLE'

export interface Provenance {
  origin: 'REAL' | 'SYNTHETIC' | 'SIMULATED' | 'REPLAY' | 'UNKNOWN' | string
  representation: 'SOURCE' | 'DERIVED' | string
  source_system: string
  source_id: string
  demo_context: boolean
}

export interface FlowEvidence {
  evidence_id: string
  assertion_type: AssertionType
  label: string
  value: string
  observed_at: string
  provenance: Provenance
}

export interface FlowDetail {
  detail_id: string
  group: string
  label: string
  value: string
  unit: string | null
  assertion_type: AssertionType
  data_quality: DataQuality
  observed_at: string
  evidence_id: string | null
  provenance: Provenance
}

export interface FlowNode {
  node_id: string
  entity_id: string | null
  external_id: string | null
  node_role: 'ENTITY' | 'AGGREGATE' | 'OUTCOME' | string
  entity_kind: string
  semantic_group: string
  label: string
  summary: string
  condition: OperationalCondition
  assertion_type: AssertionType
  data_quality: DataQuality
  evidence_ids: string[]
  technical_details: FlowDetail[]
}

export interface FlowRelationship {
  relationship_id: string
  source_node_id: string
  target_node_id: string
  relationship_type: string
  label: string
  assertion_type: AssertionType
  effective_from: string
  effective_to: string | null
  condition: OperationalCondition
  data_quality: DataQuality
  confidence: number | null
  impacted: boolean
  provenance: Provenance
}

export interface FlowEvent {
  event_id: string
  event_type: string
  title: string
  severity: string
  status: string
  detected_at: string
  normalized_at: string | null
  primary_node_id: string
  affected_node_ids: string[]
  evidence_ids: string[]
}

export interface OperationalFlowSnapshot {
  schema_version: string
  tenant_id: string
  site_id: string
  shift_id: string
  shift_label: string
  site_timezone: string
  temporal_mode: string
  effective_at: string
  generated_at: string
  provenance: Provenance
  data_quality: DataQuality
  scenario: string
  scenario_label: string
  stable_summary: string
  impact_summary: string
  scenario_moments: Array<{ label: string; effective_at: string }>
  nodes: FlowNode[]
  relationships: FlowRelationship[]
  evidence: FlowEvidence[]
  active_event: FlowEvent | null
}
