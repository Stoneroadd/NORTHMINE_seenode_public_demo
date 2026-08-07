from __future__ import annotations

from app.ai.proactivity.models import ProactiveSeverity, QuietMode

"""Politicas de proactividad (Etapa 6, secciones 14-16 del brief): que
severidad se muestra visualmente, y cuando se habla en voz alta. Nunca
saludos ni lenguaje conversacional (seccion 15) - eso se aplica en el
formateador de texto hablado, no aca; esto solo decide SI se muestra/habla.
"""

_SEVERITY_ORDER: dict[str, int] = {"informational": 0, "warning": 1, "high": 2, "critical": 3}


def severity_at_least(severity: str, minimum: str) -> bool:
    return _SEVERITY_ORDER.get(severity, 0) >= _SEVERITY_ORDER.get(minimum, 0)


def visual_allowed(quiet_mode: QuietMode, severity: ProactiveSeverity) -> bool:
    """Seccion 16: quiet oculta todo; critical_only solo deja pasar
    criticos; normal/visual_only siempre muestran (la diferencia entre
    esos dos es exclusivamente si ademas se habla, ver voice_allowed)."""
    if quiet_mode == "quiet":
        return False
    if quiet_mode == "critical_only":
        return severity == "critical"
    return True


def voice_allowed(quiet_mode: QuietMode, severity: ProactiveSeverity, *, voice_minimum_severity: str) -> bool:
    if quiet_mode in ("quiet", "visual_only"):
        return False
    if quiet_mode == "critical_only":
        return severity == "critical"
    return severity_at_least(severity, voice_minimum_severity)
