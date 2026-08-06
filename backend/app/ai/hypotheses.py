from __future__ import annotations

from typing import Any

from app.ai.investigation_schemas import (
    EvidenceItem,
    InvestigationType,
    OperationalHypothesis,
    new_id,
)

"""Motor de hipotesis por reglas (Etapa 3, seccion 12 del brief).

El `score` (0-1) es una ponderacion simple y documentada por regla, NUNCA
una probabilidad estadistica real - eso se deja explicito en cada regla de
abajo con un comentario, y el status ('possible'/'probable') es lo que
realmente se muestra al usuario; el score es solo un desempate interno.
"""


def _by_capability(evidence: list[EvidenceItem], capability_id: str) -> dict[str, Any] | None:
    for item in evidence:
        if item.capability_id == capability_id and isinstance(item.value, dict):
            return item.value
    return None


def _status_from_score(score: float, has_data: bool) -> str:
    if not has_data:
        return "insufficient_data"
    if score >= 0.6:
        return "probable"
    if score >= 0.3:
        return "possible"
    return "unsupported"


def generate_hypotheses(investigation_type: InvestigationType, evidence: list[EvidenceItem]) -> list[OperationalHypothesis]:
    if investigation_type == InvestigationType.PRODUCTION_DROP:
        return _production_drop_hypotheses(evidence)
    if investigation_type == InvestigationType.CYCLE_TIME_INCREASE:
        return _cycle_time_hypotheses(evidence)
    if investigation_type == InvestigationType.LOADING_UNIT_UNDERPERFORMANCE:
        return _loading_underperformance_hypotheses(evidence)
    return []  # shift_summary no genera hipotesis: es un resumen, no una investigacion de causa.


def _evidence_id_for(evidence: list[EvidenceItem], capability_id: str) -> list[str]:
    return [item.evidence_id for item in evidence if item.capability_id == capability_id]


def _production_drop_hypotheses(evidence: list[EvidenceItem]) -> list[OperationalHypothesis]:
    hypotheses: list[OperationalHypothesis] = []

    fleet = _by_capability(evidence, "get_fleet_status")
    loading = _by_capability(evidence, "get_loading_performance")
    production = _by_capability(evidence, "get_production_kpis")
    alerts = _by_capability(evidence, "get_alerts")
    quality = _by_capability(evidence, "get_data_quality_status")

    # 1. Menor disponibilidad de camiones: regla = 1 - disponibilidad_pct/100,
    #    acotado a [0,1]. Documentado: no es una probabilidad, es cuanto se
    #    aleja la disponibilidad real del 100% ideal.
    if fleet is not None:
        disponibilidad = float(fleet.get("disponibilidad_pct") or 100)
        score = max(0.0, min(1.0, (95 - disponibilidad) / 40))
        hypotheses.append(OperationalHypothesis(
            hypothesis_id=new_id("hyp"),
            label="Menor disponibilidad de camiones",
            status=_status_from_score(score, True),
            supporting_evidence_ids=_evidence_id_for(evidence, "get_fleet_status") if score >= 0.3 else [],
            contradicting_evidence_ids=_evidence_id_for(evidence, "get_fleet_status") if score < 0.3 else [],
            score=round(score, 2),
        ))

    # 2. Bajo rendimiento de unidad de carguio: score = fraccion de unidades
    #    con variacion_pct < -20% respecto al promedio de flota.
    if loading is not None:
        unidades = loading.get("unidades") or []
        bajo_rendimiento = [u for u in unidades if float(u.get("variacion_pct") or 0) < -20]
        score = min(1.0, len(bajo_rendimiento) / max(len(unidades), 1)) if unidades else 0.0
        hypotheses.append(OperationalHypothesis(
            hypothesis_id=new_id("hyp"),
            label="Bajo rendimiento de una o mas unidades de carguío",
            status=_status_from_score(score, bool(unidades)),
            supporting_evidence_ids=_evidence_id_for(evidence, "get_loading_performance") if score >= 0.3 else [],
            contradicting_evidence_ids=_evidence_id_for(evidence, "get_loading_performance") if score < 0.3 else [],
            score=round(score, 2) if unidades else None,
        ))

    # 3. Aumento del tiempo de ciclo (proxy: ritmo actual vs requerido).
    if production is not None:
        actual = float(production.get("ritmo_actual_tph") or 0)
        requerido = production.get("ritmo_requerido_tph")
        if requerido:
            gap = max(0.0, (float(requerido) - actual) / max(float(requerido), 1))
            score = min(1.0, gap)
        else:
            score = 0.0
        hypotheses.append(OperationalHypothesis(
            hypothesis_id=new_id("hyp"),
            label="Aumento del tiempo de ciclo (proxy: ritmo t/h actual vs requerido)",
            status=_status_from_score(score, requerido is not None),
            supporting_evidence_ids=_evidence_id_for(evidence, "get_production_kpis") if score >= 0.3 else [],
            contradicting_evidence_ids=_evidence_id_for(evidence, "get_production_kpis") if score < 0.3 else [],
            score=round(score, 2) if requerido is not None else None,
        ))

    # 4. Demoras o averias: score segun severidad de alertas abiertas.
    if alerts is not None:
        counts = alerts.get("counts") or {}
        weighted = counts.get("CRITICA", 0) * 1.0 + counts.get("ALTA", 0) * 0.5
        score = min(1.0, weighted / 3)
        hypotheses.append(OperationalHypothesis(
            hypothesis_id=new_id("hyp"),
            label="Demoras o averías activas",
            status=_status_from_score(score, True),
            supporting_evidence_ids=_evidence_id_for(evidence, "get_alerts") if score >= 0.3 else [],
            contradicting_evidence_ids=_evidence_id_for(evidence, "get_alerts") if score < 0.3 else [],
            score=round(score, 2),
        ))

    # 5. Desbalance entre carguio y transporte: fleet OK pero carguio bajo, o viceversa.
    if fleet is not None and loading is not None:
        disponibilidad = float(fleet.get("disponibilidad_pct") or 100)
        rendimiento_prom = float(loading.get("rendimiento_promedio_tph") or 0)
        fleet_ok = disponibilidad >= 85
        loading_weak = rendimiento_prom > 0 and any(float(u.get("variacion_pct") or 0) < -15 for u in (loading.get("unidades") or []))
        score = 0.55 if (fleet_ok and loading_weak) else 0.1
        hypotheses.append(OperationalHypothesis(
            hypothesis_id=new_id("hyp"),
            label="Desbalance entre capacidad de carguío y transporte",
            status=_status_from_score(score, True),
            supporting_evidence_ids=(_evidence_id_for(evidence, "get_fleet_status") + _evidence_id_for(evidence, "get_loading_performance")) if score >= 0.3 else [],
            contradicting_evidence_ids=[] if score >= 0.3 else (_evidence_id_for(evidence, "get_fleet_status") + _evidence_id_for(evidence, "get_loading_performance")),
            score=round(score, 2),
        ))

    # 6. Problema de calidad de datos: si la calidad es baja, la CONCLUSION debe
    #    reflejarlo (limitations), pero tambien se declara como hipotesis propia.
    if quality is not None:
        score_quality = float(quality.get("score") or 0)
        status_quality = str(quality.get("status") or "")
        score = 0.7 if status_quality != "OK" or score_quality < 60 else 0.05
        hypotheses.append(OperationalHypothesis(
            hypothesis_id=new_id("hyp"),
            label="La desviación observada podría deberse a un problema de calidad de datos, no a la operación",
            status=_status_from_score(score, True),
            supporting_evidence_ids=_evidence_id_for(evidence, "get_data_quality_status") if score >= 0.3 else [],
            contradicting_evidence_ids=[] if score >= 0.3 else _evidence_id_for(evidence, "get_data_quality_status"),
            score=round(score, 2),
        ))

    return hypotheses


def _cycle_time_hypotheses(evidence: list[EvidenceItem]) -> list[OperationalHypothesis]:
    hypotheses: list[OperationalHypothesis] = []
    fleet = _by_capability(evidence, "get_fleet_status")
    alerts = _by_capability(evidence, "get_alerts")

    if fleet is not None:
        en_demora = int(fleet.get("equipos_en_demora") or 0)
        total = max(int(fleet.get("total_equipos") or 1), 1)
        score = min(1.0, en_demora / total * 2)
        hypotheses.append(OperationalHypothesis(
            hypothesis_id=new_id("hyp"),
            label="Mayor tiempo de espera/viaje asociado a equipos en demora",
            status=_status_from_score(score, True),
            supporting_evidence_ids=_evidence_id_for(evidence, "get_fleet_status") if score >= 0.3 else [],
            contradicting_evidence_ids=[] if score >= 0.3 else _evidence_id_for(evidence, "get_fleet_status"),
            score=round(score, 2),
        ))

    if alerts is not None:
        counts = alerts.get("counts") or {}
        score = min(1.0, (counts.get("CRITICA", 0) + counts.get("ALTA", 0)) / 3)
        hypotheses.append(OperationalHypothesis(
            hypothesis_id=new_id("hyp"),
            label="Avería activa contribuyendo al aumento de ciclo",
            status=_status_from_score(score, True),
            supporting_evidence_ids=_evidence_id_for(evidence, "get_alerts") if score >= 0.3 else [],
            contradicting_evidence_ids=[] if score >= 0.3 else _evidence_id_for(evidence, "get_alerts"),
            score=round(score, 2),
        ))
    return hypotheses


def _loading_underperformance_hypotheses(evidence: list[EvidenceItem]) -> list[OperationalHypothesis]:
    hypotheses: list[OperationalHypothesis] = []
    loading = _by_capability(evidence, "get_loading_performance")
    fleet = _by_capability(evidence, "get_fleet_status")

    if loading is not None:
        unidades = loading.get("unidades") or []
        peor = min((float(u.get("variacion_pct") or 0) for u in unidades), default=0)
        score = min(1.0, max(0.0, -peor / 40))
        hypotheses.append(OperationalHypothesis(
            hypothesis_id=new_id("hyp"),
            label="Tasa de carguío bajo el promedio de flota",
            status=_status_from_score(score, bool(unidades)),
            supporting_evidence_ids=_evidence_id_for(evidence, "get_loading_performance") if score >= 0.3 else [],
            contradicting_evidence_ids=[] if score >= 0.3 else _evidence_id_for(evidence, "get_loading_performance"),
            score=round(score, 2) if unidades else None,
        ))

    if fleet is not None:
        disponibilidad = float(fleet.get("disponibilidad_pct") or 100)
        score = max(0.0, min(1.0, (90 - disponibilidad) / 30))
        hypotheses.append(OperationalHypothesis(
            hypothesis_id=new_id("hyp"),
            label="Camiones insuficientes asignados a la unidad (no es un problema de la pala en sí)",
            status=_status_from_score(score, True),
            supporting_evidence_ids=_evidence_id_for(evidence, "get_fleet_status") if score >= 0.3 else [],
            contradicting_evidence_ids=[] if score >= 0.3 else _evidence_id_for(evidence, "get_fleet_status"),
            score=round(score, 2),
        ))
    return hypotheses
