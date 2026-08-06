from __future__ import annotations

from app.ai.investigation_schemas import EvidenceItem, VerificationResult

"""Verifier (Etapa 3, seccion 10 del brief).

100% reglas deterministicas - el modelo no interviene en esta pasada (mas
simple de razonar, mas facil de testear, y funciona identico en modo
degradado). Revisa cada EvidenceItem antes de aceptarla: dataset vacio,
frescura, calidad. No valida "empresa/faena coinciden" porque NORTHMINE es
single-tenant (confirmado en Etapa 1) - ese chequeo no tiene nada real que
hacer todavia y no se simula.
"""


def _dataset_is_empty(value: object) -> bool:
    if not isinstance(value, dict):
        return False
    quality = value.get("data_quality")
    if isinstance(quality, dict) and str(quality.get("status") or "").upper() == "EMPTY":
        return True
    # get_data_quality_status entrega 'status' a nivel raiz, no anidado.
    if str(value.get("status") or "").upper() == "EMPTY":
        return True
    return False


def verify_evidence(evidence: list[EvidenceItem]) -> VerificationResult:
    if not evidence:
        return VerificationResult(
            status="insufficient_data",
            reasons=["No se recolecto evidencia (todos los pasos requeridos fallaron o fueron omitidos)."],
            limitations=["Sin evidencia disponible para esta investigacion."],
        )

    accepted: list[str] = []
    rejected: list[str] = []
    reasons: list[str] = []
    limitations: list[str] = []

    for item in evidence:
        problems: list[str] = []
        if _dataset_is_empty(item.value):
            problems.append("dataset vacio")

        if problems:
            item.verification_status = "rejected"
            rejected.append(item.evidence_id)
            reasons.append(f"{item.capability_id}: {', '.join(problems)}")
            continue

        if item.freshness_status == "stale":
            limitations.append(f"{item.capability_id}: dato servido desde cache, no en vivo.")
        if item.freshness_status == "unknown":
            limitations.append(f"{item.capability_id}: frescura del dato desconocida.")
        if item.quality_status == "low":
            limitations.append(f"{item.capability_id}: calidad de dato baja.")
        elif item.quality_status == "unknown":
            limitations.append(f"{item.capability_id}: calidad de dato no determinada.")

        item.verification_status = "verified" if item.quality_status in ("high", "medium") and item.freshness_status != "stale" else "partial"
        accepted.append(item.evidence_id)

    if not accepted:
        return VerificationResult(
            status="rejected",
            reasons=reasons,
            rejected_evidence_ids=rejected,
            limitations=limitations,
        )

    overall = "verified" if not rejected and all(item.verification_status == "verified" for item in evidence) else "partial"
    return VerificationResult(
        status=overall,
        reasons=reasons,
        accepted_evidence_ids=accepted,
        rejected_evidence_ids=rejected,
        limitations=limitations,
    )
