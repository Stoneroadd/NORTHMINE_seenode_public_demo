from __future__ import annotations

from app.ai.memory.models import SessionMemoryEntry, SessionMemoryEntryKind, SessionMemorySnapshot, now_iso

"""Memoria de sesion (Etapa 6, seccion 3.1 del brief). Vive dentro de
LiveSession (memoria de proceso, seccion 3.1: 'duracion: sesion activa') -
nunca se persiste como tal. Ventana limitada (no texto infinito) + resumen
estructurado, para resolver 'esa pala'/'el camion anterior'/'lo de hace un
rato'/'esa averia'/'el grafico que revisamos' por REFERENCIA ESTRUCTURADA,
no por reconstruir la conversacion.
"""

_WINDOW_SIZE = 20


class SessionMemory:
    __slots__ = (
        "_entries", "active_investigation_id", "active_investigation_summary", "last_widget_label",
        "last_entity_id", "last_entity_label", "last_entity_type", "last_investigation_id",
        "last_investigation_type", "last_report_id", "last_handover_id",
    )

    def __init__(self) -> None:
        self._entries: list[SessionMemoryEntry] = []
        self.active_investigation_id: str | None = None
        self.active_investigation_summary: str | None = None
        self.last_widget_label: str | None = None
        self.last_entity_id: str | None = None
        self.last_entity_label: str | None = None
        self.last_entity_type: str | None = None
        # Etapa 6: continuidad - 'esa investigacion'/'ese informe' se
        # resuelven contra el ULTIMO referenciado en esta sesion, no solo el
        # activo (una investigacion ya terminada sigue siendo 'esa
        # investigacion' un rato despues de terminar).
        self.last_investigation_id: str | None = None
        self.last_investigation_type: str | None = None
        self.last_report_id: str | None = None
        self.last_handover_id: str | None = None

    def _record(self, kind: SessionMemoryEntryKind, label: str, *, ref_id: str | None = None, entity_type: str | None = None) -> None:
        self._entries.append(SessionMemoryEntry(kind=kind, label=label, ref_id=ref_id, entity_type=entity_type))
        if len(self._entries) > _WINDOW_SIZE:
            self._entries.pop(0)

    def record_entity(self, *, entity_id: str, label: str, entity_type: str | None = None) -> None:
        self.last_entity_id = entity_id
        self.last_entity_label = label
        self.last_entity_type = entity_type
        self._record("entity", label, ref_id=entity_id, entity_type=entity_type)

    def record_widget(self, *, widget_id: str, label: str) -> None:
        self.last_widget_label = label
        self._record("widget", label, ref_id=widget_id)

    def record_investigation_started(self, *, investigation_id: str, goal: str, investigation_type: str | None = None) -> None:
        self.active_investigation_id = investigation_id
        self.last_investigation_id = investigation_id
        self.last_investigation_type = investigation_type
        self._record("investigation", goal, ref_id=investigation_id)

    def record_investigation_completed(self, *, investigation_id: str, summary: str) -> None:
        if self.active_investigation_id == investigation_id:
            self.active_investigation_summary = summary
            self.active_investigation_id = None

    def record_report(self, *, report_id: str) -> None:
        self.last_report_id = report_id

    def record_handover(self, *, handover_id: str) -> None:
        self.last_handover_id = handover_id

    def record_finding(self, *, finding_id: str, label: str) -> None:
        self._record("finding", label, ref_id=finding_id)

    def record_question(self, *, text: str) -> None:
        self._record("question", text[:160])

    def most_recent(self, kind: SessionMemoryEntryKind | None = None) -> SessionMemoryEntry | None:
        for entry in reversed(self._entries):
            if kind is None or entry.kind == kind:
                return entry
        return None

    def snapshot(self) -> SessionMemorySnapshot:
        return SessionMemorySnapshot(
            active_investigation_id=self.active_investigation_id,
            active_investigation_summary=self.active_investigation_summary,
            last_widget_label=self.last_widget_label,
            last_entity_id=self.last_entity_id,
            last_entity_label=self.last_entity_label,
            recent_entries=list(self._entries[-10:]),
        )
