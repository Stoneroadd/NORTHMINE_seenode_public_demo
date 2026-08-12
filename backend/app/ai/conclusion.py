from __future__ import annotations

from app.ai.investigation_schemas import (
    ConfidenceInfo,
    EvidenceItem,
    InvestigationConclusion,
    InvestigationPlan,
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
"""


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
    facts = [summarize_tool_result(e.capability_id, e.value) for e in accepted_evidence if isinstance(e.value, dict)]

    probable = [h.label for h in hypotheses if h.status == "probable"]
    possible = [h.label for h in hypotheses if h.status == "possible"]
    probable_causes = probable if probable else [f"Posible (no confirmado): {label}" for label in possible]
    contradictions = [h.label for h in hypotheses if h.status == "unsupported"]

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

    return InvestigationConclusion(
        summary=_summary_sentence(plan, evidence),
        facts=facts,
        probable_causes=probable_causes,
        contradictions=contradictions,
        recommendations=_recommendations_for(plan.type, hypotheses),
        limitations=limitations,
        confidence=ConfidenceInfo(level=confidence_level),
    )


def build_operational_investigation(
    plan: InvestigationPlan,
    evidence: list[EvidenceItem],
    verification: VerificationResult,
    hypotheses: list[OperationalHypothesis],
    conclusion: InvestigationConclusion,
) -> OperationalInvestigation:
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
