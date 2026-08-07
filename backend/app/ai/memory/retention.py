from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.ai.memory import persistence
from app.core.config import get_settings

"""Retention policy (Etapa 6, seccion 4 del brief).

Nada de memoria indiscriminada: cada capa tiene una politica explicita,
configurable, y NUNCA se guardan por diseño (aplicado en los propios
modelos/llamadores, no aca): audio crudo, screenshots, tokens, claves,
conversacion completa, pensamientos internos, saludos o frases casuales.

- session memory: vive en LiveSession (proceso), se pierde al cerrar la
  sesion - no requiere purge aca, no se persiste.
- working memory: turno + margen configurable (agent_working_memory_window_hours).
- episodic memory: politica configurable (agent_episode_retention_days),
  solo purga episodios YA CERRADOS (ended_at no nulo) - un episodio abierto
  nunca se borra por antiguedad.
- audit: politica independiente, ya gobernada por app.core.audit (fuera de
  alcance de este modulo).
"""


def working_memory_cutoff() -> str:
    settings = get_settings()
    cutoff = datetime.now(timezone.utc) - timedelta(hours=settings.agent_working_memory_window_hours)
    return cutoff.isoformat(timespec="seconds")


def episodic_memory_cutoff() -> str:
    settings = get_settings()
    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.agent_episode_retention_days)
    return cutoff.isoformat(timespec="seconds")


def apply_retention() -> dict[str, int]:
    """Purga lo vencido de cada capa persistente. Pensado para llamarse desde
    un scheduler periodico (EventMonitor) o un comando administrativo - NO
    se llama automaticamente en cada lectura, para que la latencia de
    consulta no dependa de un barrido de borrado."""
    working_removed = persistence.purge_working_memory_older_than(working_memory_cutoff())
    episodes_removed = persistence.purge_episodes_older_than(episodic_memory_cutoff())
    return {"working_memory_removed": working_removed, "episodes_removed": episodes_removed}
