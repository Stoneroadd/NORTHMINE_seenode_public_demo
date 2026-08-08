from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field

"""Esquemas de percepcion (Etapa 5, secciones 3 y 16 del brief).

Espejo backend, deliberadamente mas delgado que el TypeScript de
frontend/src/lib/agentPerception/types.ts: el backend no necesita
WidgetVisibilityState completo (boundingBox, intersectionRatio) para
razonar - solo necesita saber QUE widget esta enfocado/visible y su
resumen semantico, para resolver referencias ("este grafico") y para que
el Verifier tenga evidencia normalizada.
"""


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class PerceivedWidgetState(BaseModel):
    widget_id: str
    type: str
    label: str
    module_id: str
    semantic_summary: str
    freshness_status: Literal["current", "delayed", "stale", "unknown"] = "unknown"
    quality_status: Literal["high", "medium", "low", "unknown"] = "unknown"
    visual_capture_supported: bool = False
    visible: bool = False


class SemanticPerceptionState(BaseModel):
    """Ultimo estado semantico conocido de la sesion (Etapa 5, seccion 4) -
    se actualiza via parches incrementales `context.update`, nunca se
    reenvia completo desde el cliente salvo la primera vez."""

    route: str | None = None
    module_id: str | None = None
    section_id: str | None = None
    shift: str | None = None
    date_range: dict[str, str] | None = None
    active_filters: dict[str, Any] = Field(default_factory=dict)
    selected_entities: list[dict[str, str]] = Field(default_factory=list)
    focused_widget_id: str | None = None
    visible_widgets: dict[str, PerceivedWidgetState] = Field(default_factory=dict)
    active_drawer: str | None = None
    active_modal: str | None = None
    updated_at: str = Field(default_factory=now_iso)

    def apply_patch(self, changes: dict[str, Any]) -> None:
        """Aplica un parche incremental (seccion 4: 'evita eventos completos
        gigantes cuando solo cambio un filtro'). Solo pisa las claves
        presentes en `changes`, nunca reinicia el resto del estado."""
        if "route" in changes:
            self.route = changes["route"]
        if "moduleId" in changes:
            self.module_id = changes["moduleId"]
        if "sectionId" in changes:
            self.section_id = changes["sectionId"]
        if "shift" in changes:
            self.shift = changes["shift"]
        if "dateRange" in changes:
            self.date_range = changes["dateRange"]
        if "activeFilters" in changes:
            self.active_filters = changes["activeFilters"] or {}
        if "selectedEntities" in changes:
            self.selected_entities = changes["selectedEntities"] or []
        if "focusedWidgetId" in changes:
            self.focused_widget_id = changes["focusedWidgetId"]
        if "activeDrawer" in changes:
            self.active_drawer = changes["activeDrawer"]
        if "activeModal" in changes:
            self.active_modal = changes["activeModal"]
        if "visibleWidgets" in changes:
            for raw in changes["visibleWidgets"] or []:
                try:
                    widget = PerceivedWidgetState(
                        widget_id=raw["widgetId"], type=raw.get("type", "panel"), label=raw.get("label", raw["widgetId"]),
                        module_id=raw.get("moduleId", self.module_id or ""), semantic_summary=raw.get("semanticSummary", ""),
                        freshness_status=raw.get("freshnessStatus", "unknown"), quality_status=raw.get("qualityStatus", "unknown"),
                        visual_capture_supported=bool(raw.get("visualCaptureSupported", False)),
                        visible=raw.get("visibility", {}).get("level") in ("visible", "partially_visible"),
                    )
                    self.visible_widgets[widget.widget_id] = widget
                except (KeyError, TypeError):
                    continue
        self.updated_at = now_iso()

    def resolve_widget(self, widget_id: str | None) -> PerceivedWidgetState | None:
        if not widget_id:
            return None
        return self.visible_widgets.get(widget_id)

    def focused_widget(self) -> PerceivedWidgetState | None:
        return self.resolve_widget(self.focused_widget_id)


# ── Vision / observacion visual (seccion 16) ─────────────────────────────

VisionConfidence = Literal["low", "medium", "high"]


class VisionContext(BaseModel):
    module_id: str | None = None
    widget_id: str | None = None
    widget_label: str | None = None
    period: str | None = None
    equipment_id: str | None = None
    semantic_summary: str | None = None


class VisualObservation(BaseModel):
    observation_id: str = Field(default_factory=lambda: new_id("vobs"))
    capture_id: str
    target_type: Literal["widget", "viewport"]
    widget_id: str | None = None
    summary: str
    detected_elements: list[str] = Field(default_factory=list)
    possible_anomalies: list[str] = Field(default_factory=list)
    uncertainty: list[str] = Field(default_factory=list)
    confidence: VisionConfidence = "low"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AnalyzeImageRequest(BaseModel):
    capture_id: str = Field(max_length=80)
    target_type: Literal["widget", "viewport"]
    widget_id: str | None = Field(default=None, max_length=80)
    mime_type: Literal["image/webp", "image/jpeg", "image/png"]
    image_base64: str = Field(max_length=4_000_000)  # ~3MB de bytes tras decodificar base64
    context: VisionContext = Field(default_factory=VisionContext)


# ── Deteccion de conflictos (seccion 27) ─────────────────────────────────

class PerceptionConflict(BaseModel):
    conflict_id: str = Field(default_factory=lambda: new_id("conflict"))
    kind: Literal["ui_data_inconsistency"]
    description: str
    ui_value: Any = None
    backend_value: Any = None
    widget_id: str | None = None
    investigated: dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=now_iso)
