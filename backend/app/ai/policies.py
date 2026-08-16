from __future__ import annotations

import re

"""Politica central de autorizacion del Copilot.

Nada de esto vive "solo en el prompt": el orquestador (orchestrator.py)
consulta estas funciones antes de ejecutar una herramienta o de dejar pasar
una accion, y el router (router.py) las vuelve a aplicar en el borde HTTP.
Que el modelo "decida" llamar una herramienta no es autorizacion; la
autorizacion es esta tabla.
"""

# Herramientas read-only del MVP (Fase B). Cualquier nombre que el modelo
# pida y no este aqui se rechaza antes de ejecutarse.
READ_ONLY_TOOLS: frozenset[str] = frozenset(
    {
        "get_current_shift_summary",
        "get_production_kpis",
        "get_fleet_status",
        "get_alerts",
        "get_data_quality_status",
        "get_loading_performance",
    }
)

# Que herramientas puede usar cada rol. admin/supervisor/operador comparten
# el set completo de lectura; el rol invitado/demo solo ve indicadores
# agregados sin el detalle operacional fino (alertas, flota nominal).
TOOLS_BY_ROLE: dict[str, frozenset[str]] = {
    "admin": READ_ONLY_TOOLS,
    "supervisor": READ_ONLY_TOOLS,
    "operador": READ_ONLY_TOOLS,
    "demo": frozenset({"get_current_shift_summary", "get_data_quality_status"}),
    "viewer": frozenset({"get_current_shift_summary", "get_data_quality_status"}),
}

# Roles que pueden usar el chat en absoluto.
CHAT_ALLOWED_ROLES: frozenset[str] = frozenset({"admin", "supervisor", "operador", "demo", "viewer"})

# Roles que pueden aprobar/rechazar tareas o informes borrador. Crear un
# borrador no requiere este permiso (cualquier rol de chat puede pedirlo);
# convertirlo en algo "oficial" si.
APPROVAL_ROLES: frozenset[str] = frozenset({"admin", "supervisor", "operador"})

# Acciones prohibidas explicitamente (seccion 4 del brief). El orquestador
# nunca expone estas como herramientas, pero se listan para que
# policies.py sea la referencia legible de lo que el agente jamas hace,
# y para que tests de seguridad puedan afirmarlo por nombre.
PROHIBITED_ACTIONS: frozenset[str] = frozenset(
    {
        "write_wenco",
        "write_fms",
        "change_equipment_assignment",
        "stop_or_start_equipment",
        "modify_production",
        "alter_operational_state",
        "delete_data",
        "execute_arbitrary_sql",
        "change_permissions",
        "create_user",
        "modify_credentials",
        "security_decision",
        "labor_decision",
        "override_supervisor_validation",
    }
)


def tools_allowed_for_role(role: str) -> frozenset[str]:
    return TOOLS_BY_ROLE.get(role, frozenset())


def is_tool_allowed(role: str, tool_name: str) -> bool:
    if tool_name not in READ_ONLY_TOOLS:
        return False
    return tool_name in tools_allowed_for_role(role)


def can_use_chat(role: str) -> bool:
    return role in CHAT_ALLOWED_ROLES


def can_approve(role: str) -> bool:
    return role in APPROVAL_ROLES


# ── Lenguaje: el agente nunca se presenta como autoridad final ──────────────
# Defensa en profundidad: aunque el prompt de sistema ya lo instruye, esta
# funcion reescribe frases de autoridad si el modelo las produce igual.
_AUTHORITY_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bhe decidido\b", re.IGNORECASE), "los datos sugieren"),
    (re.compile(r"\bdebes hacer esto inmediatamente\b", re.IGNORECASE), "se recomienda evaluar"),
    (re.compile(r"\bla accion correcta es\b", re.IGNORECASE), "una accion posible es"),
    (re.compile(r"\bgarantizo que\b", re.IGNORECASE), "la evidencia disponible indica que"),
]


def soften_language(text: str) -> str:
    result = text
    for pattern, replacement in _AUTHORITY_PATTERNS:
        result = pattern.sub(replacement, result)
    return result
