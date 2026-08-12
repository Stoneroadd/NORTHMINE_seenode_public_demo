from app.ai.investigation_schemas import InvestigationType
from app.ai.runtime.command_router import AgentCommandType, StructuredAgentIntent, command_from_intent
from app.ai.runtime.runtime import _guidance_for_capability


def test_quick_action_maps_directly_to_runtime_command():
    command = command_from_intent(StructuredAgentIntent(
        intent="INVESTIGATE_PRODUCTION_DROP", scope="current_context", source="quick_action",
    ))
    assert command.type == AgentCommandType.START_INVESTIGATION
    assert command.investigation_type == InvestigationType.PRODUCTION_DROP
    assert command.source == "quick_action"


def test_command_palette_navigation_preserves_semantic_target():
    command = command_from_intent(StructuredAgentIntent(
        intent="NAVIGATE_MODULE", module_id="produccion", source="command_palette",
    ))
    assert command.type == AgentCommandType.NAVIGATE
    assert command.target_module == "produccion"


def test_runtime_selects_guidance_intent_not_css():
    assert _guidance_for_capability("navigate_production") == {"effect": "sweep", "durationMs": 800}
    assert _guidance_for_capability("focus_production_chart") == {"effect": "spotlight", "durationMs": 1100}
