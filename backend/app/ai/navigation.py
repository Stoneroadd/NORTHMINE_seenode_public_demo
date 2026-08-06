from __future__ import annotations

"""Registro de navegacion semantica (Etapa 2).

Espejo deliberado y minimo de frontend/src/lib/agentRegistry/modules.ts
(que a su vez re-exporta frontend/src/components/layout/AppShell.tsx::
sectionPaths para las 14 secciones del sidebar) - NO se importa ni se
genera dinamicamente porque backend y frontend son procesos/lenguajes
distintos; si se agrega un modulo nuevo, este archivo y modules.ts deben
actualizarse juntos. Un test de contrato (tests/test_ai_copilot.py)
documenta ese acoplamiento para que no se desincronice en silencio.

El agente nunca navega "a cualquier URL": solo a una de estas rutas
conocidas, sin importar lo que el modelo proponga. Esta es la MISMA
distincion que el resto del sistema: el frontend controla COMO se
ejecuta una accion; este archivo (consumido por orchestrator.py) decide
si esa accion puede siquiera PROPONERSE.
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
    # Rutas reales fuera del sidebar (App.tsx::renderSection las resuelve
    # por chequeo directo de pathname, ver modules.ts::EXTRA_ROUTES).
    "prediccion": "/prediccion",
    "simulador": "/simulador",
    "comparativa": "/comparativa",
    "operatorRanking": "/operator-ranking",
    "adminSistema": "/admin/sistema",
    "adminUsers": "/admin/users",
    "adminDemoAccess": "/admin/demo-access",
    "adminAuditoria": "/admin/auditoria",
}

ROUTE_TO_SECTION: dict[str, str] = {route: section for section, route in SECTION_TO_ROUTE.items()}

# Secciones que requieren un rol especifico. Ausentes de este dict = sin
# restriccion de rol (espejo de los chequeos inline en App.tsx::renderSection).
SECTION_ALLOWED_ROLES: dict[str, frozenset[str]] = {
    "admin": frozenset({"admin"}),
    "operatorRanking": frozenset({"admin", "supervisor"}),
    "adminSistema": frozenset({"admin"}),
    "adminUsers": frozenset({"admin"}),
    "adminDemoAccess": frozenset({"admin"}),
    "adminAuditoria": frozenset({"admin"}),
}

# Secciones sin contenido real o deliberadamente fuera del alcance del
# agente (seccion 20 del brief: "no afirmes control semantico completo si
# solo permite navegacion" - aca directamente no se permite ni eso).
# Rechazadas para CUALQUIER rol, independiente de SECTION_ALLOWED_ROLES.
UNAVAILABLE_SECTIONS: frozenset[str] = frozenset(
    {"admin", "adminSistema", "adminUsers", "adminDemoAccess", "adminAuditoria"}
)

# Allowlist de widgets instrumentados (Etapa 2). El modelo solo puede pedir
# focus_widget/explain_widget sobre un id de esta lista - cualquier otro
# valor (inventado o de un modulo no instrumentado) se rechaza aca, ANTES
# de que la validacion mas fina (existe de verdad, esta en el registry del
# navegador) ocurra del lado del frontend.
KNOWN_WIDGET_IDS: frozenset[str] = frozenset(
    {
        # Cockpit: 6 anclas de seccion + 1 KPI.
        "sec-turno", "sec-comparativa", "sec-equipos", "sec-produccion", "sec-decisiones", "sec-flota",
        "cockpit-production-summary",
        # Produccion.
        "production-hourly-chart", "production-plan-compliance",
        # Flota.
        "fleet-status-table",
        # Alertas.
        "alerts-priority-list",
        # Reportes.
        "reportes-turno-actual",
    }
)


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
    if section in UNAVAILABLE_SECTIONS:
        return False
    allowed_roles = SECTION_ALLOWED_ROLES.get(section)
    if allowed_roles is None:
        return True
    return role in allowed_roles


def is_widget_known(widget_id: str) -> bool:
    return widget_id in KNOWN_WIDGET_IDS


def route_for_section(section: str) -> str | None:
    return SECTION_TO_ROUTE.get(section)
