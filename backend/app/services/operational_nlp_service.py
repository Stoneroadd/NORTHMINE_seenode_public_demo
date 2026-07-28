from __future__ import annotations

import os
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime
from typing import Any

from app.services.hidden_loss_service import build_hidden_losses_response
from app.services.kpis import build_operational_alerts


OPERATIONAL_NLP_API_VERSION = "v1"

TEXT_COLLECTION_KEYS = (
    "novedades",
    "novedad",
    "notes",
    "comments",
    "comentarios",
    "observaciones",
    "bitacora",
    "bitacoras",
    "reports",
    "reportes",
    "emails",
    "events",
    "maintenance_notes",
)
TEXT_FIELD_KEYS = (
    "text",
    "texto",
    "title",
    "titulo",
    "description",
    "descripcion",
    "comment",
    "comentario",
    "observacion",
    "body",
    "subject",
    "message",
    "detalle",
)

PATTERNS: tuple[dict[str, Any], ...] = (
    {
        "id": "operator_wait",
        "label": "espera por operador",
        "category": "FACTOR_HUMANO",
        "keywords": (
            "espera por operador",
            "espera operador",
            "esperando operador",
            "sin operador",
            "operador no disponible",
            "relevo tardio",
        ),
        "base_minutes": 17,
        "recommendation": "Validar cobertura de operador, relevos y asignacion de equipos antes del cambio de turno.",
    },
    {
        "id": "shovel_queue",
        "label": "cola en pala",
        "category": "CARGUIO",
        "keywords": ("cola pala", "cola en pala", "espera en pala", "cola ex", "pala saturada", "carguio saturado"),
        "base_minutes": 14,
        "recommendation": "Cruzar cola por pala con asignacion CAEX y redistribuir equipos hacia frente con menor espera.",
    },
    {
        "id": "standby",
        "label": "standby operacional",
        "category": "CAPACIDAD_NO_UTILIZADA",
        "keywords": ("standby", "sin actividad", "detenido sin", "espera instruccion", "sin asignacion"),
        "base_minutes": 18,
        "recommendation": "Separar standby operacional de falla real y reasignar equipos disponibles.",
    },
    {
        "id": "breakdown",
        "label": "averia o mantencion repetida",
        "category": "MANTENCION",
        "keywords": ("averia", "mantencion", "falla", "mecanica", "electrica", "neumatico", "repuesto"),
        "base_minutes": 24,
        "recommendation": "Escalar equipos con menciones repetidas a mantencion y validar duracion real del evento.",
    },
    {
        "id": "route_congestion",
        "label": "ruta o descarga saturada",
        "category": "RUTA_DESTINO",
        "keywords": ("ruta saturada", "camino lento", "chancado saturado", "descarga saturada", "botadero lleno", "congestion"),
        "base_minutes": 16,
        "recommendation": "Balancear destinos y revisar restricciones aguas abajo antes de sostener el flujo actual.",
    },
    {
        "id": "fuel_wear",
        "label": "combustible o desgaste alto",
        "category": "COSTO_OPERACIONAL",
        "keywords": ("combustible", "consumo alto", "desgaste", "neumaticos", "ralenti", "relenti"),
        "base_minutes": 9,
        "recommendation": "Cruzar consumo, ralenti y rutas con costo por tonelada para priorizar recuperacion economica.",
    },
    {
        "id": "low_utilization",
        "label": "baja utilizacion relativa",
        "category": "PRODUCTIVIDAD",
        "keywords": ("baja utilizacion", "bajo rendimiento", "pocos ciclos", "poco tonelaje", "bajo aporte"),
        "base_minutes": 15,
        "recommendation": "Comparar equipos mencionados contra promedio de turno y revisar asignacion operacional.",
    },
)


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _float_env(name: str, default: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _normalize(value: str) -> str:
    text = unicodedata.normalize("NFKD", value)
    text = "".join(char for char in text if not unicodedata.combining(char))
    return re.sub(r"\s+", " ", text.lower()).strip()


def _parse_timestamp(value: Any) -> str | None:
    if not value:
        return None
    text = str(value)
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).isoformat(timespec="seconds")
    except ValueError:
        return text


def _text_from_item(item: Any) -> str:
    if isinstance(item, str):
        return item
    if not isinstance(item, dict):
        return ""
    parts = [str(item[key]) for key in TEXT_FIELD_KEYS if item.get(key)]
    return " ".join(parts)


def _metadata_from_item(item: Any) -> dict[str, Any]:
    if not isinstance(item, dict):
        return {}
    return {
        "timestamp": item.get("timestamp") or item.get("datetime") or item.get("fecha") or item.get("date"),
        "equipment_id": item.get("equipment_id") or item.get("equipo") or item.get("caex_id") or item.get("carguio_id"),
        "operator_id": item.get("operator_id") or item.get("operador") or item.get("operador_caex") or item.get("operador_pala"),
        "shift": item.get("turno") or item.get("turno_calc") or item.get("shift"),
    }


def _add_document(
    documents: list[dict[str, Any]],
    seen: set[str],
    *,
    text: str,
    source_type: str,
    source_id: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if len(cleaned) < 6:
        return
    dedupe_key = _normalize(cleaned)[:260]
    if dedupe_key in seen:
        return
    seen.add(dedupe_key)
    meta = metadata or {}
    documents.append(
        {
            "id": f"{source_type}-{len(documents) + 1}",
            "source_type": source_type,
            "source_id": source_id,
            "text": cleaned,
            "normalized": _normalize(cleaned),
            "timestamp": _parse_timestamp(meta.get("timestamp")),
            "equipment_id": meta.get("equipment_id"),
            "operator_id": meta.get("operator_id"),
            "shift": meta.get("shift"),
        }
    )


def _collect_text_documents(dataset: dict[str, Any], alerts: dict[str, Any]) -> list[dict[str, Any]]:
    documents: list[dict[str, Any]] = []
    seen: set[str] = set()

    for key in TEXT_COLLECTION_KEYS:
        value = dataset.get(key)
        if not value:
            continue
        rows = value if isinstance(value, list) else [value]
        for index, item in enumerate(rows):
            _add_document(
                documents,
                seen,
                text=_text_from_item(item),
                source_type="free_text",
                source_id=f"{key}:{index}",
                metadata=_metadata_from_item(item),
            )

    for index, record in enumerate(dataset.get("cycles", [])):
        text = _text_from_item(record)
        if text:
            _add_document(
                documents,
                seen,
                text=text,
                source_type="cycle_text",
                source_id=f"cycle:{index}",
                metadata=_metadata_from_item(record),
            )

    for index, alert in enumerate(alerts.get("items", [])):
        _add_document(
            documents,
            seen,
            text=_text_from_item(alert),
            source_type="operational_alert",
            source_id=str(alert.get("id") or index),
            metadata=_metadata_from_item(alert),
        )

    return documents


def _extract_equipment(text: str, explicit: Any = None) -> list[str]:
    found: set[str] = set()
    if explicit:
        found.add(str(explicit).strip().upper().replace(" ", "-"))
    for match in re.finditer(r"\b(?:CAEX|EX|CF|PC|PALA|CAMION)[\s\-:]?\d{2,5}\b", text.upper()):
        found.add(re.sub(r"[\s:]+", "-", match.group(0)))
    return sorted(item for item in found if item)


def _extract_operator(text: str, explicit: Any = None) -> list[str]:
    found: set[str] = set()
    if explicit:
        found.add(str(explicit).strip())
    for match in re.finditer(r"\bOP(?:ERADOR)?[\s\-:]?(\d{2,5})\b", text.upper()):
        found.add(f"OP{match.group(1)}")
    return sorted(item for item in found if item)


def _pattern_matches(normalized_text: str, pattern: dict[str, Any]) -> list[str]:
    return [keyword for keyword in pattern["keywords"] if _normalize(str(keyword)) in normalized_text]


def _trend_for(documents: list[dict[str, Any]]) -> str:
    if len(documents) < 4:
        return "SIN_HISTORIA"
    ordered = sorted(documents, key=lambda item: item.get("timestamp") or "")
    midpoint = len(ordered) // 2
    previous = len(ordered[:midpoint])
    recent = len(ordered[midpoint:])
    if recent > previous * 1.2:
        return "EN_AUMENTO"
    if recent < previous * 0.8:
        return "EN_DESCENSO"
    return "ESTABLE"


def _confidence(frequency: int, free_texts: int, total_docs: int) -> str:
    if frequency >= 8 and free_texts >= 4:
        return "ALTA"
    if frequency >= 2 and total_docs >= 3:
        return "MEDIA"
    return "BAJA"


def _impact_for(pattern: dict[str, Any], frequency: int, hidden_recoverable: int) -> tuple[float, int]:
    minutes = frequency * float(pattern["base_minutes"])
    delay_cost = _float_env("NORTHMINE_DELAY_COST_USD_PER_MIN", 85.0)
    value_per_tonne = _float_env("NORTHMINE_VALUE_PER_TONNE_USD", 4.5)
    cost_per_tonne = _float_env("NORTHMINE_COST_PER_TONNE_USD", 3.07)
    margin = max(0.1, value_per_tonne - cost_per_tonne)
    tonnes = minutes * _float_env("NORTHMINE_NLP_TONNES_PER_LOSS_MIN", 1.25)
    estimated = round(minutes * delay_cost + tonnes * margin)
    linked = round(min(hidden_recoverable, estimated * 0.55)) if hidden_recoverable else 0
    return round(minutes / 60.0, 2), estimated + linked


def _build_patterns(documents: list[dict[str, Any]], hidden_loss_context: dict[str, Any]) -> list[dict[str, Any]]:
    hidden_recoverable = int(hidden_loss_context.get("recoverable_value_usd") or 0)
    total_docs = len(documents)
    free_texts = sum(1 for item in documents if item["source_type"] in {"free_text", "cycle_text"})
    results: list[dict[str, Any]] = []

    for pattern in PATTERNS:
        matched_docs: list[dict[str, Any]] = []
        keywords: Counter[str] = Counter()
        equipment: Counter[str] = Counter()
        operators: Counter[str] = Counter()
        evidence: list[str] = []

        for document in documents:
            matched_keywords = _pattern_matches(document["normalized"], pattern)
            if not matched_keywords:
                continue
            matched_docs.append(document)
            keywords.update(matched_keywords)
            equipment.update(_extract_equipment(document["text"], document.get("equipment_id")))
            operators.update(_extract_operator(document["text"], document.get("operator_id")))
            if len(evidence) < 4:
                evidence.append(document["text"][:180])

        if not matched_docs:
            continue

        frequency = len(matched_docs)
        free_text_frequency = sum(1 for item in matched_docs if item["source_type"] in {"free_text", "cycle_text"})
        lost_hours, estimated_impact = _impact_for(pattern, frequency, hidden_recoverable)
        confidence = _confidence(frequency, free_texts, total_docs)
        results.append(
            {
                "id": pattern["id"],
                "label": pattern["label"],
                "category": pattern["category"],
                "frequency": frequency,
                "free_text_frequency": free_text_frequency,
                "source_documents": [item["id"] for item in matched_docs[:8]],
                "trend": _trend_for(matched_docs),
                "confidence": confidence,
                "estimated_lost_hours": lost_hours,
                "estimated_impact_usd": estimated_impact,
                "linked_hidden_loss_usd": round(min(hidden_recoverable, estimated_impact * 0.35)) if hidden_recoverable else 0,
                "associated_equipment": [item for item, _ in equipment.most_common(6)],
                "associated_operators": [item for item, _ in operators.most_common(6)],
                "keywords": [item for item, _ in keywords.most_common(6)],
                "evidence": evidence,
                "recommendation": pattern["recommendation"],
            }
        )

    return sorted(
        results,
        key=lambda item: (item["free_text_frequency"], item["frequency"], item["estimated_impact_usd"]),
        reverse=True,
    )


def _build_entities(patterns: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    equipment: dict[str, dict[str, Any]] = {}
    operators: dict[str, dict[str, Any]] = {}
    for pattern in patterns:
        for equipment_id in pattern["associated_equipment"]:
            row = equipment.setdefault(equipment_id, {"id": equipment_id, "mentions": 0, "patterns": set()})
            row["mentions"] += pattern["frequency"]
            row["patterns"].add(pattern["label"])
        for operator_id in pattern["associated_operators"]:
            row = operators.setdefault(operator_id, {"id": operator_id, "mentions": 0, "patterns": set()})
            row["mentions"] += pattern["frequency"]
            row["patterns"].add(pattern["label"])

    def serialize(rows: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
        return sorted(
            [{"id": item["id"], "mentions": item["mentions"], "patterns": sorted(item["patterns"])} for item in rows.values()],
            key=lambda item: item["mentions"],
            reverse=True,
        )[:10]

    return {"equipment": serialize(equipment), "operators": serialize(operators)}


def _source_mix(documents: list[dict[str, Any]]) -> dict[str, int]:
    counts = Counter(item["source_type"] for item in documents)
    return {
        "total_texts": len(documents),
        "free_texts": counts.get("free_text", 0) + counts.get("cycle_text", 0),
        "alert_texts": counts.get("operational_alert", 0),
    }


def _assemble_response(
    *,
    data_source: str,
    source: str,
    mode: str,
    stale: bool,
    documents: list[dict[str, Any]],
    patterns: list[dict[str, Any]],
    hidden_loss_context: dict[str, Any],
    warnings: list[str],
) -> dict[str, Any]:
    primary = patterns[0] if patterns else None
    shifts = {str(item.get("shift")) for item in documents if item.get("shift")}
    entities = _build_entities(patterns)
    mix = _source_mix(documents)
    return {
        "status": "STALE" if stale else "OK",
        "generated_at": _now_iso(),
        "api_version": OPERATIONAL_NLP_API_VERSION,
        "data_source": data_source,
        "source": source,
        "mode": mode,
        "is_demo": False,
        "stale": stale,
        "summary": {
            "emerging_pattern": primary["label"] if primary else "Sin patron operacional dominante",
            "frequency": primary["frequency"] if primary else 0,
            "shifts_analyzed": len(shifts) if shifts else None,
            "associated_equipment": primary["associated_equipment"] if primary else [],
            "estimated_lost_hours": primary["estimated_lost_hours"] if primary else 0,
            "estimated_impact_usd": primary["estimated_impact_usd"] if primary else 0,
            "trend": primary["trend"] if primary else "SIN_DATOS",
            "confidence": primary["confidence"] if primary else "BAJA",
        },
        "patterns": patterns,
        "entities": entities,
        "source_mix": mix,
        "hidden_loss_context": hidden_loss_context,
        "recommendations": [
            {
                "title": item["recommendation"],
                "pattern_id": item["id"],
                "estimated_impact_usd": item["estimated_impact_usd"],
                "confidence": item["confidence"],
            }
            for item in patterns[:4]
        ],
        "insights": [
            "El NLP operacional convierte textos libres y alertas en patrones accionables.",
            f"Patron principal: {primary['label']}." if primary else "No hay textos suficientes para un patron dominante.",
            f"Textos analizados: {mix['total_texts']} ({mix['free_texts']} libres, {mix['alert_texts']} alertas).",
        ],
        "warnings": warnings,
        "refresh_policy": {"analytics_seconds": 300, "heavy_analysis_seconds": 900},
    }


def build_operational_nlp_response(
    dataset: dict[str, Any] | None,
    *,
    demo_mode: bool,
    selected_date: str | None = None,
    selected_shift: str | None = None,
) -> dict[str, Any]:
    if demo_mode:
        raise ValueError("Modo demo deshabilitado: Operational NLP solo acepta datos reales WENCO.")

    if dataset is None:
        raise ValueError("Dataset operacional requerido cuando NORTHMINE_DEMO_MODE=false")

    alerts = build_operational_alerts(dataset)
    documents = _collect_text_documents(dataset, alerts)
    hidden = build_hidden_losses_response(
        dataset,
        demo_mode=False,
        selected_date=selected_date,
        selected_shift=selected_shift,
    )
    hidden_context = {
        "recoverable_value_usd": hidden["summary"]["recoverable_value_usd"],
        "primary_source": hidden["summary"]["primary_source"],
    }
    patterns = _build_patterns(documents, hidden_context)
    warnings: list[str] = []
    if not documents:
        warnings.append("No hay textos libres ni alertas textuales suficientes para analisis NLP operacional.")
    elif _source_mix(documents)["free_texts"] == 0:
        warnings.append("Analisis basado solo en alertas estructuradas convertidas a texto; conectar bitacoras para mayor confianza.")
    if hidden.get("stale"):
        warnings.append("Contexto de perdidas ocultas servido desde cache.")

    return _assemble_response(
        data_source="REAL",
        source=dataset.get("source", "wenco-sql-live"),
        mode="CACHE" if bool(dataset.get("stale")) else "DATOS_REALES",
        stale=bool(dataset.get("stale")),
        documents=documents,
        patterns=patterns,
        hidden_loss_context=hidden_context,
        warnings=warnings,
    )
