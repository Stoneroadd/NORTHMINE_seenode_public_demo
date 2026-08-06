from __future__ import annotations

import re
from enum import Enum
from typing import Callable, Literal

from pydantic import BaseModel

from app.ai.investigation_schemas import InvestigationType

"""Command Router determinista (Etapa 4, seccion 11 del brief).

El usuario no depende de un selector visual: escribe o dice una instruccion
en lenguaje natural y este router la clasifica con reglas deterministas
(regex/palabras clave) ANTES de considerar cualquier ayuda generativa.
Comandos criticos (pausar, detener, cancelar, interrumpir) SIEMPRE se
resuelven aca, nunca dependen de un proveedor de IA (seccion 11: "Comandos
criticos... no deben depender de un LLM") - de hecho, esta version no llama
a ningun LLM: `classify` acepta un `llm_fallback` opcional inyectable para
que, cuando exista un proveedor generativo disponible, una solicitud
ambigua (que no matchea ninguna regla) pueda resolverse ahi en vez de
quedar en UNKNOWN. Sin proveedor, el modo degradado sigue funcionando
exactamente igual (seccion 24).
"""


class AgentCommandType(str, Enum):
    START_INVESTIGATION = "start_investigation"
    MODIFY_INVESTIGATION = "modify_investigation"
    NAVIGATE = "navigate"
    PAUSE = "pause"
    RESUME = "resume"
    CANCEL = "cancel"
    INTERRUPT = "interrupt"
    SHOW_EVIDENCE = "show_evidence"
    GENERATE_REPORT = "generate_report"
    UNKNOWN = "unknown"


class AgentCommand(BaseModel):
    type: AgentCommandType
    raw_text: str
    investigation_type: InvestigationType | None = None
    target_module: str | None = None
    equipment_query: str | None = None
    confidence: Literal["rule", "llm", "unknown"] = "rule"


LLMClassifier = Callable[[str], "AgentCommand | None"]


def _norm(text: str) -> str:
    return text.strip().lower()


def _has(text: str, *patterns: str) -> bool:
    return any(re.search(p, text) for p in patterns)


_MODULE_KEYWORDS: list[tuple[str, str]] = [
    (r"\bproducci[oó]n\b", "produccion"),
    (r"\bcarg[uú]io\b", "carguio"),
    (r"\bflota\b", "flota"),
    (r"\baver[ií]as?\b", "averias"),
    (r"\balertas?\b", "alertas"),
    (r"\bcomparativ[ao]\b", "comparativa"),
    (r"\bturno\b", "turno"),
    (r"\brendimiento\b", "rendimiento"),
    (r"\breportes?\b", "reportes"),
    (r"\bcockpit\b|\bdecision cockpit\b", "cockpit"),
]


def _extract_module(text: str) -> str | None:
    for pattern, module_id in _MODULE_KEYWORDS:
        if re.search(pattern, text):
            return module_id
    return None


_EQUIPMENT_PATTERN = re.compile(r"\b(pala|caex|camion|cami[oó]n)\s*[- ]?\s*(\d{1,3})\b", re.IGNORECASE)


def _extract_equipment_query(text: str) -> str | None:
    match = _EQUIPMENT_PATTERN.search(text)
    if match:
        return f"{match.group(1).upper()} {match.group(2)}"
    # "concentrate en transporte" / "enfocate en carguio" sin numero de equipo:
    focus_match = re.search(r"(?:concentrate|enf[oó]cate|solo revisa|s[oó]lo revisa)\s+en\s+(.+)", text)
    if focus_match:
        return focus_match.group(1).strip().rstrip(".!?")
    return None


def classify(
    text: str,
    *,
    has_active_investigation: bool = False,
    llm_fallback: LLMClassifier | None = None,
) -> AgentCommand:
    normalized = _norm(text)

    # ── Comandos criticos: SIEMPRE reglas, nunca LLM ──────────────────────
    if _has(normalized, r"\bpausa\b", r"\bpausar\b", r"\ben pausa\b"):
        return AgentCommand(type=AgentCommandType.PAUSE, raw_text=text)
    if _has(normalized, r"\bcontin[uú]a\b", r"\breanuda\b", r"\bresume\b", r"\bsigue\b"):
        return AgentCommand(type=AgentCommandType.RESUME, raw_text=text)
    if _has(normalized, r"\bcancela\b", r"\bcancelar\b", r"\baborta\b"):
        return AgentCommand(type=AgentCommandType.CANCEL, raw_text=text)
    if _has(normalized, r"\bdet[eé]n(?:te|ganse)?\b", r"^\balto\b", r"\bstop\b", r"\bespera\b"):
        return AgentCommand(type=AgentCommandType.INTERRUPT, raw_text=text)

    # ── Modificacion de foco de una investigacion en curso ────────────────
    if has_active_investigation and _has(
        normalized, r"\bconc[eé]ntrate\b", r"\benf[oó]cate\b", r"\bsolo revisa\b", r"\bno revises\b",
    ):
        return AgentCommand(
            type=AgentCommandType.MODIFY_INVESTIGATION, raw_text=text,
            equipment_query=_extract_equipment_query(normalized),
        )

    # ── Generar informe ────────────────────────────────────────────────────
    if _has(normalized, r"\bgenera(?:r)? (?:un |el )?(?:informe|reporte)\b"):
        return AgentCommand(type=AgentCommandType.GENERATE_REPORT, raw_text=text)

    # ── Mostrar evidencia ──────────────────────────────────────────────────
    if _has(normalized, r"\bmu[eé]strame\b", r"\bmuestra\b", r"\bver evidencia\b") and not _has(
        normalized, r"\babre\b", r"\bnavega\b",
    ):
        return AgentCommand(
            type=AgentCommandType.SHOW_EVIDENCE, raw_text=text, target_module=_extract_module(normalized),
        )

    # ── Navegacion explicita ───────────────────────────────────────────────
    if _has(normalized, r"\babre\b", r"\bnavega\b", r"\bve a\b", r"\bir a\b"):
        module = _extract_module(normalized)
        if module:
            return AgentCommand(type=AgentCommandType.NAVIGATE, raw_text=text, target_module=module)

    # ── Iniciar investigacion (los 4 tipos cerrados de Etapa 3) ────────────
    investigation_type = _classify_investigation_type(normalized)
    if investigation_type is not None:
        return AgentCommand(
            type=AgentCommandType.START_INVESTIGATION, raw_text=text,
            investigation_type=investigation_type, equipment_query=_extract_equipment_query(normalized),
        )

    if llm_fallback is not None:
        result = llm_fallback(text)
        if result is not None:
            return result

    return AgentCommand(type=AgentCommandType.UNKNOWN, raw_text=text, confidence="unknown")


def _classify_investigation_type(normalized: str) -> InvestigationType | None:
    if _has(normalized, r"\bresumen del turno\b", r"\bresumen de turno\b", r"\bc[oó]mo va el turno\b"):
        return InvestigationType.SHIFT_SUMMARY
    if _has(normalized, r"\btiempo de ciclo\b", r"\bciclo\b.*\baument", r"\baument.*\bciclo\b"):
        return InvestigationType.CYCLE_TIME_INCREASE
    if _has(normalized, r"\bpala\b", r"\bunidad de carg[uú]io\b", r"\brendimiento de carg[uú]io\b") and _has(
        normalized, r"\binvestiga\b", r"\banaliza\b", r"\brevisa\b",
    ):
        return InvestigationType.LOADING_UNIT_UNDERPERFORMANCE
    if _has(normalized, r"\bproducci[oó]n\b") and _has(normalized, r"\binvestiga\b", r"\banaliza\b", r"\brevisa\b", r"\bbaj[oó]\b", r"\bca[ií]da\b"):
        return InvestigationType.PRODUCTION_DROP
    return None
