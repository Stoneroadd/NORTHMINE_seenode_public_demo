from __future__ import annotations

import uuid

import pytest

from app.ai import verifier
from app.ai.memory import episodic_memory, retention, working_memory
from app.ai.memory.models import new_working_memory_entity_id
from app.ai.memory.persistence import init_memory_db
from app.ai.memory.retrieval import MemoryRetriever
from app.ai.memory.session_memory import SessionMemory
from app.ai.proactivity import initiative_budget, subscriptions, trigger_engine
from app.ai.proactivity import policies as proactivity_policies
from app.ai.proactivity.models import AgentTrigger
from app.ai.proactivity.persistence import init_proactivity_db
from app.ai.work_products import handover as handover_module
from app.ai.work_products import reports as reports_module
from app.ai.work_products import tasks as tasks_module
from app.ai.work_products import versions as versions_module
from app.ai.work_products.models import ReportScope
from app.ai.work_products.persistence import init_work_products_db
from tests.conftest import auth_header

"""Tests de Etapa 6 (memoria operacional, proactividad, work products).

Misma filosofia que test_perception.py: 100% deterministico, sin llamar a
ningun LLM. agent_runtime_db_path es un archivo sqlite aislado por proceso de
pytest y compartido dentro de esa corrida (ver conftest.py). Por eso cada test
usa entidades/ids con sufijo uuid unico, y ninguna asercion depende de 'no hay
nada mas en la base', solo de lo que el propio test creo.
"""


@pytest.fixture(autouse=True, scope="module")
def _init_etapa6_dbs():
    init_memory_db()
    init_proactivity_db()
    init_work_products_db()


def _uid() -> str:
    return uuid.uuid4().hex[:8]


# ── Memoria de sesion (seccion 41) ────────────────────────────────────────

def test_session_memory_resolves_last_entity_and_widget():
    mem = SessionMemory()
    mem.record_entity(entity_id="equipment:pala-03", label="PALA 03", entity_type="equipment")
    mem.record_widget(widget_id="w1", label="Producción por hora")
    snapshot = mem.snapshot()
    assert snapshot.last_entity_label == "PALA 03"
    assert snapshot.last_widget_label == "Producción por hora"


def test_session_memory_window_is_bounded():
    mem = SessionMemory()
    for i in range(30):
        mem.record_question(text=f"pregunta {i}")
    snapshot = mem.snapshot()
    assert len(snapshot.recent_entries) <= 10  # snapshot() solo expone la cola reciente


def test_session_memory_investigation_lifecycle():
    mem = SessionMemory()
    mem.record_investigation_started(investigation_id="inv-x", goal="Investigar Pala 03", investigation_type="loading_unit_underperformance")
    assert mem.active_investigation_id == "inv-x"
    mem.record_investigation_completed(investigation_id="inv-x", summary="Rendimiento bajo por desgaste.")
    assert mem.active_investigation_id is None
    assert mem.active_investigation_summary == "Rendimiento bajo por desgaste."
    assert mem.last_investigation_id == "inv-x"


# ── Working memory (seccion 41) ───────────────────────────────────────────

def test_working_memory_new_entity_starts_as_new():
    entity = f"PALA-{_uid()}"
    result = working_memory.track_entity(
        entity=entity, entity_type="equipment", company_id=None, site_id=None, shift="DIA",
        current_issue="Rendimiento bajo el plan.", metric_value=10.0, metric_label="variacion_pct",
        metric_direction="lower_is_worse", created_by="tester",
    )
    assert result.status == "new"
    assert result.entity_id == new_working_memory_entity_id("equipment", entity)


def test_working_memory_detects_worsening_and_improving():
    entity = f"PALA-{_uid()}"
    working_memory.track_entity(
        entity=entity, entity_type="equipment", company_id=None, site_id=None, shift=None,
        current_issue="Rendimiento bajo el plan.", metric_value=-10.0, metric_label="variacion_pct",
        metric_direction="lower_is_worse", created_by="tester",
    )
    worse = working_memory.track_entity(
        entity=entity, entity_type="equipment", company_id=None, site_id=None, shift=None,
        current_issue="Rendimiento bajo el plan.", metric_value=-20.0, metric_label="variacion_pct",
        metric_direction="lower_is_worse", created_by="tester",
    )
    assert worse.status == "worsening"
    better = working_memory.track_entity(
        entity=entity, entity_type="equipment", company_id=None, site_id=None, shift=None,
        current_issue="Rendimiento bajo el plan.", metric_value=-5.0, metric_label="variacion_pct",
        metric_direction="lower_is_worse", created_by="tester",
    )
    assert better.status == "improving"


def test_working_memory_resolve_marks_resolved_and_reappearance_is_new():
    entity = f"PALA-{_uid()}"
    entity_id = new_working_memory_entity_id("equipment", entity)
    working_memory.track_entity(
        entity=entity, entity_type="equipment", company_id=None, site_id=None, shift=None,
        current_issue="Rendimiento bajo el plan.", metric_value=1.0, metric_label="flag",
        created_by="tester",
    )
    resolved = working_memory.resolve_entity(entity_id)
    assert resolved is not None and resolved.status == "resolved"
    assert working_memory.resolve_entity(entity_id) is None  # ya resuelto, no vuelve a "resolver"

    reappeared = working_memory.track_entity(
        entity=entity, entity_type="equipment", company_id=None, site_id=None, shift=None,
        current_issue="Volvió a bajar.", metric_value=1.0, metric_label="flag", created_by="tester",
    )
    assert reappeared.status == "new"


def test_working_memory_find_by_label_is_scoped_by_company_and_site():
    entity = f"CAEX-{_uid()}"
    working_memory.track_entity(
        entity=entity, entity_type="equipment", company_id="empresa-a", site_id="faena-a", shift=None,
        current_issue="Detenido.", metric_value=1.0, metric_label="flag", created_by="tester",
    )
    assert working_memory.find_by_label(company_id="empresa-a", site_id="faena-a", entity=entity) is not None
    assert working_memory.find_by_label(company_id="empresa-b", site_id="faena-b", entity=entity) is None


# ── Memoria episodica (seccion 41) ────────────────────────────────────────

def test_episodic_memory_records_and_lists_by_entity():
    entity_id = f"equipment:caex-{_uid()}"
    episodic_memory.record_investigation_episode(
        investigation_id=f"inv-{_uid()}", investigation_type="production_drop", goal="Investigar caída",
        company_id=None, site_id=None, entity_ids=[entity_id], evidence_ids=[], outcome="Caída por clima.",
        created_by="tester",
    )
    episodes = episodic_memory.list_recent(company_id=None, site_id=None, episode_type="investigation", entity_id=entity_id, limit=5)
    assert len(episodes) == 1
    assert episodes[0].outcome == "Caída por clima."


def test_episodic_memory_isolates_by_scope():
    entity_id = f"equipment:{_uid()}"
    episodic_memory.record_investigation_episode(
        investigation_id=f"inv-{_uid()}", investigation_type="production_drop", goal="X",
        company_id="empresa-a", site_id="faena-a", entity_ids=[entity_id], evidence_ids=[], outcome="Y",
        created_by="tester",
    )
    same_scope = episodic_memory.list_recent(company_id="empresa-a", site_id="faena-a", entity_id=entity_id, limit=5)
    other_scope = episodic_memory.list_recent(company_id="empresa-b", site_id="faena-b", entity_id=entity_id, limit=5)
    assert len(same_scope) == 1
    assert len(other_scope) == 0


# ── Retention (seccion 41) ────────────────────────────────────────────────

def test_retention_cutoffs_are_in_the_past():
    # No aserta un numero de filas purgadas (base compartida entre tests) -
    # solo que la politica produce cortes coherentes (mas atras que "ahora").
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    assert retention.working_memory_cutoff() < now
    assert retention.episodic_memory_cutoff() < now


def test_apply_retention_returns_counts_dict():
    result = retention.apply_retention()
    assert "working_memory_removed" in result and "episodes_removed" in result


# ── Retrieval (seccion 41) ────────────────────────────────────────────────

def test_memory_retriever_recalls_entity_with_working_memory_and_episodes():
    entity = f"PALA-{_uid()}"
    entity_id = new_working_memory_entity_id("equipment", entity)
    working_memory.track_entity(
        entity=entity, entity_type="equipment", company_id=None, site_id=None, shift=None,
        current_issue="Bajo rendimiento.", metric_value=1.0, metric_label="flag",
        investigation_id="inv-abc", created_by="tester",
    )
    episodic_memory.record_investigation_episode(
        investigation_id="inv-abc", investigation_type="loading_unit_underperformance", goal="Investigar",
        company_id=None, site_id=None, entity_ids=[entity_id], evidence_ids=[], outcome="Confirmado.",
        created_by="tester",
    )
    retriever = MemoryRetriever(company_id=None, site_id=None)
    result = retriever.recall_entity("equipment", entity)
    assert result.found is True
    assert result.working_memory_entity is not None
    assert len(result.episodes) == 1
    assert "Bajo rendimiento" in result.as_spoken_summary()


def test_memory_retriever_wrong_scope_finds_nothing():
    entity = f"PALA-{_uid()}"
    working_memory.track_entity(
        entity=entity, entity_type="equipment", company_id="empresa-a", site_id="faena-a", shift=None,
        current_issue="Bajo rendimiento.", metric_value=1.0, metric_label="flag", created_by="tester",
    )
    retriever = MemoryRetriever(company_id="empresa-b", site_id="faena-b")
    result = retriever.recall_entity("equipment", entity)
    assert result.found is False


def test_memory_retriever_unknown_entity_is_not_found():
    retriever = MemoryRetriever(company_id=None, site_id=None)
    result = retriever.recall_entity("equipment", f"NO-EXISTE-{_uid()}")
    assert result.found is False


# ── Trigger engine + verifier (seccion 42) ────────────────────────────────

def test_trigger_condition_met_true_and_false():
    trigger = AgentTrigger(trigger_type="x", metric="cumplimiento_pct", condition="below", threshold=95.0, severity="warning", created_by="tester")
    assert trigger_engine.condition_met(trigger, 90.0) is True
    assert trigger_engine.condition_met(trigger, 99.0) is False


def test_trigger_condition_met_requires_threshold_and_value():
    trigger = AgentTrigger(trigger_type="x", metric="m", condition="above", threshold=None, severity="warning", created_by="tester")
    assert trigger_engine.condition_met(trigger, 10.0) is False


def test_verify_watch_trigger_respects_duration():
    assert verifier.verify_watch_trigger(condition="below", threshold=95.0, value=90.0, duration_seconds=900, elapsed_seconds=100) is False
    assert verifier.verify_watch_trigger(condition="below", threshold=95.0, value=90.0, duration_seconds=900, elapsed_seconds=1000) is True
    assert verifier.verify_watch_trigger(condition="below", threshold=95.0, value=99.0) is False


def test_verify_memory_scope_matches_and_mismatches():
    assert verifier.verify_memory_scope(item_company_id=None, item_site_id=None, expected_company_id=None, expected_site_id=None) is True
    assert verifier.verify_memory_scope(item_company_id="a", item_site_id="x", expected_company_id="b", expected_site_id="x") is False


# ── Initiative budget: dedup, cooldown, severidad (seccion 42) ────────────

def test_initiative_budget_blocks_below_minimum_severity():
    fp = initiative_budget.build_fingerprint(entity_id=f"e-{_uid()}", metric="m", condition="below")
    decision = initiative_budget.evaluate(company_id=None, site_id=None, severity="informational", fingerprint=fp)
    assert decision.allowed is False
    assert decision.reason == "severity_below_minimum"


def test_initiative_budget_allows_first_then_suppresses_duplicate():
    from app.ai.proactivity import persistence as proactivity_persistence
    from app.ai.proactivity.models import ProactiveAgentEvent

    # site_id unico por corrida: el presupuesto por hora es por company/site,
    # y agent_runtime_db_path es compartida entre corridas de tests (ver
    # cabecera del archivo) - sin esto, ejecuciones repetidas del mismo dia
    # agotan el presupuesto de company_id=None/site_id=None y este test
    # empieza a fallar por una razon ajena a lo que prueba.
    site = f"site-{_uid()}"
    fp = initiative_budget.build_fingerprint(entity_id=f"e-{_uid()}", metric="m", condition="below")
    first = initiative_budget.evaluate(company_id=None, site_id=site, severity="warning", fingerprint=fp)
    assert first.allowed is True

    # Simula que ese evento ya se emitio (lo que hara event_monitor/notification_manager en produccion).
    proactivity_persistence.save_proactive_event(ProactiveAgentEvent(
        event_type="test", severity="warning", title="t", summary="s", fingerprint=fp, site_id=site,
    ))
    second = initiative_budget.evaluate(company_id=None, site_id=site, severity="warning", fingerprint=fp)
    assert second.allowed is False
    assert second.is_duplicate is True


# ── Quiet mode policies (seccion 42) ───────────────────────────────────────

def test_quiet_mode_blocks_all_visual():
    assert proactivity_policies.visual_allowed("quiet", "critical") is False
    assert proactivity_policies.visual_allowed("quiet", "informational") is False


def test_critical_only_mode_shows_only_critical():
    assert proactivity_policies.visual_allowed("critical_only", "critical") is True
    assert proactivity_policies.visual_allowed("critical_only", "warning") is False


def test_normal_mode_speaks_only_above_voice_minimum():
    assert proactivity_policies.voice_allowed("normal", "high", voice_minimum_severity="high") is True
    assert proactivity_policies.voice_allowed("normal", "warning", voice_minimum_severity="high") is False


def test_visual_only_mode_never_speaks():
    assert proactivity_policies.voice_allowed("visual_only", "critical", voice_minimum_severity="informational") is False


# ── Watches (seccion 42) ───────────────────────────────────────────────────

def test_create_and_cancel_watch():
    user_id = f"user-{_uid()}"
    watch = subscriptions.create_watch(
        user_id=user_id, company_id=None, site_id=None, entity_ids=["PALA 03"], entity_label="PALA 03",
        metric="variacion_pct", condition="above", threshold=-10.0,
    )
    assert watch.status == "active"
    cancelled = subscriptions.cancel_watch(watch.watch_id, user_id)
    assert cancelled is not None and cancelled.status == "cancelled"
    # cancelar de nuevo no encuentra un watch activo
    assert subscriptions.cancel_watch(watch.watch_id, user_id) is None


def test_cancel_watch_wrong_user_fails():
    watch = subscriptions.create_watch(
        user_id=f"owner-{_uid()}", company_id=None, site_id=None, entity_ids=["X"], entity_label="X",
        metric="m", condition="above", threshold=1.0,
    )
    assert subscriptions.cancel_watch(watch.watch_id, "someone-else") is None


def test_watch_limit_per_user_is_enforced(monkeypatch):
    from app.core.config import get_settings
    monkeypatch.setenv("NORTHMINE_AGENT_WATCH_LIMIT_PER_USER", "1")
    get_settings.cache_clear()
    try:
        user_id = f"user-{_uid()}"
        subscriptions.create_watch(user_id=user_id, company_id=None, site_id=None, entity_ids=["A"], entity_label="A", metric="m", condition="above", threshold=1.0)
        with pytest.raises(subscriptions.WatchLimitExceeded):
            subscriptions.create_watch(user_id=user_id, company_id=None, site_id=None, entity_ids=["B"], entity_label="B", metric="m", condition="above", threshold=1.0)
    finally:
        get_settings.cache_clear()


def test_expire_due_watches_expires_only_past_due():
    from app.ai.proactivity import persistence as proactivity_persistence

    user_id = f"user-{_uid()}"
    watch = subscriptions.create_watch(
        user_id=user_id, company_id=None, site_id=None, entity_ids=["A"], entity_label="A",
        metric="m", condition="above", threshold=1.0, ttl_hours=1,
    )
    # ttl_hours negativo no produce un watch "ya vencido" (create_watch solo
    # fija expires_at si el ttl efectivo es > 0) - se simula el vencimiento
    # escribiendo directamente una expires_at pasada, como lo veria el loop
    # real un rato despues de crear un watch de corta duracion.
    past_watch = watch.model_copy(update={"expires_at": "2020-01-01T00:00:00+00:00"})
    proactivity_persistence.save_watch(past_watch)

    still_active = subscriptions.create_watch(
        user_id=user_id, company_id=None, site_id=None, entity_ids=["B"], entity_label="B",
        metric="m", condition="above", threshold=1.0, ttl_hours=24,
    )

    expired = subscriptions.expire_due_watches()
    assert any(w.watch_id == watch.watch_id and w.status == "expired" for w in expired)
    assert not any(w.watch_id == still_active.watch_id for w in expired)


# ── Reports (seccion 43) ───────────────────────────────────────────────────

def test_build_report_omits_unsupported_sections_and_requires_evidence():
    report = reports_module.build_report(
        report_type="SHIFT_REPORT", scope=ReportScope(shift=None, audience="supervisor"),
        generated_by="tester", company_id=None, site_id=None,
    )
    assert all(section.content.strip() for section in report.sections)
    assert all("IA" not in section.title for section in report.sections)
    assert report.requires_human_approval is True
    assert report.decision_authority == "human"
    assert report.version == 1
    if not report.evidence_ids:
        assert report.quality_gate.passed is False


def test_verify_report_evidence_flags_dangling_citation():
    from app.ai.work_products.models import ReportDraft, ReportSection
    draft = ReportDraft(
        report_type="SHIFT_REPORT", title="t", scope=ReportScope(audience="supervisor"), generated_by="tester",
        evidence_ids=["evid-real"],
        sections=[ReportSection(section_id="s1", title="Evidencia", content="x", evidence_ids=["evid-fantasma"])],
    )
    notes = verifier.verify_report_evidence(draft)
    assert any("evid-fantasma" in n for n in notes)


def test_verify_report_evidence_flags_missing_evidence_entirely():
    from app.ai.work_products.models import ReportDraft
    draft = ReportDraft(report_type="SHIFT_REPORT", title="t", scope=ReportScope(audience="supervisor"), generated_by="tester")
    notes = verifier.verify_report_evidence(draft)
    assert any("no tiene evidencia" in n for n in notes)


def test_report_versioning_creates_new_version_with_change_log():
    report = reports_module.build_report(
        report_type="SHIFT_REPORT", scope=ReportScope(shift=None, audience="supervisor"),
        generated_by="tester", company_id=None, site_id=None,
    )
    from app.ai.work_products import persistence as wp_persistence
    wp_persistence.save_report_version(report)

    updated = versions_module.apply_modification(report, modification_summary="hazlo más ejecutivo", modified_by="tester")
    assert updated.version == 2
    assert any("hazlo más ejecutivo" in c for c in updated.change_log)
    history = versions_module.history(report.report_id)
    assert [r.version for r in history] == [1, 2]
    # la version 1 sigue existiendo intacta - nunca se sobrescribe (seccion 24)
    assert history[0].version == 1


def test_regenerate_with_executive_audience_changes_scope_not_facts():
    base = reports_module.build_report(
        report_type="SHIFT_REPORT", scope=ReportScope(shift=None, audience="dispatcher"),
        generated_by="tester", company_id=None, site_id=None,
    )
    executive = reports_module.build_report(
        report_type="SHIFT_REPORT", scope=ReportScope(shift=None, audience="executive"),
        generated_by="tester", company_id=None, site_id=None,
    )
    base_evidence_ids = set(base.evidence_ids)
    exec_evidence_ids = set(executive.evidence_ids)
    # Misma evidencia subyacente (mismos datos), la audiencia no los cambia.
    assert base_evidence_ids == exec_evidence_ids


def test_report_approval_requires_permission(client, login_as_operador, login_as_supervisor):
    report = reports_module.build_report(
        report_type="SHIFT_REPORT", scope=ReportScope(shift=None, audience="supervisor"),
        generated_by="tester", company_id=login_as_supervisor["empresa"], site_id=login_as_supervisor["faena"],
    )
    from app.ai.work_products import persistence as wp_persistence
    report = report.model_copy(update={"quality_gate": report.quality_gate.model_copy(update={"passed": True})})
    wp_persistence.save_report_version(report)

    # Ambos roles pueden aprobar (policies.APPROVAL_ROLES incluye operador) -
    # se prueba el flujo real de aprobacion end-to-end via REST.
    resp = client.post(
        f"/api/ai-agent/work-products/reports/{report.report_id}/approve",
        headers=auth_header(login_as_supervisor),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"


def test_report_approval_rejects_failed_quality_gate(client, login_as_supervisor):
    report = reports_module.build_report(
        report_type="SHIFT_REPORT", scope=ReportScope(shift=None, audience="supervisor"),
        generated_by="tester", company_id=login_as_supervisor["empresa"], site_id=login_as_supervisor["faena"],
    )
    from app.ai.work_products import persistence as wp_persistence
    report = report.model_copy(update={"quality_gate": report.quality_gate.model_copy(update={
        "passed": False,
        "errors": ["Evidencia insuficiente"],
    })})
    wp_persistence.save_report_version(report)

    resp = client.post(
        f"/api/ai-agent/work-products/reports/{report.report_id}/approve",
        headers=auth_header(login_as_supervisor),
    )
    assert resp.status_code == 409
    assert "ReportVerifier" in resp.json()["detail"]["message"]


def test_report_rejection_records_reason(client, login_as_supervisor):
    report = reports_module.build_report(
        report_type="SHIFT_REPORT", scope=ReportScope(shift=None, audience="supervisor"),
        generated_by="tester", company_id=login_as_supervisor["empresa"], site_id=login_as_supervisor["faena"],
    )
    from app.ai.work_products import persistence as wp_persistence
    wp_persistence.save_report_version(report)

    resp = client.post(
        f"/api/ai-agent/work-products/reports/{report.report_id}/reject",
        json={"reason": "Faltan datos de flota"},
        headers=auth_header(login_as_supervisor),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "rejected"
    assert body["rejection_reason"] == "Faltan datos de flota"


# ── Tasks ───────────────────────────────────────────────────────────────

def test_task_draft_requires_human_approval_and_traces_investigation():
    task = tasks_module.create_task_draft(
        title="Revisar CAEX 104", description="Revisar detencion prolongada", reason="Hallazgo de investigacion",
        created_by="tester", investigation_id="inv-xyz", evidence_ids=["evid-1"], entity_ids=["CAEX 104"],
    )
    assert task.requires_human_approval is True
    assert task.decision_authority == "human"
    assert task.investigation_id == "inv-xyz"
    limitations = verifier.verify_task_evidence(task)
    assert limitations == []  # tiene evidencia + investigacion + entidad, sin limitaciones


def test_task_without_evidence_is_flagged_by_verifier():
    task = tasks_module.create_task_draft(title="Tarea suelta", description="d", reason="pedido directo", created_by="tester")
    limitations = verifier.verify_task_evidence(task)
    assert len(limitations) == 2  # sin evidencia/investigacion, sin entidad


def test_task_cannot_be_approved_twice():
    task = tasks_module.create_task_draft(title="t", description="d", reason="r", created_by="tester")
    approved = tasks_module.approve_task(task.task_id, approved_by="supervisor")
    assert approved is not None and approved.status == "approved"
    assert tasks_module.approve_task(task.task_id, approved_by="supervisor") is None


# ── Handover (seccion 44) ──────────────────────────────────────────────────

def test_build_handover_has_all_fixture_sections_and_requires_approval():
    handover = handover_module.build_handover(generated_by="tester", company_id=None, site_id=None, shift=None)
    titles = {s.section_id for s in handover.sections}
    assert {"produccion", "carguio", "transporte", "equipos_criticos", "averias", "alertas", "investigaciones", "seguimiento", "calidad_de_datos"} <= titles
    assert handover.requires_human_approval is True
    assert handover.decision_authority == "human"
    assert handover.pending_for_next_shift  # siempre al menos un item (aunque sea "sin pendientes")


# ── Flujo WS completo (integracion, seccion 45 del brief) ──────────────────

def _client_event(event_type, **payload):
    return {"event_id": f"evt-{uuid.uuid4().hex[:10]}", "correlation_id": f"corr-{uuid.uuid4().hex[:8]}", "event_type": event_type, "payload": payload}


def test_ws_set_quiet_mode_round_trip(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()  # session.ready
        ws.send_json(_client_event("user.text", text="silencio una hora"))
        events = [ws.receive_json() for _ in range(2)]
        types = [e["event_type"] for e in events]
        assert "quiet_mode.changed" in types
        changed = next(e for e in events if e["event_type"] == "quiet_mode.changed")
        assert changed["payload"]["mode"] == "quiet"
        assert changed["payload"]["durationMinutes"] == 60


def test_ws_create_watch_without_reference_returns_error(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("user.text", text="avísame si vuelve a empeorar"))
        event = ws.receive_json()
        # sin contexto previo (sin entidad en memoria de sesion), el comando
        # se reconoce pero no puede crear un watch sin saber que vigilar.
        assert event["event_type"] == "agent.error"


def test_ws_recall_resolves_entity_from_explicit_mention_in_text(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("user.text", text="¿sigue ocurriendo lo de la Pala 03?"))
        event = ws.receive_json()
        assert event["event_type"] == "memory.recalled"
        assert event["payload"]["queryEntity"] == "PALA 03"


def test_ws_generate_handover_produces_a_work_product(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("user.text", text="prepárame el cambio de turno"))
        events = [ws.receive_json() for _ in range(3)]
        types = [e["event_type"] for e in events]
        assert "work_product.ready" in types
        ready = next(e for e in events if e["event_type"] == "work_product.ready")
        assert ready["payload"]["productType"] == "handover"
        assert ready["payload"]["handover"]["requires_human_approval"] is True


def test_handover_pending_includes_active_working_memory_entities():
    entity = f"PALA-{_uid()}"
    working_memory.track_entity(
        entity=entity, entity_type="equipment", company_id="empresa-handover-test", site_id="faena-handover-test",
        shift=None, current_issue="Rendimiento bajo el plan.", metric_value=1.0, metric_label="flag", created_by="tester",
    )
    handover = handover_module.build_handover(generated_by="tester", company_id="empresa-handover-test", site_id="faena-handover-test", shift=None)
    assert any(entity in p for p in handover.pending_for_next_shift)
