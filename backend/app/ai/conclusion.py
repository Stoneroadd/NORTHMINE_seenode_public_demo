from __future__ import annotations

import logging

from app.ai.investigation_schemas import (
    EvidenceItem,
    InvestigationConfidence,
    InvestigationConclusion,
    InvestigationPlan,
    InvestigationResult,
    InvestigationType,
    OperationalHypothesis,
    OperationalInvestigation,
    VerificationResult,
)
from app.ai.tool_formatting import summarize_tool_result

"""Conclusion (Etapa 3, seccion 13 del brief) - 100% deterministica, sin
modelo: separa hechos/hipotesis/contradicciones/limitaciones/recomendaciones
a partir de lo que el Executor y el Verifier ya calcularon. decisionAuthority
y requiresHumanApproval quedan fijos por el tipo del schema (Literal), el
codigo no puede cambiarlos aunque quisiera - ver InvestigationConclusion.

C4 (trazabilidad): ademas de facts/contradictions en texto, la conclusion
conserva supporting_evidence_ids/contradicting_evidence_ids - IDs reales
tomados de EvidenceItem/OperationalHypothesis, nunca fabricados. Ver
get_evidence_for_conclusion mas abajo para resolverlos contra la evidencia
real de una investigacion sin reconstruir la relacion por texto.
"""

logger = logging.getLogger("northmine.ai.conclusion")


def _summary_sentence(plan: InvestigationPlan, evidence: list[EvidenceItem]) -> str:
    production = next((e for e in evidence if e.capability_id == "get_production_kpis" and isinstance(e.value, dict)), None)
    shift = next((e for e in evidence if e.capability_id == "get_current_shift_summary" and isinstance(e.value, dict)), None)

    if plan.type == InvestigationType.SHIFT_SUMMARY and shift is not None:
        v = shift.value
        return f"Turno {v.get('turno')} ({v.get('fecha')}): {v.get('toneladas_turno'):,} t de {v.get('meta_turno'):,} t ({v.get('cumplimiento_pct')}%)."

    if production is not None:
        v = production.value
        cumplimiento = v.get("cumplimiento_pct")
        brecha = v.get("brecha_ton")
        if isinstance(cumplimiento, (int, float)) and cumplimiento < 100:
            return f"La producción está {100 - cumplimiento:.1f}% bajo el plan (brecha de {brecha:,} t)."
        if isinstance(cumplimiento, (int, float)):
            return f"La producción está en línea con el plan ({cumplimiento}% de cumplimiento)."

    return f"Investigación de tipo '{plan.type.value}' completada con {len(evidence)} fuentes de evidencia."


def _recommendations_for(investigation_type: InvestigationType, hypotheses: list[OperationalHypothesis]) -> list[str]:
    probable_labels = [h.label for h in hypotheses if h.status == "probable"]
    if not probable_labels:
        return ["Se recomienda evaluar la evidencia disponible; no hay una causa dominante identificada con la evidencia actual."]
    return [f"Se recomienda evaluar: {label}." for label in probable_labels]


def build_conclusion(
    plan: InvestigationPlan,
    evidence: list[EvidenceItem],
    verification: VerificationResult,
    hypotheses: list[OperationalHypothesis],
) -> InvestigationConclusion:
    accepted_evidence = [e for e in evidence if e.evidence_id in set(verification.accepted_evidence_ids)]
    fact_evidence = [e for e in accepted_evidence if isinstance(e.value, dict)]
    facts = [summarize_tool_result(e.capability_id, e.value) for e in fact_evidence]

    probable_hypotheses = [h for h in hypotheses if h.status == "probable"]
    possible_hypotheses = [h for h in hypotheses if h.status == "possible"]
    probable = [h.label for h in probable_hypotheses]
    possible = [h.label for h in possible_hypotheses]
    probable_causes = probable if probable else [f"Posible (no confirmado): {label}" for label in possible]
    # facts/probable_causes citan la misma evidencia que ya los sustenta -
    # si no hay hipotesis probable se usa la evidencia de las "possible"
    # (mismo fallback que probable_causes en texto, linea de arriba).
    cause_hypotheses = probable_hypotheses if probable_hypotheses else possible_hypotheses

    unsupported_hypotheses = [h for h in hypotheses if h.status == "unsupported"]
    contradictions = [h.label for h in unsupported_hypotheses]

    limitations = list(verification.limitations)
    for missing in plan.missing_capabilities:
        limitations.append(f"Capacidad no disponible: {missing}")

    if verification.status == "insufficient_data":
        confidence_level = "low"
    elif verification.status == "verified" and probable:
        confidence_level = "high"
    elif verification.status in ("verified", "partial"):
        confidence_level = "medium"
    else:
        confidence_level = "low"

    supporting_evidence_ids = sorted({
        *(e.evidence_id for e in fact_evidence),
        *(eid for h in cause_hypotheses for eid in h.supporting_evidence_ids),
    })
    contradicting_evidence_ids = sorted({
        eid for h in unsupported_hypotheses for eid in h.contradicting_evidence_ids
    })

    return InvestigationConclusion(
        summary=_summary_sentence(plan, evidence),
        facts=facts,
        probable_causes=probable_causes,
        contradictions=contradictions,
        recommendations=_recommendations_for(plan.type, hypotheses),
        limitations=limitations,
        confidence=InvestigationConfidence(level=confidence_level),
        supporting_evidence_ids=supporting_evidence_ids,
        contradicting_evidence_ids=contradicting_evidence_ids,
    )


def build_operational_investigation(
    plan: InvestigationPlan,
    evidence: list[EvidenceItem],
    verification: VerificationResult,
    hypotheses: list[OperationalHypothesis],
    conclusion: InvestigationConclusion,
) -> OperationalInvestigation:
    """R2 §4 (integrado desde feature/operational-agent-hardening): vista
    operacional verificable derivada de un InvestigationResult ya construido
    - reusa exactamente los mismos IDs que build_conclusion ya calculo
    (accepted_evidence_ids, supporting/contradicting_evidence_ids por
    hipotesis), nunca reconstruye la relacion por texto. confidence viene
    directo de conclusion.confidence (InvestigationConfidence), nunca se
    fabrica una nueva."""
    accepted = set(verification.accepted_evidence_ids)
    supporting_ids = {eid for h in hypotheses for eid in h.supporting_evidence_ids}
    contradicting_ids = {eid for h in hypotheses for eid in h.contradicting_evidence_ids}
    supporting = [item for item in evidence if item.evidence_id in accepted & supporting_ids]
    contradicting = [item for item in evidence if item.evidence_id in accepted & contradicting_ids]
    observations = [
        summarize_tool_result(item.capability_id, item.value)
        for item in evidence
        if item.evidence_id in accepted and isinstance(item.value, dict)
    ]
    deviations = [h.label for h in hypotheses if h.causal_status in ("strongly_supported", "plausible")]
    missing = list(dict.fromkeys([
        *plan.missing_capabilities,
        *(missing for hypothesis in hypotheses for missing in hypothesis.missing_evidence),
    ]))
    verified_findings = [
        summarize_tool_result(item.capability_id, item.value)
        for item in evidence
        if item.verification_status == "verified" and isinstance(item.value, dict)
    ]
    return OperationalInvestigation(
        question=plan.goal,
        scope=plan.scope,
        entities=list(plan.scope.equipment_ids),
        timeframe=plan.scope.date_range,
        observations=observations,
        deviations=deviations,
        hypotheses=hypotheses,
        supporting_evidence=supporting,
        contradicting_evidence=contradicting,
        missing_evidence=missing,
        verified_findings=verified_findings,
        conclusion=conclusion.summary,
        confidence=conclusion.confidence,
        limitations=conclusion.limitations,
        recommended_next_actions=conclusion.recommendations[:3],
    )


def get_evidence_for_conclusion(result: InvestigationResult) -> list[EvidenceItem]:
    """Resuelve InvestigationConclusion.supporting_evidence_ids contra la
    evidencia real de la investigacion (result.evidence) - permite responder
    "que evidencia respalda esta conclusion" sin reconstruir la relacion por
    busqueda de texto. Nunca fabrica un EvidenceItem para un id que no
    exista: si algun id no resuelve, se omite y se reporta por logger."""
    if result.conclusion is None:
        return []
    by_id = {e.evidence_id: e for e in result.evidence}
    missing = [eid for eid in result.conclusion.supporting_evidence_ids if eid not in by_id]
    if missing:
        logger.warning("Conclusion cita evidence_id inexistente en supporting_evidence_ids: %s", missing)
    return [by_id[eid] for eid in result.conclusion.supporting_evidence_ids if eid in by_id]


def get_contradicting_evidence_for_conclusion(result: InvestigationResult) -> list[EvidenceItem]:
    """Misma resolucion que get_evidence_for_conclusion, para
    contradicting_evidence_ids - responde "que evidencia contradice esta
    conclusion/hipotesis"."""
    if result.conclusion is None:
        return []
    by_id = {e.evidence_id: e for e in result.evidence}
    missing = [eid for eid in result.conclusion.contradicting_evidence_ids if eid not in by_id]
    if missing:
        logger.warning("Conclusion cita evidence_id inexistente en contradicting_evidence_ids: %s", missing)
    return [by_id[eid] for eid in result.conclusion.contradicting_evidence_ids if eid in by_id]
