from __future__ import annotations

from app.ai.work_products.models import Audience, ReportType

"""Plantillas de informe (Etapa 6, secciones 17/19/21 del brief).

El borrador estandar tiene 16 secciones fijas (seccion 19). Por tipo de
informe se usa un SUBCONJUNTO relevante - un PRODUCTION_REPORT no necesita
'Evidencia contradictoria' de flota, por ejemplo - pero el ORDEN y los
TITULOS de las secciones que si aplican son siempre los mismos, para que el
usuario reconozca la estructura sin importar el tipo.

La audiencia (seccion 21) NUNCA cambia los datos - solo que tan detalladas
son las secciones narrativas. Se aplica en reports.py al formatear el
contenido de cada seccion, no aca.
"""

STANDARD_SECTION_TITLES: list[str] = [
    "Resumen ejecutivo", "Resultado operacional", "Producción", "Carguío",
    "Transporte", "Utilización y disponibilidad", "Demoras", "Desviaciones principales",
    "Análisis de causas", "Evidencia relevante", "Evidencia contradictoria",
    "Riesgos operacionales", "Impacto estimado", "Acciones y recomendaciones",
    "Pendientes", "Calidad de datos", "Anexos",
]

_SECTIONS_BY_TYPE: dict[ReportType, list[str]] = {
    "SHIFT_REPORT": STANDARD_SECTION_TITLES,
    "INVESTIGATION_REPORT": STANDARD_SECTION_TITLES,
    "EXECUTIVE_SUMMARY": ["Resumen ejecutivo", "Resultado operacional", "Desviaciones principales", "Riesgos operacionales", "Impacto estimado", "Acciones y recomendaciones", "Calidad de datos"],
    "PRODUCTION_REPORT": ["Resumen ejecutivo", "Resultado operacional", "Producción", "Carguío", "Transporte", "Desviaciones principales", "Análisis de causas", "Evidencia relevante", "Impacto estimado", "Acciones y recomendaciones", "Calidad de datos", "Anexos"],
    "FLEET_REPORT": ["Resumen ejecutivo", "Resultado operacional", "Transporte", "Utilización y disponibilidad", "Demoras", "Desviaciones principales", "Evidencia relevante", "Riesgos operacionales", "Acciones y recomendaciones", "Calidad de datos", "Anexos"],
    "BREAKDOWN_REPORT": ["Resumen ejecutivo", "Resultado operacional", "Demoras", "Desviaciones principales", "Análisis de causas", "Evidencia relevante", "Riesgos operacionales", "Impacto estimado", "Acciones y recomendaciones", "Pendientes", "Calidad de datos", "Anexos"],
}


def sections_for(report_type: ReportType) -> list[str]:
    return _SECTIONS_BY_TYPE.get(report_type, STANDARD_SECTION_TITLES)


_AUDIENCE_LABELS: dict[Audience, str] = {
    "dispatcher": "Despachador — estado operacional inmediato",
    "supervisor": "Supervisor — cumplimiento, desviaciones, coordinación",
    "manager": "Gerencia — producción, impacto, tendencia, riesgo",
    "executive": "Ejecutivo — resultado, impacto, tendencia, exposición, decisión pendiente",
}


def audience_label(audience: Audience) -> str:
    return _AUDIENCE_LABELS.get(audience, audience)


REPORT_TITLES: dict[ReportType, str] = {
    "SHIFT_REPORT": "REPORTE OPERACIONAL DE TURNO",
    "INVESTIGATION_REPORT": "REPORTE DE INVESTIGACIÓN OPERACIONAL",
    "PRODUCTION_REPORT": "REPORTE OPERACIONAL DE PRODUCCIÓN",
    "FLEET_REPORT": "REPORTE OPERACIONAL DE FLOTA",
    "BREAKDOWN_REPORT": "REPORTE OPERACIONAL DE AVERÍAS",
    "EXECUTIVE_SUMMARY": "RESUMEN EJECUTIVO OPERACIONAL",
}


def report_title(report_type: ReportType) -> str:
    return REPORT_TITLES[report_type]
