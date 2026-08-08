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
    # Etapa 5: percepcion (seccion 24 del brief)
    SCREEN_CONTEXT = "screen_context"
    EXPLAIN_WIDGET = "explain_widget"
    ANALYZE_WIDGET_VISUALLY = "analyze_widget_visually"
    ANALYZE_CURRENT_VIEW = "analyze_current_view"
    FOCUS_VISIBLE_ENTITY = "focus_visible_entity"
    # Etapa 6: memoria, proactividad, informes/tareas (seccion 6 y 31 del brief)
    RECALL_OPERATIONAL_CONTEXT = "recall_operational_context"
    COMPARE_WITH_MEMORY = "compare_with_memory"
    REOPEN_INVESTIGATION = "reopen_investigation"
    CREATE_WATCH = "create_watch"
    CANCEL_WATCH = "cancel_watch"
    SET_QUIET_MODE = "set_quiet_mode"
    GENERATE_HANDOVER = "generate_handover"
    MODIFY_REPORT = "modify_report"
    CREATE_TASK_DRAFT = "create_task_draft"
    SHOW_PENDING_WORK = "show_pending_work"
    UNKNOWN = "unknown"


class AgentCommand(BaseModel):
    type: AgentCommandType
    raw_text: str
    investigation_type: InvestigationType | None = None
    target_module: str | None = None
    equipment_query: str | None = None
    widget_reference: str | None = None
    confidence: Literal["rule", "llm", "unknown"] = "rule"
    # Etapa 6
    quiet_mode: str | None = None
    quiet_duration_minutes: int | None = None
    report_modification: str | None = None
    task_description: str | None = None


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


_WIDGET_TYPE_WORDS = ("grafico", "gráfico", "tabla", "indicador", "kpi", "mapa")


def _extract_widget_reference(normalized: str) -> str | None:
    """Extrae la referencia natural a un widget ('este grafico', 'esa tabla')
    para que focusResolution (frontend) o perception_state (backend) la
    resuelvan por semantica - nunca por coordenadas (seccion 8 del brief)."""
    for word in _WIDGET_TYPE_WORDS:
        match = re.search(rf"\b(?:este|esta|ese|esa)\s+{word}\b", normalized)
        if match:
            return match.group(0)
    if "lo que tengo abierto" in normalized or "que tengo abierto" in normalized:
        return "lo que tengo abierto"
    return None


_DURATION_PATTERN = re.compile(r"(\d+|un|una|dos|tres|cuatro|cinco)\s*(hora|minuto)s?")
_SPELLED_NUMBERS = {"un": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5}


def _extract_quiet_duration_minutes(normalized: str) -> int | None:
    match = _DURATION_PATTERN.search(normalized)
    if not match:
        return None
    raw_amount, unit = match.group(1), match.group(2)
    amount = _SPELLED_NUMBERS.get(raw_amount, 0) if not raw_amount.isdigit() else int(raw_amount)
    return amount * 60 if unit == "hora" else amount


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
    # "sigue" a secas retoma la investigacion pausada; "sigue pasando/
    # ocurriendo/asi" es una PREGUNTA de continuidad (Etapa 6, seccion 6),
    # no una orden de reanudar - el lookahead negativo evita esa colision.
    if _has(normalized, r"\bcontin[uú]a\b", r"\breanuda\b", r"\bresume\b", r"\bsigue\b(?!\s+(pasando|ocurriendo|as[ií]))"):
        return AgentCommand(type=AgentCommandType.RESUME, raw_text=text)
    # "cancela ese seguimiento/vigilancia" es CANCEL_WATCH (Etapa 6), no un
    # cancel de investigacion - mismo patron de exclusion que 'sigue' arriba.
    if _has(
        normalized, r"\bcancela\b(?!\s+(?:el |ese |esa )?(?:seguimiento|vigilancia))",
        r"\bcancelar\b(?!\s+(?:el |ese |esa )?(?:seguimiento|vigilancia))", r"\baborta\b",
    ):
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

    # ── Continuidad conversacional (Etapa 6, seccion 6) - se resuelve por
    # memoria estructurada, nunca recurre de entrada al LLM ─────────────────
    if _has(
        normalized, r"\bsigue (?:pasando|ocurriendo|as[ií])\b", r"\by[aá]? tuvimos (?:este|esta) (?:problema|situaci[oó]n)\b",
        r"\bqu[eé] pas[oó] (?:antes|la [uú]ltima vez) con\b", r"\bviene (?:pasando|ocurriendo|bajando|perdiendo)\b",
        r"\bviene desde antes\b",
    ):
        return AgentCommand(type=AgentCommandType.RECALL_OPERATIONAL_CONTEXT, raw_text=text, equipment_query=_extract_equipment_query(normalized))

    if _has(normalized, r"\bcomp[aá]ralo con lo anterior\b", r"\bqu[eé] cambi[oó] desde\b", r"\bcompara(?:lo)? con (?:la [uú]ltima vez|lo anterior|antes)\b"):
        return AgentCommand(type=AgentCommandType.COMPARE_WITH_MEMORY, raw_text=text, equipment_query=_extract_equipment_query(normalized))

    if _has(normalized, r"\breabr(?:e|ir)\b.*\binvestigaci[oó]n\b", r"\breabre\b.*\b(?:eso|esa|ese)\b"):
        return AgentCommand(type=AgentCommandType.REOPEN_INVESTIGATION, raw_text=text, equipment_query=_extract_equipment_query(normalized))

    # ── Proactividad: modo silencioso y watches (Etapa 6, secciones 12/16).
    # Modo silencioso SIEMPRE antes que CREATE_WATCH: 'solo avisame si es
    # critico' contiene literalmente 'avisame si', que si no fuera por este
    # orden clasificaria como CREATE_WATCH en vez de SET_QUIET_MODE ─────────
    if _has(
        normalized, r"\bsilencio\b", r"\bmodo silencioso\b", r"\bsolo av[ií]same si es cr[ií]tico\b",
        r"\bno hables,? solo mu[eé]stralo\b", r"\bmodo normal\b", r"\bsolo (?:visual|mu[eé]stralo)\b",
    ):
        if _has(normalized, r"\bsolo av[ií]same si es cr[ií]tico\b"):
            mode = "critical_only"
        elif _has(normalized, r"\bmodo normal\b"):
            mode = "normal"
        elif _has(normalized, r"\bno hables,? solo mu[eé]stralo\b", r"\bsolo (?:visual|mu[eé]stralo)\b"):
            mode = "visual_only"
        else:
            mode = "quiet"
        return AgentCommand(
            type=AgentCommandType.SET_QUIET_MODE, raw_text=text, quiet_mode=mode,
            quiet_duration_minutes=_extract_quiet_duration_minutes(normalized),
        )

    if _has(normalized, r"\bcancela (?:el |ese |esa )?(?:seguimiento|vigilancia)\b", r"\bdeja de vigilar\b"):
        return AgentCommand(type=AgentCommandType.CANCEL_WATCH, raw_text=text, equipment_query=_extract_equipment_query(normalized))

    if _has(normalized, r"\bav[ií]same si\b", r"\bavisa(?:me)? cuando\b", r"\bhaz(?:me)? seguimiento\b"):
        return AgentCommand(type=AgentCommandType.CREATE_WATCH, raw_text=text, equipment_query=_extract_equipment_query(normalized))

    # ── Work products: informes, handover, tareas (Etapa 6, secciones 22-25) ─
    if _has(normalized, r"\b(?:prep[aá]ra(?:me)?|genera(?:r)?)\b.*\bcambio de turno\b", r"\bhandover\b"):
        return AgentCommand(type=AgentCommandType.GENERATE_HANDOVER, raw_text=text)

    if _has(
        normalized, r"\bhazlo m[aá]s ejecutivo\b", r"\bagrega\b.*\b(?:aver[ií]a|gr[aá]fico|secci[oó]n|recomendaci[oó]n)\b",
        r"\belimina\b.*\b(?:recomendaci[oó]n|secci[oó]n)\b", r"\bdestaca\b", r"\bcambia el periodo\b",
    ):
        return AgentCommand(type=AgentCommandType.MODIFY_REPORT, raw_text=text, report_modification=text.strip())

    if _has(normalized, r"\bcrea(?:r)? (?:una |un )?(?:tarea|pendiente)\b"):
        return AgentCommand(type=AgentCommandType.CREATE_TASK_DRAFT, raw_text=text, task_description=text.strip())

    if _has(normalized, r"\bqu[eé] (?:tengo|hay) pendiente\b", r"\bmu[eé]strame las tareas\b", r"\btareas pendientes\b", r"\bseguimientos activos\b"):
        return AgentCommand(type=AgentCommandType.SHOW_PENDING_WORK, raw_text=text)

    # ── Percepcion (Etapa 5, seccion 24) - siempre reglas primero, el
    # VisionProvider solo entra cuando la ejecucion real lo requiere ────────
    if _has(normalized, r"\bqu[eé] estoy viendo\b", r"\bqu[eé] veo\b", r"\bd[oó]nde estoy\b", r"\ben qu[eé] (?:pantalla|m[oó]dulo|secci[oó]n) estoy\b"):
        return AgentCommand(type=AgentCommandType.SCREEN_CONTEXT, raw_text=text)

    if _has(normalized, r"\bqu[eé] ves raro\b", r"\banomal[ií]a\b") and not _has(normalized, r"\bpantalla\b", r"\bvista\b"):
        return AgentCommand(type=AgentCommandType.ANALYZE_WIDGET_VISUALLY, raw_text=text, widget_reference=_extract_widget_reference(normalized))

    if _has(normalized, r"\banaliza (?:esta |esa )?(?:pantalla|vista)\b", r"\bqu[eé] ves raro (?:en esta pantalla|aqu[ií])\b"):
        return AgentCommand(type=AgentCommandType.ANALYZE_CURRENT_VIEW, raw_text=text)

    if _has(normalized, r"\bexpl[ií]came (?:este|esta|ese|esa) (?:gr[aá]fico|indicador|kpi|tabla)\b", r"\bqu[eé] significa (?:este|ese) indicador\b"):
        return AgentCommand(type=AgentCommandType.EXPLAIN_WIDGET, raw_text=text, widget_reference=_extract_widget_reference(normalized))

    if _has(normalized, r"\bmu[eé]strame (?:ese|esa|el|la|d[oó]nde est[aá])\b.*\b(equipo|pala|caex|cami[oó]n)\b", r"\babre lo que est[aá] causando\b"):
        return AgentCommand(type=AgentCommandType.FOCUS_VISIBLE_ENTITY, raw_text=text, equipment_query=_extract_equipment_query(normalized))

    # ── Generar informe ────────────────────────────────────────────────────
    if _has(normalized, r"\bgenera(?:r)? (?:un |el )?(?:informe|reporte)\b"):
        return AgentCommand(type=AgentCommandType.GENERATE_REPORT, raw_text=text)

    # ── Mostrar evidencia ──────────────────────────────────────────────────
    if _has(normalized, r"\bver evidencia\b", r"\bmu[eé]strame la evidencia\b", r"\bmuestra la evidencia\b"):
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
