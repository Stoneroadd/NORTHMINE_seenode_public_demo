from __future__ import annotations

from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.services.data_provider import get_dataset

from .kpis import build_current_shift_command_center, build_operational_alerts, build_summary


def _fmt_tons(value: float | int) -> str:
    return f"{int(round(value)):,.0f} t".replace(",", ".")


def _fmt_pct(value: float | int) -> str:
    return f"{float(value):.1f}%"


def _section(title: str, styles: dict[str, ParagraphStyle]) -> list[Any]:
    return [
        Spacer(1, 0.12 * inch),
        Paragraph(title, styles["section"]),
        Spacer(1, 0.06 * inch),
    ]


def _table(rows: list[list[Any]], widths: list[float] | None = None) -> Table:
    table = Table(rows, colWidths=widths, repeatRows=1 if rows and all(isinstance(item, str) for item in rows[0]) else 0)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EAF7F0")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0C1220")),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#C9D7D0")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7FAF9")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def build_shift_pdf(fecha: str | None = None, turno: str | None = None, username: str = "admin") -> bytes:
    dataset = get_dataset(fecha)
    current = build_current_shift_command_center(dataset, turno)
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
            f"Faena: Rajo DES - Empresa: TEPSAC/EPSA<br/>"
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
