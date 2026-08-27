from __future__ import annotations

import os
from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.services.data_provider import get_dataset

from .kpis import build_current_shift_command_center, build_operational_alerts, build_summary
from .economics_service import build_delay_breakdown, build_economics
from .equipment_service import current_shift_records
from .forecast_service import build_forecast_summary
from .averias_service import get_active_breakdowns, get_breakdown_history


def _fmt_tons(value: float | int) -> str:
    return f"{int(round(value)):,.0f} t".replace(",", ".")


def _fmt_pct(value: float | int) -> str:
    return f"{float(value):.1f}%"


def _fmt_usd(value: float | int) -> str:
    return f"USD {float(value):,.0f}".replace(",", ".")


def _fmt_hours(minutes: float | int | None) -> str:
    if minutes is None:
        return "Sin dato"
    return f"{float(minutes) / 60:.1f} h"


def _section(title: str, styles: dict[str, ParagraphStyle]) -> list[Any]:
    return [
        Spacer(1, 0.07 * inch),
        Paragraph(title, styles["section"]),
        Spacer(1, 0.025 * inch),
    ]


def _table(rows: list[list[Any]], widths: list[float] | None = None) -> Table:
    base = getSampleStyleSheet()
    header_style = ParagraphStyle("table-header", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=8.1, leading=9.6, alignment=TA_CENTER, textColor=colors.white)
    cell_style = ParagraphStyle("table-cell", parent=base["Normal"], fontSize=8.0, leading=9.5, alignment=TA_CENTER, textColor=colors.HexColor("#17212B"))
    prepared_rows = [
        [cell if isinstance(cell, Paragraph) else Paragraph(str(cell), header_style if row_index == 0 else cell_style) for cell in row]
        for row_index, row in enumerate(rows)
    ]
    table = Table(prepared_rows, colWidths=widths, repeatRows=1 if rows else 0)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#102A43")),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F3F6F8")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def build_shift_pdf(fecha: str | None = None, turno: str | None = None, username: str = "admin") -> bytes:
    dataset = get_dataset(fecha)
    current = build_current_shift_command_center(dataset, turno, fecha=fecha)
    alerts = build_operational_alerts(dataset)
    summary = build_summary(dataset)
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=30,
        bottomMargin=30,
        title="NORTHMINE Reporte Operacional de Turno",
    )
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle("nm-title", parent=base["Title"], fontName="Helvetica-Bold", fontSize=18, textColor=colors.HexColor("#0C1220")),
        "subtitle": ParagraphStyle("nm-subtitle", parent=base["Normal"], fontSize=9, leading=12, textColor=colors.HexColor("#334155")),
        "section": ParagraphStyle("nm-section", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=11, textColor=colors.HexColor("#006B4A"), spaceAfter=4),
        "normal": ParagraphStyle("nm-normal", parent=base["Normal"], fontSize=8.5, leading=11),
        "footer": ParagraphStyle("nm-footer", parent=base["Normal"], alignment=1, fontSize=8, textColor=colors.HexColor("#64748B")),
    }

    compliance = current["cumplimiento_pct"]
    state = "CUMPLIDO" if compliance >= 95 else "EN RIESGO" if compliance >= 80 else "DEFICIT"
    destinos_total = sum(item["tonelaje"] for item in summary["destinations"])
    loader_rows = current["loading_units"]

    story: list[Any] = [
        Paragraph("NORTHMINE Intelligence", styles["title"]),
        Paragraph("Reporte Operacional de Turno", styles["subtitle"]),
        Paragraph(
            f"Faena: MINA CHILE DEMO - Empresa: NORTHMINE DEMO<br/>"
            f"Turno: {turno or current['turno']} - Fecha: {fecha or current['fecha']} - "
            f"{current['started_at'][11:16]} a {current['ends_at'][11:16]}<br/>"
            f"Generado automaticamente - Usuario: {username}",
            styles["subtitle"],
        ),
    ]

    story += _section("1. RESUMEN EJECUTIVO", styles)
    story.append(
        _table(
            [
                ["Indicador", "Valor"],
                ["Tonelaje", _fmt_tons(current["toneladas_turno"])],
                ["Meta turno", _fmt_tons(current["meta_turno"])],
                ["Cumplimiento", f"{_fmt_pct(compliance)} - {state}"],
                ["Ciclos", f"{current['ciclos']:,}".replace(",", ".")],
                ["CAEX activos", str(current["caex_activos"])],
                ["Prom/ciclo", _fmt_tons(current["promedio_ton_ciclo"])],
            ],
            [2.5 * inch, 3.7 * inch],
        )
    )

    story += _section("2. PRODUCCION POR HORA", styles)
    story.append(
        _table(
            [["Hora", "Tonelaje", "Ciclos", "T/Ciclo", "Acum."]]
            + [
                [
                    item["label"],
                    _fmt_tons(item["toneladas"]),
                    str(item["ciclos"]),
                    _fmt_tons(item["promedio_ton_ciclo"]),
                    _fmt_tons(item["acumulado"]),
                ]
                for item in current["hourly"]
            ],
            [0.85 * inch, 1.35 * inch, 0.8 * inch, 1.1 * inch, 1.35 * inch],
        )
    )

    story += _section("3. ESTADO DE EQUIPOS", styles)
    story.append(
        _table(
            [
                ["Estado", "Cantidad"],
                ["CAEX operativos", str(current["caex_activos"])],
                ["Sin actividad", str(current["caex_sin_actividad"])],
                ["Posible averia", str(current["caex_posible_averia"])],
                ["Palas activas", f"{sum(1 for item in loader_rows if item['estado'] == 'OPERATIVO')}/5"],
            ],
            [2.5 * inch, 3.7 * inch],
        )
    )

    story += _section("4. RENDIMIENTO POR PALA", styles)
    story.append(
        _table(
            [["Pala", "Tonelaje", "Ciclos", "T/Hora", "Fase"]]
            + [
                [
                    item["carguio_id"],
                    _fmt_tons(item["toneladas"]),
                    str(item["ciclos"]),
                    _fmt_tons(item["rendimiento_tph"]),
                    "F02" if item["carguio_id"] == "CF3449" else "F01",
                ]
                for item in loader_rows
            ],
            [0.9 * inch, 1.3 * inch, 0.8 * inch, 1.1 * inch, 0.8 * inch],
        )
    )

    story += _section("5. DISTRIBUCION POR DESTINO", styles)
    story.append(
        _table(
            [["Destino", "Tonelaje", "Participacion"]]
            + [
                [
                    item["destino"],
                    _fmt_tons(item["tonelaje"]),
                    _fmt_pct(item["tonelaje"] / max(destinos_total, 1) * 100),
                ]
                for item in summary["destinations"][:6]
            ],
            [2.7 * inch, 1.5 * inch, 1.2 * inch],
        )
    )

    story += _section("6. PROYECCION", styles)
    projection = current["projection"]
    story.append(
        _table(
            [
                ["Indicador", "Valor"],
                ["Produccion actual", _fmt_tons(projection["produccion_actual"])],
                ["Proyeccion final", _fmt_tons(projection["proyeccion_final"])],
                ["Meta turno", _fmt_tons(projection["meta_turno"])],
                ["Estado", f"{projection['status']} ({_fmt_tons(projection['diferencia_proyectada'])})"],
            ],
            [2.5 * inch, 3.7 * inch],
        )
    )

    story += _section("7. ALERTAS ACTIVAS", styles)
    story.append(
        _table(
            [["Severidad", "Alerta", "Recomendacion"]]
            + [
                [item["severidad"], item["titulo"], item.get("recomendacion", "Monitorear condicion operacional.")]
                for item in alerts["items"][:7]
            ],
            [0.95 * inch, 2.5 * inch, 2.5 * inch],
        )
    )
    story += [Spacer(1, 0.16 * inch), Paragraph("NORTHMINE Intelligence v2.0 - Reporte generado automaticamente", styles["footer"])]

    doc.build(story)
    return buffer.getvalue()


def build_cockpit_executive_pdf(fecha: str | None = None, turno: str | None = None, username: str = "admin") -> bytes:
    """Resumen ejecutivo para gerencia: una lectura corta, accionable y economica."""
    dataset = get_dataset(fecha)
    current = build_current_shift_command_center(dataset, turno, fecha=fecha)
    alerts = build_operational_alerts(dataset)
    forecast = build_forecast_summary(current)
    records = current_shift_records(dataset, current["fecha"], current["turno"])
    delays = build_delay_breakdown(records, current)
    economics, warnings = build_economics(forecast["actual"], forecast["forecast"], forecast["target"], delays)
    elapsed_hours = max(float(current.get("elapsed_minutes") or 0) / 60, 0.25)
    cost_per_hour = float(economics["total_cost_usd"]) / elapsed_hours
    loaders = sorted(current.get("loading_units") or [], key=lambda row: float(row.get("toneladas") or 0), reverse=True)
    fleet_tph = sum(float(row.get("rendimiento_tph") or 0) for row in loaders) / max(len(loaders), 1)
    low_loader = min(loaders, key=lambda row: float(row.get("rendimiento_tph") or 0), default=None)
    top_alerts = (alerts.get("items") or [])[:4]
    active_events = get_active_breakdowns(dataset).get("items") or []
    history_events = get_breakdown_history(dataset, dias=1).get("items") or []

    # El historial de transiciones es la fuente preferida para horas de
    # mantencion. Si aun no existe, se muestra el tiempo actual en estado como
    # fotografia operacional y no como una duracion historica inventada.
    downtime_by_equipment: dict[str, dict[str, Any]] = {}
    for event in history_events:
        equipment_id = str(event.get("equipment_id") or "Sin dato")
        row = downtime_by_equipment.setdefault(
            equipment_id,
            {"maintenance_min": 0.0, "fault_min": 0.0, "events": 0, "description": ""},
        )
        minutes = max(0.0, float(event.get("duration_min") or 0))
        status = str(event.get("status") or "").upper()
        row["events"] += 1
        row["description"] = str(event.get("description") or row["description"])
        if status == "MANTENCION":
            row["maintenance_min"] += minutes
        else:
            row["fault_min"] += minutes
    if not history_events:
        for event in active_events:
            equipment_id = str(event.get("equipment_id") or "Sin dato")
            row = downtime_by_equipment.setdefault(
                equipment_id,
                {"maintenance_min": 0.0, "fault_min": 0.0, "events": 0, "description": ""},
            )
            minutes = max(0.0, float(event.get("duration_min") or 0))
            status = str(event.get("status") or "").upper()
            row["events"] += 1
            row["description"] = str(event.get("description") or row["description"])
            if status == "MANTENCION":
                row["maintenance_min"] += minutes
            else:
                row["fault_min"] += minutes

    status_rows: list[list[str]] = [["Equipo", "Tipo", "Estado", "Tonelaje", "Ciclos", "Tiempo sin ciclo"]]
    for item in sorted(current.get("caex_status") or [], key=lambda row: str(row.get("caex_id") or "")):
        status_rows.append([
            str(item.get("caex_id") or "Sin dato"),
            "CAEX",
            str(item.get("estado") or "SIN DATO"),
            _fmt_tons(float(item.get("toneladas") or 0)),
            str(int(item.get("ciclos") or 0)),
            _fmt_hours(item.get("minutos_sin_actividad")),
        ])
    for item in sorted(loaders, key=lambda row: str(row.get("carguio_id") or "")):
        status_rows.append([
            str(item.get("carguio_id") or "Sin dato"),
            "CARGUIO",
            str(item.get("estado") or "SIN DATO"),
            _fmt_tons(float(item.get("toneladas") or 0)),
            str(int(item.get("ciclos") or 0)),
            _fmt_hours(item.get("minutos_sin_actividad")),
        ])

    maintenance_rows = [["Equipo", "Mantencion", "Averia/demora", "Eventos", "Detalle"]]
    for equipment_id, item in sorted(
        downtime_by_equipment.items(),
        key=lambda pair: float(pair[1]["maintenance_min"]) + float(pair[1]["fault_min"]),
        reverse=True,
    ):
        maintenance_rows.append([
            equipment_id,
            _fmt_hours(item["maintenance_min"]),
            _fmt_hours(item["fault_min"]),
            str(item["events"]),
            str(item["description"] or "Evento de estado sin descripcion."),
        ])
    maintenance_source = (
        "Historial de transiciones WENCO del ultimo dia."
        if history_events
        else "Fotografia actual de estados WENCO; no hay historial de transiciones disponible para sumar horas cerradas."
    )
    if len(maintenance_rows) == 1:
        maintenance_rows.append(["Sin eventos", "0,0 h", "0,0 h", "0", "No se registran mantenciones ni averias en la fuente consultada."])

    try:
        value_per_tonne = float(os.getenv("NORTHMINE_VALUE_PER_TONNE_USD", "4.5") or 4.5)
    except ValueError:
        value_per_tonne = 4.5
    closing_tons = int(forecast["actual"] if float(current.get("elapsed_minutes") or 0) >= 690 else forecast["forecast"])
    estimated_revenue = round(closing_tons * value_per_tonne)
    estimated_margin = estimated_revenue - int(economics["total_cost_usd"])
    cost_is_controlled = float(economics["cost_per_tonne_usd"]) <= 3.07
    on_target = not forecast["meta_configured"] or closing_tons >= int(forecast["target"])
    healthy_close = estimated_margin > 0 and cost_is_controlled and on_target
    closing_label = "Final" if float(current.get("elapsed_minutes") or 0) >= 690 else "Proyectado"
    verdict = "FAVORABLE" if healthy_close else "NO FAVORABLE"
    verdict_detail = "TURNO PRODUCTIVO, RENTABLE Y DE COSTO CONTROLADO" if healthy_close else "TURNO CON RIESGO DE COSTO, PRODUCTIVIDAD O CIERRE"

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=34,
        leftMargin=34,
        topMargin=30,
        bottomMargin=30,
        title="NORTHMINE Informe Ejecutivo de Cockpit",
        author="NORTHMINE Intelligence",
    )
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle("executive-title", parent=base["Title"], fontName="Helvetica-Bold", fontSize=22, leading=26, textColor=colors.HexColor("#F4F7FA")),
        "subtitle": ParagraphStyle("executive-subtitle", parent=base["Normal"], fontSize=9, leading=12, textColor=colors.HexColor("#B9C5D1")),
        "section": ParagraphStyle("executive-section", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=12.5, leading=16, textColor=colors.HexColor("#006B4A"), spaceBefore=10, spaceAfter=6),
        "body": ParagraphStyle("executive-body", parent=base["Normal"], fontSize=9.5, leading=13, textColor=colors.HexColor("#263445")),
        "small": ParagraphStyle("executive-small", parent=base["Normal"], fontSize=8.2, leading=10.5, textColor=colors.HexColor("#64748B")),
        "card_label": ParagraphStyle("executive-card-label", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=8.3, leading=10, textColor=colors.HexColor("#64748B")),
        "card_value": ParagraphStyle("executive-card-value", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=16, leading=19, textColor=colors.HexColor("#64748B")),
        "summary_title": ParagraphStyle("executive-summary-title", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=15, leading=18, textColor=colors.HexColor("#075E46")),
    }

    def footer(canvas, document):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#D6DEE5"))
        canvas.line(document.leftMargin, 20, A4[0] - document.rightMargin, 20)
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(colors.HexColor("#64748B"))
        canvas.drawString(document.leftMargin, 11, "NORTHMINE Intelligence - Informe ejecutivo de Cockpit")
        canvas.drawRightString(A4[0] - document.rightMargin, 11, f"Pagina {document.page}")
        canvas.restoreState()

    header = Table([[Paragraph("NORTHMINE", styles["subtitle"]), ""], [Paragraph("INFORME EJECUTIVO - COCKPIT OPERACIONAL", styles["title"]), ""]], colWidths=[7.1 * inch, 0.1 * inch])
    header.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#07121E")),
        ("BOX", (0, 0), (-1, -1), 0, colors.white),
        ("LEFTPADDING", (0, 0), (-1, -1), 15),
        ("RIGHTPADDING", (0, 0), (-1, -1), 15),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))

    state = "EN RIESGO" if forecast["meta_configured"] and forecast["forecast"] < forecast["target"] else "EN RITMO"
    cards = [
        ("TONELADAS HECHAS", _fmt_tons(forecast["actual"])),
        ("META Y PROYECCION", f"{_fmt_tons(forecast['forecast'])} / {_fmt_tons(forecast['target'])}" if forecast["meta_configured"] else _fmt_tons(forecast["forecast"])),
        ("COSTO POR TONELADA", f"USD {economics['cost_per_tonne_usd']:.2f}/t"),
        ("RESULTADO DEL TURNO", verdict),
    ]
    card_cells = [
        Table(
            [[Paragraph(label, styles["card_label"])], [Paragraph(value, styles["card_value"])]],
            colWidths=[3.30 * inch],
            rowHeights=[14, 22],
            hAlign="LEFT",
        )
        for label, value in cards
    ]
    card_table = Table([card_cells[:2], card_cells[2:]], colWidths=[3.53 * inch] * 2, rowHeights=[58, 58])
    card_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F4F7F8")),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D6DEE5")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))

    gap = forecast["target"] - forecast["forecast"]
    close_text = (
        f"La proyeccion supera la meta de turno en {_fmt_tons(abs(gap))}."
        if forecast["meta_configured"] and gap <= 0
        else f"La proyeccion queda {_fmt_tons(max(gap, 0))} bajo la meta; priorizar continuidad y disponibilidad."
        if forecast["meta_configured"]
        else "No hay meta de turno cargada; la lectura se concentra en costo, ritmo y disponibilidad."
    )
    action_text = (
        f"Mirar primero {low_loader.get('carguio_id')}: mueve menos material que el resto. Revisar camiones asignados, cola y estado del equipo."
        if low_loader else "Mantener los equipos disponibles y revisar que los camiones esten bien repartidos."
    )
    simple_result = (
        "Fue un buen turno: se cumplio la meta, quedo margen positivo y el costo estuvo controlado."
        if healthy_close else "El turno necesita atencion: una de estas tres cosas no esta bien - meta, costo o disponibilidad."
    )
    next_shift_feedback = (
        f"Repetir lo que funciono: mantener el ritmo de las mejores unidades y cuidar el costo. Antes de iniciar, revisar {low_loader.get('carguio_id')} para que tenga camiones, ruta y apoyo suficiente."
        if low_loader else "Repetir lo que funciono: mantener los equipos disponibles, repartir bien los camiones y cuidar el costo por tonelada."
    )
    improve_tomorrow = (
        "Para ser mejores que ayer: quitar primero las demoras mas largas, mantener las palas cerca de su referencia y actuar temprano si un equipo deja de producir."
        if delays else "Para ser mejores que ayer: mantener el ritmo, evitar esperas y corregir cualquier detencion antes de que crezca."
    )
    top_delay = max(delays, key=lambda row: float(row.get("minutes") or 0), default=None)
    top_delay_name = str(top_delay.get("type") or "la principal demora") if top_delay else "las demoras"
    top_delay_minutes = float(top_delay.get("minutes") or 0) if top_delay else 0.0
    low_loader_name = str(low_loader.get("carguio_id") or "la unidad de menor rendimiento") if low_loader else "las unidades de carguio"
    low_loader_tph = float(low_loader.get("rendimiento_tph") or 0) if low_loader else 0.0
    manager_decision = (
        f"Mantener el plan. La proyeccion supera la meta por {_fmt_tons(abs(gap))}; proteger el costo unitario."
        if on_target else f"Activar recuperacion de {_fmt_tons(max(gap, 0))}; la proyeccion no llega a la meta."
    )
    role_rows = [
        ["Rol", "Orden para la proxima hora", "Control"],
        [
            "Gerente",
            f"{manager_decision} Pedir un corte de costo y disponibilidad antes de terminar la hora.",
            f"Cierre: {_fmt_tons(closing_tons)}. Costo: <= USD 3.07/t.",
        ],
        [
            "Supervisor",
            f"Priorizar {low_loader_name}. Revisar camiones, ruta y estado; atacar {top_delay_name.lower()}.",
            f"Mejorar desde {low_loader_tph:,.0f} t/h. Foco: {top_delay_minutes:,.0f} min de demora.",
        ],
        [
            "Despacho",
            f"Evitar que {low_loader_name} espere. Balancear CAEX y vigilar cola y ciclos cada 30 min.",
            "Menos espera; mas ciclos y tonelaje sostenido en la hora.",
        ],
    ]
    role_action_table = Table(
        [
            [Paragraph(f"<b>{cell}</b>", styles["small"]) for cell in role_rows[0]],
            *[[Paragraph(cell, styles["small"]) for cell in row] for row in role_rows[1:]],
        ],
        colWidths=[0.85 * inch, 4.15 * inch, 2.15 * inch],
    )
    role_action_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EAF7F0")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0C1220")),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#C9D7D0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7FAF9")]),
    ]))

    story: list[Any] = [
        header,
        Spacer(1, 0.12 * inch),
        Paragraph(f"Turno {current['turno']} - {current['fecha']} | Generado para: {username} | Fuente: {dataset.get('source', 'WENCO')}", styles["small"]),
        Spacer(1, 0.14 * inch),
        card_table,
        *_section("1. DECISION DEL TURNO", styles),
        Paragraph(verdict_detail, styles["summary_title"]),
        Paragraph(f"{simple_result} {close_text}", styles["body"]),
        *_section("2. PLAN DE ACCION POR ROL - PROXIMOS 30 MINUTOS", styles),
        role_action_table,
        *_section("3. APRENDIZAJE PARA EL PROXIMO TURNO", styles),
        Paragraph(f"<b>Repetir:</b> {next_shift_feedback}", styles["body"]),
        Paragraph(f"<b>Mejorar:</b> {improve_tomorrow}", styles["body"]),
        *_section("4. COSTO Y RESULTADO ECONOMICO", styles),
        _table([
            ["Indicador", "Valor", "Lectura gerencial"],
            ["Costo del turno", _fmt_usd(economics["total_cost_usd"]), "Costo acumulado al momento de emitir el informe."],
            ["Costo por tonelada", f"USD {economics['cost_per_tonne_usd']:.2f}/t", "Referencia para comparar escenarios y cumplimiento."],
            ["Costo por hora", f"{_fmt_usd(cost_per_hour)}/h", "Ritmo de gasto segun horas transcurridas del turno."],
            ["Perdida estimada", _fmt_usd(economics["estimated_loss_usd"]), "Demoras y brecha de cierre valorizadas con supuestos configurados."],
            ["Combustible estimado", f"{float(economics['fuel_liters']):,.0f} L", f"Costo estimado: {_fmt_usd(economics['fuel_cost_usd'])}."],
        ], [1.55 * inch, 1.35 * inch, 4.15 * inch]),
        *_section("5. RESPALDO OPERACIONAL - COMO TRABAJARON LAS PALAS", styles),
    ]

    loader_rows = [["Unidad", "Modelo", "Tonelaje", "t/h", "Referencia", "Lectura"]]
    for loader in loaders:
        tph = float(loader.get("rendimiento_tph") or 0)
        is_pala1 = str(loader.get("carguio_id") or "").replace(" ", "").upper() == "PALA1"
        reference = 5000.0 if is_pala1 else fleet_tph
        pct = tph / max(reference, 1) * 100
        reading = f"{pct:.0f}% de meta P&H 4100" if is_pala1 else f"{pct:.0f}% del promedio de UC"
        loader_rows.append([
            str(loader.get("carguio_id") or "Sin dato"),
            "P&H 4100XPC AC" if is_pala1 else str(loader.get("modelo") or "Sin dato"),
            _fmt_tons(float(loader.get("toneladas") or 0)),
            f"{tph:,.0f}",
            f"{reference:,.0f} t/h",
            reading,
        ])
    story.append(_table(loader_rows, [0.8 * inch, 1.35 * inch, 1.05 * inch, 0.7 * inch, 1.0 * inch, 2.25 * inch]))
    story += [
        Paragraph("La meta de 5.000 t/h se aplica exclusivamente a Pala 1 (P&H 4100XPC AC) como referencia operativa. Las demas unidades se comparan con el promedio de carguio del turno.", styles["small"]),
        *_section("6. DONDE SE PERDIO TIEMPO", styles),
    ]

    delay_rows = [["Fuente", "Tiempo", "Implicancia"]]
    for delay in delays:
        minutes = float(delay.get("minutes") or 0)
        delay_rows.append([str(delay.get("type") or "Sin dato"), f"{minutes:,.0f} min", "Reducir para recuperar capacidad y controlar costo por tonelada."])
    story.append(_table(delay_rows, [2.2 * inch, 1.0 * inch, 3.95 * inch]))
    story += [*_section("7. ALERTAS IMPORTANTES", styles)]
    alert_rows = [["Nivel", "Hallazgo", "Accion ejecutiva"]]
    if not top_alerts:
        alert_rows.append([
            "SIN ALERTAS",
            "Sin hallazgos prioritarios en este corte.",
            "Mantener monitoreo y conciliar al cierre.",
        ])
    for alert in top_alerts:
        alert_rows.append([
            str(alert.get("severidad") or "MEDIA"),
            str(alert.get("titulo") or alert.get("descripcion") or "Alerta operacional"),
            str(alert.get("recomendacion") or "Validar en terreno y monitorear el resultado."),
        ])
    story.append(_table(alert_rows, [1.0 * inch, 2.15 * inch, 4.0 * inch]))
    story += [
        *_section("8. EQUIPOS QUE REQUIEREN INTERVENCION", styles),
        Paragraph("Se muestran solo equipos con mantencion, averia o demora relevante. El detalle completo permanece disponible en el Cockpit.", styles["small"]),
        Spacer(1, 0.025 * inch),
        _table(maintenance_rows, [0.85 * inch, 1.0 * inch, 1.05 * inch, 0.55 * inch, 2.37 * inch]),
        *_section("9. CIERRE ECONOMICO DEL TURNO", styles),
        _table([
            ["Indicador", "Valor", "Lectura"],
            ["Cierre usado", closing_label, "El veredicto usa esta lectura del turno."],
            ["Tonelaje de cierre", _fmt_tons(closing_tons), "Tonelaje usado para el veredicto del turno."],
            ["Valor referencial", _fmt_usd(estimated_revenue), f"USD {value_per_tonne:.2f}/t de valor configurado."],
            ["Costo operacional", _fmt_usd(economics["total_cost_usd"]), f"USD {economics['cost_per_tonne_usd']:.2f}/t y {_fmt_usd(cost_per_hour)}/h."],
            ["Margen estimado", _fmt_usd(estimated_margin), "Valor referencial menos costo operacional estimado."],
            ["Veredicto", verdict, "Meta, margen y costo unitario evaluados en conjunto."],
        ], [1.35 * inch, 2.2 * inch, 2.95 * inch]),
    ]
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return buffer.getvalue()
