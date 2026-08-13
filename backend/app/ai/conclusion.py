from __future__ import annotations

from app.ai.investigation_schemas import (
    EvidenceItem,
    InvestigationConfidence,
    InvestigationConclusion,
    InvestigationPlan,
    InvestigationType,
    OperationalHypothesis,
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
        confidence=InvestigationConfidence(level=confidence_level),
    )
