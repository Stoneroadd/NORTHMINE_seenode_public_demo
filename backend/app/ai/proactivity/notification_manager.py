from __future__ import annotations

from app.ai.proactivity import persistence
from app.ai.proactivity import policies as proactivity_policies
from app.ai.proactivity.models import ProactiveAgentEvent
from app.core.config import get_settings

"""NotificationManager (Etapa 6, secciones 14-15 del brief): entrega un
ProactiveAgentEvent YA APROBADO por InitiativeBudget a las sesiones vivas
correspondientes, respetando quiet mode y severidad minima de voz por
sesion. Nunca decide SI el evento debe existir (eso es InitiativeBudget +
TriggerEngine) - solo COMO se entrega.
"""

_SEVERITY_SPEECH_PREFIX: dict[str, str] = {
    "critical": "Alerta crítica. ",
    "high": "Advertencia. ",
    "warning": "Advertencia. ",
    "informational": "",
}


def _speech_text(event: ProactiveAgentEvent) -> str:
    # Seccion 15: nunca saludos ni lenguaje conversacional innecesario -
    # prefijo de severidad + el resumen tal cual, nada mas.
    prefix = _SEVERITY_SPEECH_PREFIX.get(event.severity, "")
    return f"{prefix}{event.summary}"[:260]


async def deliver(event: ProactiveAgentEvent) -> ProactiveAgentEvent:
    from app.ai import audit as runtime_audit
    from app.ai.runtime.runtime import speak_now
    from app.ai.runtime.event_bus import emit
    from app.ai.runtime.session_manager import session_manager

    persistence.save_proactive_event(event)
    runtime_audit.record_proactive_event_emitted(
        usuario=event.user_id, ip="internal", proactive_event_id=event.proactive_event_id,
        event_type=event.event_type, severity=event.severity,
    )
    if event.watch_id:
        runtime_audit.record_watch_triggered(
            usuario=event.user_id or "system", ip="internal", watch_id=event.watch_id,
            proactive_event_id=event.proactive_event_id,
        )
    settings = get_settings()

    if event.user_id:
        sessions = await session_manager.sessions_for_user(event.user_id)
    else:
        sessions = await session_manager.sessions_for_scope(event.company_id, event.site_id)

    for live in sessions:
        if not proactivity_policies.visual_allowed(live.quiet_mode, event.severity):
            continue
        correlation_id = f"corr-{event.proactive_event_id}"
        await emit(live, "proactive.event_emitted", correlation_id=correlation_id, payload={"event": event.model_dump(mode="json")})
        if event.watch_id:
            await emit(live, "watch.triggered", correlation_id=correlation_id, payload={"watchId": event.watch_id, "proactiveEventId": event.proactive_event_id})
        if proactivity_policies.voice_allowed(
            live.quiet_mode, event.severity, voice_minimum_severity=settings.agent_initiative_voice_minimum_severity,
        ):
            await speak_now(
                live, correlation_id, text=_speech_text(event), priority="proactive",
                segment_id=f"seg-{event.proactive_event_id}",
            )
    return event


def acknowledge(proactive_event_id: str, *, status: str, company_id: str | None, site_id: str | None) -> ProactiveAgentEvent | None:
    for event in persistence.list_proactive_events(company_id=company_id, site_id=site_id, limit=200):
        if event.proactive_event_id == proactive_event_id:
            updated = event.model_copy(update={"status": status})
            persistence.save_proactive_event(updated)
            return updated
    return None
