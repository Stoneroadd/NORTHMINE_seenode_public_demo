from __future__ import annotations

from typing import Any

from app.services.operator_score_engine import (
    MANAGEABLE_DELAY_THRESHOLDS,
    RESPONSIBLE_USE_NOTE,
    SCORE_WEIGHTS,
    SYSTEM_DELAY_CATEGORIES,
    thresholds_used,
)


def _data_mode() -> str:
    return "real_wenco_sql"


def build_operator_ranking_methodology() -> dict[str, Any]:
    return {
        "source": "operator_ranking",
        "data_mode": _data_mode(),
        "score_formula": {
            "text": (
                "Score global = Productividad (35%) + Disponibilidad (25%) + "
                "Utilizacion (20%) + Control de demoras (15%) + Seguridad (5%)"
            ),
            "components": {
                "productividad": "Toneladas reales sobre toneladas esperadas (tope 100%).",
                "disponibilidad": "Minutos productivos sobre minutos de turno.",
                "utilizacion": "Minutos operativos sobre minutos disponibles.",
                "control_demoras": "100 menos penalizacion por exceso de demoras gestionables.",
                "seguridad": "100 menos penalizacion por eventos de seguridad.",
            },
        },
        "weights": {
            "productividad": SCORE_WEIGHTS["productividad_score"],
            "disponibilidad": SCORE_WEIGHTS["disponibilidad_score"],
            "utilizacion": SCORE_WEIGHTS["utilizacion_score"],
            "control_demoras": SCORE_WEIGHTS["control_demoras_score"],
            "seguridad": SCORE_WEIGHTS["seguridad_score"],
        },
        "manageable_delays": [
            {
                "code": category.split(" ", 1)[0],
                "name": category.split(" ", 1)[1],
                "category": category,
                "rule": "Se compara contra ventana esperada y solo se penaliza el exceso sobre umbral de alerta.",
            }
            for category in MANAGEABLE_DELAY_THRESHOLDS
        ],
        "system_delays": [
            {
                "category": category,
                "rule": "Se muestra como contexto operacional. No castiga directamente el control de demoras del operador.",
            }
            for category in sorted(SYSTEM_DELAY_CATEGORIES)
        ],
        "thresholds": thresholds_used(),
        "interpretation": {
            "EXCELENTE": "90 a 100: desempeno estimado sobresaliente.",
            "BUENO": "80 a 89: desempeno estimado solido.",
            "SEGUIMIENTO": "70 a 79: revisar oportunidades de mejora con contexto.",
            "RIESGO_ALTO": "60 a 69: seguimiento operacional prioritario.",
            "CRITICO": "Menor a 60: requiere revision detallada antes de acciones.",
        },
        "responsible_use_note": RESPONSIBLE_USE_NOTE,
    }


def build_operator_ranking_thresholds() -> dict[str, Any]:
    thresholds = thresholds_used()
    return {
        "source": "operator_ranking",
        "data_mode": _data_mode(),
        "thresholds": thresholds,
        "bathroom": {
            "expected": MANAGEABLE_DELAY_THRESHOLDS["O03 Bano"]["expected"],
            "alert": MANAGEABLE_DELAY_THRESHOLDS["O03 Bano"]["alert"],
            "critical": MANAGEABLE_DELAY_THRESHOLDS["O03 Bano"]["critical"],
        },
        "lunch": {
            "expected": MANAGEABLE_DELAY_THRESHOLDS["O02 Colacion"]["expected"],
            "alert": MANAGEABLE_DELAY_THRESHOLDS["O02 Colacion"]["alert"],
        },
        "shift_change": {
            "expected": MANAGEABLE_DELAY_THRESHOLDS["O01 Cambio de Turno"]["expected"],
            "alert": MANAGEABLE_DELAY_THRESHOLDS["O01 Cambio de Turno"]["alert"],
        },
        "no_assignment": {
            "expected": MANAGEABLE_DELAY_THRESHOLDS["O12 Sin Postura"]["expected"],
            "alert": MANAGEABLE_DELAY_THRESHOLDS["O12 Sin Postura"]["alert"],
        },
        "fueling": {
            "expected": MANAGEABLE_DELAY_THRESHOLDS["O04 Petroleando"]["expected"],
            "alert": MANAGEABLE_DELAY_THRESHOLDS["O04 Petroleando"]["alert"],
        },
    }


def build_responsible_use() -> dict[str, Any]:
    return {
        "source": "operator_ranking",
        "data_mode": _data_mode(),
        "title": "Uso responsable del ranking operacional",
        "responsible_use_note": RESPONSIBLE_USE_NOTE,
        "principles": [
            "El ranking es un insumo de analisis operacional, no una herramienta de sancion automatica.",
            "Los eventos asociados al operador deben revisarse con turno, equipo, circuito y condiciones de la faena.",
            "Las demoras sistemicas se informan como contexto y no como responsabilidad directa del operador.",
            "Los umbrales son referencias operacionales iniciales y deben calibrarse con reglas oficiales de la faena.",
        ],
    }
