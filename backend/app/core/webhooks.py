from __future__ import annotations

import logging
import os

import httpx

ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")
SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL", "")
security_logger = logging.getLogger("northmine.security")


def send_security_alert(
    background_tasks,
    event_type: str,
    details: dict,
    severity: str = "info",
) -> None:
    security_logger.info("event=%s severity=%s details=%s", event_type, severity, str(details)[:500])
    if ENVIRONMENT == "development":
        print(f"[DEV ALERT] {event_type}: {details}")
        return

    if not SLACK_WEBHOOK_URL:
        return

    background_tasks.add_task(_send_slack, event_type, details, severity)


def _send_slack(event_type: str, details: dict, severity: str) -> None:
    colors = {"info": "#36a64f", "warning": "#f2c744", "critical": "#e01e5a"}

    try:
        httpx.post(
            SLACK_WEBHOOK_URL,
            json={
                "attachments": [
                    {
                        "color": colors.get(severity, "#cccccc"),
                        "title": f"NORTHMINE - {event_type}",
                        "fields": [
                            {"title": "Evento", "value": event_type, "short": True},
                            {"title": "Severidad", "value": severity, "short": True},
                            {"title": "Detalles", "value": str(details)[:500], "short": False},
                        ],
                    }
                ]
            },
            timeout=5.0,
        )
    except Exception:
        pass
