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
    "Objetivo", "Alcance", "Periodo", "Resumen ejecutivo", "Estado operacional",
    "Desviaciones", "Evidencia", "Causas probables", "Evidencia contradictoria",
    "Riesgos", "Recomendaciones", "Acciones propuestas", "Calidad de datos",
    "Limitaciones", "Fuentes", "Responsable de validación",
]

_SECTIONS_BY_TYPE: dict[ReportType, list[str]] = {
    "SHIFT_REPORT": STANDARD_SECTION_TITLES,
    "INVESTIGATION_REPORT": STANDARD_SECTION_TITLES,
    "EXECUTIVE_SUMMARY": [
        "Objetivo", "Alcance", "Periodo", "Resumen ejecutivo", "Estado operacional",
        "Riesgos", "Recomendaciones", "Calidad de datos", "Limitaciones", "Fuentes", "Responsable de validación",
    ],
    "PRODUCTION_REPORT": [
        "Objetivo", "Alcance", "Periodo", "Resumen ejecutivo", "Estado operacional",
        "Desviaciones", "Evidencia", "Recomendaciones", "Calidad de datos", "Limitaciones", "Fuentes",
        "Responsable de validación",
    ],
    "FLEET_REPORT": [
        "Objetivo", "Alcance", "Periodo", "Resumen ejecutivo", "Estado operacional",
        "Desviaciones", "Evidencia", "Riesgos", "Recomendaciones", "Calidad de datos", "Limitaciones", "Fuentes",
        "Responsable de validación",
    ],
    "BREAKDOWN_REPORT": [
        "Objetivo", "Alcance", "Periodo", "Resumen ejecutivo", "Desviaciones", "Evidencia",
        "Causas probables", "Riesgos", "Recomendaciones", "Acciones propuestas", "Calidad de datos",
        "Limitaciones", "Fuentes", "Responsable de validación",
    ],
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


REPORT_TITLE_PREFIX = "BORRADOR IA — REQUIERE VALIDACIÓN HUMANA"
