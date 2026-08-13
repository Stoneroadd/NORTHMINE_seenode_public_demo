from __future__ import annotations

import re
from pathlib import Path

import pytest

from app.ai import navigation, planner, policies
from app.ai.capabilities import CAPABILITY_REGISTRY
from app.ai.investigation_schemas import InvestigationScope, InvestigationType
from app.ai.runtime.command_router import AgentCommandType, classify
from app.ai.tools import TOOL_REGISTRY

"""C5: contrato de capacidades — CAPABILITY_REGISTRY (backend) <->
capabilityActions.ts (frontend) <-> TOOL_REGISTRY <-> policies.py/
navigation.py (autorizacion real).

No hay codegen entre Python y TypeScript en este repo (mismo patron ya
confirmado para el protocolo WS: runtime/protocol.py <-> protocol.ts, sin
generacion automatica, espejo mantenido a mano pero disciplinado). No
existe tampoco un endpoint que exponga CAPABILITY_REGISTRY como JSON, y
agregar uno solo para este test violaria la regla de no introducir
round-trips frontend/backend para algo resoluble estaticamente (seccion
14 de la instruccion C5). Ante la ausencia de una alternativa
estructurada real, este archivo lee el .ts fuente y extrae los 'case' de
un switch con un regex deliberadamente angosto (un solo patron estable,
sin template literals ni casos computados en ese archivo) — la alternativa
real no es "evitar el regex", es "no tener ningun contract test".
"""

_REPO_ROOT = Path(__file__).resolve().parents[2]
_CAPABILITY_ACTIONS_TS = _REPO_ROOT / "frontend" / "src" / "lib" / "agentRegistry" / "capabilityActions.ts"

# IDs que el switch de TS maneja a proposito SIN ser capabilities de
# CAPABILITY_REGISTRY (documentado en el propio capabilityActions.ts):
# select_equipment_entity = paso sintetico que runtime.py inyecta cuando el
# usuario nombra un equipo explicito; navigate_direct = resuelto por
# moduleId en el llamador, retorna null a proposito (comentario propio).
_SYNTHETIC_FRONTEND_ONLY_IDS = {"select_equipment_entity", "navigate_direct"}

# ui_action que se disparan por un evento WS dedicado (perception.capture_
# requested, ver runtime.py::handle_analyze_visually), nunca por el
# ui_action.requested generico que capabilityActions.ts resuelve - no
# necesitan (ni deben tener) un 'case' en ese switch.
_DISPATCHED_VIA_DEDICATED_EVENT = {"capture_current_widget"}

# backend_tool que no viven en TOOL_REGISTRY (Etapa 1) porque son de
# percepcion ad-hoc (seccion 148-152 de capabilities.py), con handler
# propio en runtime.py en vez de un ToolDefinition.
_BACKEND_TOOL_WITH_DEDICATED_HANDLER = {"get_current_screen_context", "analyze_current_widget"}


def _frontend_capability_action_ids() -> set[str]:
    source = _CAPABILITY_ACTIONS_TS.read_text(encoding="utf-8")
    return set(re.findall(r"case '([a-zA-Z0-9_]+)':", source))


# ── 1. Integridad del registry ───────────────────────────────────────────

def test_capability_registry_dict_key_always_matches_its_own_id_field():
    for key, definition in CAPABILITY_REGISTRY.items():
        assert key == definition.id, f"'{key}' registrado con id interno '{definition.id}' distinto"


def test_capability_registry_has_no_duplicate_ids_across_kinds():
    ids = [d.id for d in CAPABILITY_REGISTRY.values()]
    assert len(ids) == len(set(ids))


# ── 2. Capabilities activas tienen handler real ──────────────────────────

def test_every_backend_tool_capability_has_a_real_handler():
    for cap_id, definition in CAPABILITY_REGISTRY.items():
        if definition.kind != "backend_tool":
            continue
        has_tool = cap_id in TOOL_REGISTRY
        has_dedicated_handler = cap_id in _BACKEND_TOOL_WITH_DEDICATED_HANDLER
        assert has_tool or has_dedicated_handler, f"'{cap_id}' es backend_tool sin TOOL_REGISTRY ni handler dedicado documentado"


def test_every_ui_action_capability_is_dispatched_somewhere_real():
    frontend_ids = _frontend_capability_action_ids()
    for cap_id, definition in CAPABILITY_REGISTRY.items():
        if definition.kind != "ui_action":
            continue
        dispatched_generic = cap_id in frontend_ids
        dispatched_dedicated = cap_id in _DISPATCHED_VIA_DEDICATED_EVENT
        assert dispatched_generic or dispatched_dedicated, (
            f"'{cap_id}' es ui_action pero no tiene 'case' en capabilityActions.ts "
            f"ni esta en _DISPATCHED_VIA_DEDICATED_EVENT"
        )


# ── 3. Contract test bidireccional backend <-> frontend ──────────────────

def test_frontend_capability_actions_never_reference_an_unknown_id():
    frontend_ids = _frontend_capability_action_ids()
    backend_ui_action_ids = {cap_id for cap_id, d in CAPABILITY_REGISTRY.items() if d.kind == "ui_action"}
    unknown = frontend_ids - backend_ui_action_ids - _SYNTHETIC_FRONTEND_ONLY_IDS
    assert not unknown, f"capabilityActions.ts tiene 'case' para ids sin capability ni excepcion documentada: {unknown}"


def test_no_ui_action_capability_is_silently_missing_from_the_frontend_switch():
    # Complemento del test anterior: cualquier ui_action NUEVA que se
    # agregue a CAPABILITY_REGISTRY debe declararse explicitamente en
    # capabilityActions.ts o en _DISPATCHED_VIA_DEDICATED_EVENT - nunca
    # caer en el 'default: return null' silencioso sin que este test lo note.
    frontend_ids = _frontend_capability_action_ids()
    for cap_id, definition in CAPABILITY_REGISTRY.items():
        if definition.kind != "ui_action":
            continue
        if cap_id in _DISPATCHED_VIA_DEDICATED_EVENT:
            continue
        assert cap_id in frontend_ids, f"'{cap_id}' quedaria en el 'default: return null' silencioso de capabilityActions.ts"


# ── 4. Autorizacion: backend sigue siendo autoridad, no el frontend ──────

def test_backend_tool_authorization_is_enforced_by_policies_not_by_the_unused_required_role_field():
    # required_role en CapabilityDefinition esta declarado "viewer" en las
    # 18 entradas pero NUNCA se lee en ningun otro archivo del backend (ver
    # auditoria C5) - confirmar que la autorizacion REAL (is_tool_allowed)
    # sigue restringiendo un rol de bajo privilegio aunque required_role
    # diga "viewer" para todos.
    assert all(d.required_role == "viewer" for d in CAPABILITY_REGISTRY.values())

    plan_demo = planner.build_plan(InvestigationType.PRODUCTION_DROP, InvestigationScope(), "demo")
    tool_steps_demo = {s.capability_id for s in plan_demo.steps if s.kind == "tool"}
    assert "get_fleet_status" not in tool_steps_demo  # demo no esta en TOOLS_BY_ROLE para esta tool
    assert any("sin permiso" in m for m in plan_demo.missing_capabilities)

    plan_operador = planner.build_plan(InvestigationType.PRODUCTION_DROP, InvestigationScope(), "operador")
    tool_steps_operador = {s.capability_id for s in plan_operador.steps if s.kind == "tool"}
    assert "get_fleet_status" in tool_steps_operador  # mismo required_role="viewer", distinto resultado real


def test_ui_action_authorization_is_enforced_by_navigation_role_check_not_bypassable_from_the_frontend(monkeypatch):
    # Ninguna ui_action registrada hoy apunta a una seccion restringida, asi
    # que se inyecta una capability sintetica temporal para demostrar que el
    # mecanismo (agregado en este mismo C5, ver planner.py) realmente
    # bloquea - no basta con que hoy "no haya ningun caso que falle".
    from app.ai.capabilities import CapabilityDefinition

    fake_id = "navigate_admin_only_test_capability"
    fake_capability = CapabilityDefinition(
        id=fake_id, kind="ui_action", investigation_types=(InvestigationType.PRODUCTION_DROP,),
        read_only=True, required_role="viewer", timeout_seconds=3, module_id="admin",
    )
    monkeypatch.setitem(CAPABILITY_REGISTRY, fake_id, fake_capability)
    monkeypatch.setitem(planner._TEMPLATES, InvestigationType.PRODUCTION_DROP, [
        *planner._TEMPLATES[InvestigationType.PRODUCTION_DROP], (fake_id, "test", "optional"),
    ])

    plan_admin = planner.build_plan(InvestigationType.PRODUCTION_DROP, InvestigationScope(), "admin")
    plan_operador = planner.build_plan(InvestigationType.PRODUCTION_DROP, InvestigationScope(), "operador")

    # 'admin' esta en UNAVAILABLE_SECTIONS (navigation.py) para CUALQUIER
    # rol, incluido admin - confirma que ni el rol mas alto se salta esto.
    assert fake_id not in {s.capability_id for s in plan_admin.steps}
    assert fake_id not in {s.capability_id for s in plan_operador.steps}
    assert any("sin permiso de navegacion" in m for m in plan_admin.missing_capabilities)


def test_frontend_visibility_never_substitutes_backend_authorization():
    # El frontend puede mostrar cualquier boton; lo unico que decide si algo
    # se ejecuta es is_tool_allowed/is_navigation_allowed en el backend.
    # 'viewer' (el rol mas bajo con acceso a chat) nunca puede ver flota.
    assert policies.is_tool_allowed("viewer", "get_fleet_status") is False
    assert navigation.is_navigation_allowed("admin", "viewer") is False
    assert navigation.is_navigation_allowed("adminUsers", "viewer") is False


# ── 5. Capability inexistente se rechaza, nunca se ejecuta fantasma ──────

def test_unregistered_capability_referenced_by_a_template_is_declared_missing_not_dropped_silently(monkeypatch):
    monkeypatch.setitem(planner._TEMPLATES, InvestigationType.SHIFT_SUMMARY, [
        ("this_capability_does_not_exist", "test", "required"),
    ])
    plan = planner.build_plan(InvestigationType.SHIFT_SUMMARY, InvestigationScope(), "admin")
    assert plan.steps == []
    assert any("no registrada" in m for m in plan.missing_capabilities)


def test_get_capability_returns_none_for_an_unknown_id():
    from app.ai.capabilities import get_capability

    assert get_capability("no-existe-esta-capability") is None


# ── 6. Execution contract: ui_action nunca fabrica evidencia ─────────────

FAKE_DATASET = {
    "source": "wenco-sql-live", "data_source": "REAL", "stale": False, "today": "2026-07-12",
    "plan": [{"date": "2026-07-12", "plan_tons": 3000}],
    "cycles": [
        {
            "id": f"c{i}", "datetime": f"2026-07-12T{8 + i % 10:02d}:10:00", "fecha_dia": "2026-07-12",
            "turno_calc": "DIA", "hora": 8 + i % 10, "caex_id": f"CAEX-{(i % 4) + 1:02d}",
            "carguio_id": f"EX-{(i % 2) + 1:02d}", "tonelaje": 180, "destino": "CHANCADO", "origen": "F01",
            "fase": "F01", "camion_modelo": "CAT793F", "pala_modelo": "EX5600",
            "tiempo_vacio_min": 10.0, "tiempo_cargado_min": 15.0,
        }
        for i in range(12)
    ],
}


@pytest.fixture(autouse=True)
def _deterministic_dataset(monkeypatch):
    from app.ai import tools as tools_module
    monkeypatch.setattr(tools_module, "provider_get_dataset", lambda fecha=None: FAKE_DATASET)


@pytest.mark.asyncio
async def test_ui_action_steps_never_produce_an_evidenceitem():
    from app.ai import executor

    plan = planner.build_plan(InvestigationType.PRODUCTION_DROP, InvestigationScope(), "admin")
    kinds_in_plan = {s.kind for s in plan.steps}
    assert "ui_action" in kinds_in_plan  # precondicion: el plan si trae pasos de UI

    evidence = await executor.run_plan(plan, role="admin")
    evidence_capability_ids = {e.capability_id for e in evidence}
    ui_action_capability_ids = {s.capability_id for s in plan.steps if s.kind == "ui_action"}
    assert not (evidence_capability_ids & ui_action_capability_ids)


@pytest.mark.asyncio
async def test_analytical_backend_tool_capability_produces_evidence_with_real_provenance():
    from app.ai import executor

    plan = planner.build_plan(InvestigationType.SHIFT_SUMMARY, InvestigationScope(), "admin")
    evidence = await executor.run_plan(plan, role="admin")
    fleet_evidence = next(e for e in evidence if e.capability_id == "get_fleet_status")

    assert fleet_evidence.source_type == "backend_tool"
    assert fleet_evidence.source  # nunca vacio - siempre trae de donde vino el dato
    assert fleet_evidence.verification_status in {"pending", "verified", "partial", "rejected"}
    assert fleet_evidence.quality_status in {"high", "medium", "low", "unknown"}
    assert fleet_evidence.freshness_status in {"current", "stale", "unknown"}


def test_no_required_ui_action_steps_exist_in_the_four_closed_templates():
    # Documentado en planner.py: "ninguna investigacion depende de un paso
    # ui_action para llegar a una conclusion". Si algun dia alguien agrega
    # una ui_action 'required', el flujo de ACK-bloqueante (ver
    # runtime/ui_actions.py) se activaria para algo que nunca deberia
    # bloquear una investigacion.
    for investigation_type, template in planner._TEMPLATES.items():
        for capability_id, _description, requirement in template:
            capability = CAPABILITY_REGISTRY.get(capability_id)
            if capability and capability.kind == "ui_action":
                assert requirement == "optional", f"{investigation_type}: '{capability_id}' es ui_action pero 'required'"


# ── 7. Quick Actions: misma convergencia que C1 confirmo para texto/voz ──

def test_a_real_quick_action_phrase_from_the_ui_resolves_to_the_expected_command():
    # Frase literal de AgentWorkspace.tsx::QUICK_COMMANDS - si ese texto
    # cambia sin actualizar este test, es una senal real de drift entre lo
    # que el boton promete y lo que el Command Router realmente entiende.
    command = classify("Investiga por qué bajó producción", has_active_investigation=False)
    assert command.type == AgentCommandType.START_INVESTIGATION
    assert command.investigation_type == InvestigationType.PRODUCTION_DROP


def test_quick_action_does_not_implement_a_parallel_classification_path():
    # Quick Actions se envian como 'user.text' (AgentWorkspace.tsx::
    # sendCommand), el MISMO evento que el texto escrito - no existe un
    # AgentCommandType propio para "quick action", confirmando que no hay
    # una segunda logica de clasificacion paralela para ellas.
    assert not any(name.startswith("QUICK") for name in AgentCommandType.__members__)
