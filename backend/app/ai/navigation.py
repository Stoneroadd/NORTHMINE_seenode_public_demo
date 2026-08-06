from __future__ import annotations

"""Registro de navegacion semantica (Etapa 2 base).

Espejo deliberado y minimo de frontend/src/components/layout/AppShell.tsx::
sectionPaths - NO se importa ni se genera dinamicamente porque backend y
frontend son procesos/lenguajes distintos; si se agrega una seccion nueva
al sidebar, esta lista debe actualizarse a mano. Un test de contrato
(tests/test_ai_copilot.py) documenta ese acoplamiento para que no se
desincronice en silencio.

El agente nunca navega "a cualquier URL": solo a una de estas rutas
conocidas, sin importar lo que el modelo proponga.
"""

SECTION_TO_ROUTE: dict[str, str] = {
    "cockpit": "/cockpit",
    "operationalMap3d": "/operational-map-3d",
    "dashboard": "/resumen",
    "turno": "/turno",
    "produccion": "/produccion",
    "rendimiento": "/rendimiento",
    "flota": "/flota",
    "carguio": "/carguio",
    "averias": "/averias",
    "analisis": "/analisis",
    "aerea": "/aerea",
    "alertas": "/alertas",
    "reportes": "/reportes",
    "admin": "/admin",
}

ROUTE_TO_SECTION: dict[str, str] = {route: section for section, route in SECTION_TO_ROUTE.items()}

# Secciones que requieren un rol especifico en el frontend (Sidebar.tsx) -
# el agente no debe siquiera proponer navegar ahi para un rol sin permiso;
# el backend igual lo bloquearia (RBAC de los datos detras de esa seccion),
# pero proponer una navegacion que luego falla es una mala experiencia.
# Secciones ausentes de este dict = sin restriccion de rol.
SECTION_ALLOWED_ROLES: dict[str, frozenset[str]] = {
    "admin": frozenset({"admin"}),
}


def normalize_target(value: str) -> str | None:
    """Acepta tanto 'produccion' como '/produccion' y devuelve el SectionId, o None si no es valido."""
    cleaned = value.strip()
    if not cleaned:
        return None
    if cleaned in SECTION_TO_ROUTE:
        return cleaned
    if cleaned in ROUTE_TO_SECTION:
        return ROUTE_TO_SECTION[cleaned]
    return None


def is_navigation_allowed(value: str, role: str) -> bool:
    section = normalize_target(value)
    if section is None:
        return False
    allowed_roles = SECTION_ALLOWED_ROLES.get(section)
    if allowed_roles is None:
        return True
    return role in allowed_roles


def route_for_section(section: str) -> str | None:
    return SECTION_TO_ROUTE.get(section)
