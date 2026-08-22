from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from app.core.config import Settings

logger = logging.getLogger("northmine.ai.realtime.diagnostics")

"""Diagnostico minimo de acceso a OpenAI Realtime, previo a implementar la
integracion completa (Modo JARVIS full-duplex). Confirma que la
OPENAI_API_KEY configurada en el backend tiene acceso efectivo al modelo
Realtime elegido, sin abrir una sesion de audio real ni consumir minutos de
uso - solo mintea un client_secret efimero (la forma mas liviana de probar
`/v1/realtime/*` sin una llamada WebRTC completa) y lo descarta de
inmediato, nunca lo usa para abrir una sesion.

Nunca expone la API key: ni en logs, ni en la respuesta, ni en el mensaje
de error (se sanea antes de devolver algo al llamador).
"""

_CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets"
_MAX_ERROR_MESSAGE_CHARS = 200


@dataclass(frozen=True)
class RealtimeAccessCheck:
    api_key_configured: bool
    model_configured: str | None
    access_confirmed: bool
    http_status: int | None
    error_code: str | None
    error_message: str | None


def _sanitize(text: str, *, api_key: str) -> str:
    trimmed = text.strip()[:_MAX_ERROR_MESSAGE_CHARS]
    # Defensa adicional: si por algun motivo la key real aparece en el
    # texto (nunca deberia, OpenAI no la hace eco), se reemplaza antes de
    # que este mensaje salga del backend.
    if api_key and api_key in trimmed:
        trimmed = trimmed.replace(api_key, "***")
    return trimmed


def _extract_error(response: httpx.Response, *, api_key: str) -> tuple[str | None, str | None]:
    try:
        data = response.json()
    except ValueError:
        return None, None
    error = data.get("error") if isinstance(data, dict) else None
    if not isinstance(error, dict):
        return None, None
    code = error.get("code")
    message = error.get("message")
    return (
        str(code) if code is not None else None,
        _sanitize(str(message), api_key=api_key) if message is not None else None,
    )


async def check_openai_realtime_access(settings: Settings) -> RealtimeAccessCheck:
    api_key = settings.openai_api_key.strip()
    model = settings.openai_realtime_model.strip()

    if not api_key:
        return RealtimeAccessCheck(
            api_key_configured=False, model_configured=model or None,
            access_confirmed=False, http_status=None, error_code="missing_api_key", error_message=None,
        )
    if not model:
        return RealtimeAccessCheck(
            api_key_configured=True, model_configured=None,
            access_confirmed=False, http_status=None, error_code="missing_model", error_message=None,
        )

    body = {"session": {"type": "realtime", "model": model}}
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(_CLIENT_SECRETS_URL, json=body, headers=headers)
    except httpx.HTTPError as exc:
        logger.warning("OpenAI Realtime diagnostics: error de red model=%s", model)
        return RealtimeAccessCheck(
            api_key_configured=True, model_configured=model, access_confirmed=False,
            http_status=None, error_code="network_error", error_message=_sanitize(str(exc), api_key=api_key),
        )

    if response.status_code == 200:
        logger.info("OpenAI Realtime diagnostics: acceso confirmado model=%s", model)
        return RealtimeAccessCheck(
            api_key_configured=True, model_configured=model, access_confirmed=True,
            http_status=200, error_code=None, error_message=None,
        )

    error_code, error_message = _extract_error(response, api_key=api_key)
    logger.warning("OpenAI Realtime diagnostics: acceso rechazado model=%s status=%s code=%s", model, response.status_code, error_code)
    return RealtimeAccessCheck(
        api_key_configured=True, model_configured=model, access_confirmed=False,
        http_status=response.status_code, error_code=error_code, error_message=error_message,
    )
