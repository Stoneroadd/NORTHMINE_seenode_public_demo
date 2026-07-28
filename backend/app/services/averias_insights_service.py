from __future__ import annotations

import unicodedata
from collections import defaultdict
from datetime import datetime
from typing import Any

from app.services.averias_import_service import get_fleet_breakdown

# Motor de analisis de patrones sobre el historial de averias importado:
#  - Fallas recurrentes: mismo equipo + mismo sistema repetido en la ventana,
#    con tendencia de frecuencia (intervalo entre eventos acortandose o no).
#  - Tendencia por sistema: compara la primera y segunda mitad del periodo.
#  - Equipos en riesgo: score por recurrencia, severidad y estado F/S.
#  - Causa probable y solucion sugerida: base de conocimiento por sistema +
#    palabras clave de la descripcion (heuristica experta, no un modelo
#    entrenado; la etiqueta de confianza refleja cuanta evidencia hay).

_KNOWLEDGE_BASE: list[dict[str, Any]] = [
    {
        "sistema": "HIDRAULIC",
        "keywords": ["FLEXIBLE", "MANGUERA", "LATIGUILLO", "FUGA"],
        "causa": "Desgaste o abrasion de flexibles hidraulicos por vibracion, roce con estructura o rutas mal fijadas.",
        "solucion": "Cambio preventivo de flexibles por horas de uso, revision de rutas y abrazaderas, proteccion anti-roce en puntos de contacto.",
    },
    {
        "sistema": "HIDRAULIC",
        "keywords": ["BOMBA", "CILINDRO", "PISTON"],
        "causa": "Degradacion de sellos o contaminacion del aceite hidraulico.",
        "solucion": "Analisis de aceite, cambio de sellos, verificar filtrado y hermeticidad del estanque.",
    },
    {
        "sistema": "HIDRAULIC",
        "keywords": ["ENFRIADOR", "TEMPERATURA"],
        "causa": "Perdida de eficiencia del circuito de enfriamiento hidraulico (enfriador sucio u obstruido).",
        "solucion": "Limpieza/soplado del enfriador, control de temperatura en operacion, revisar caudal del ventilador.",
    },
    {
        "sistema": "MOTOR",
        "keywords": ["INYECTOR", "POTENCIA", "COMBUSTIBLE"],
        "causa": "Sistema de combustible: inyectores desgastados o combustible con particulas/agua.",
        "solucion": "Analisis de combustible y aceite, cambio de inyectores por juego, revision de filtros y decantador.",
    },
    {
        "sistema": "MOTOR",
        "keywords": ["ENFRIADOR", "TEMPERATURA", "REFRIGERANTE"],
        "causa": "Sistema de refrigeracion del motor: enfriadores con fugas o perdida de refrigerante.",
        "solucion": "Prueba de presion del circuito, cambio de enfriadores defectuosos, control de niveles en cada turno.",
    },
    {
        "sistema": "ELECTRIC",
        "keywords": ["CODIGO", "SENSOR", "TÉ", "TE DE"],
        "causa": "Codigos activos por sensores o arnes electrico con conectores sulfatados/sueltos (vibracion y polvo).",
        "solucion": "Escaneo completo, limpieza y reapriete de conectores, revision de arnes en zonas de vibracion.",
    },
    {
        "sistema": "ELECTRIC",
        "keywords": ["A/C", "AIRE", "COMPRESOR", "CLIMA"],
        "causa": "Sistema de climatizacion: fugas de gas o compresor A/C desgastado.",
        "solucion": "Deteccion de fugas, carga del sistema, cambio de compresor si repite; critico para fatiga del operador.",
    },
    {
        "sistema": "SUSPENSION",
        "keywords": ["CARGA", "NITROGENO", "FUGA"],
        "causa": "Perdida de nitrogeno/aceite en suspensiones, acelerada por estado de pistas y sobrecarga.",
        "solucion": "Recarga y prueba de estanqueidad, control de pesos de carga (payload), coordinacion con mantencion de pistas.",
    },
    {
        "sistema": "FRENADO",
        "keywords": ["CARRERA", "FRENO"],
        "causa": "Desgaste o desajuste del sistema de freno (carrera alta = huelgo excesivo).",
        "solucion": "Ajuste de carrera, inspeccion de pastillas/discos y sistema neumatico; programar cambio antes de limite.",
    },
    {
        "sistema": "RODAJE",
        "keywords": ["NEUMATICO", "ROTACION", "LLANTA", "ORING", "O·RONG"],
        "causa": "Desgaste de neumaticos/rodaje influido por estado de pisos, curvas y presiones.",
        "solucion": "Plan de rotacion, control de presiones, mantencion de pisos en frentes y botaderos.",
    },
    {
        "sistema": "TRANSMISION",
        "keywords": [],
        "causa": "Desgaste interno de transmision (tipico por horas de servicio y temperatura).",
        "solucion": "Analisis de aceite con conteo de particulas, monitoreo de temperatura, overhaul programado por horas.",
    },
    {
        "sistema": "DIRECCI",
        "keywords": ["CILINDRO"],
        "causa": "Desgaste de cilindros/bombin de direccion.",
        "solucion": "Cambio de cilindros por juego, revision de rotulas y alineacion.",
    },
    {
        "sistema": "IMPLEMENTOS",
        "keywords": ["BOOM", "FISURA", "BASTIDOR", "COLUMNA"],
        "causa": "Fatiga estructural (fisuras en boom/bastidor) por ciclos de carga.",
        "solucion": "Inspeccion de fisuras END periodica, reparacion con procedimiento certificado, evaluar refuerzos.",
    },
]

_DEFAULT_INSIGHT = {
    "causa": "Patron repetitivo sin causa unica identificable desde la descripcion.",
    "solucion": "Analisis de causa raiz con el especialista del sistema; revisar historial de intervenciones del equipo.",
}


def _sin_acentos(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def _match_knowledge(sistema: str | None, texto: str) -> dict[str, str]:
    sistema_up = _sin_acentos((sistema or "").upper())
    texto_up = _sin_acentos(texto.upper())
    best: dict[str, Any] | None = None
    best_score = 0
    for entry in _KNOWLEDGE_BASE:
        if entry["sistema"] not in sistema_up:
            continue
        score = 1 + sum(1 for keyword in entry["keywords"] if keyword in texto_up)
        if score > best_score:
            best, best_score = entry, score
    if best is None:
        return dict(_DEFAULT_INSIGHT)
    return {"causa": best["causa"], "solucion": best["solucion"]}


def _parse_day(event: dict[str, Any]) -> datetime | None:
    value = event.get("inicio") or event.get("fecha")
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value)[:19])
    except ValueError:
        return None


def _es_correctiva(tipo: str | None) -> bool:
    return "aver" in (tipo or "").lower()


def get_insights(days: int = 31) -> dict[str, Any]:
    detail = get_fleet_breakdown(days)
    events = detail["events"]
    correctivas = [event for event in events if _es_correctiva(event.get("tipo"))]

    # --- Fallas recurrentes: equipo + sistema con 2+ averias ----------------
    groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for event in correctivas:
        groups[(event["equipment_id"], event.get("sistema") or "Sin sistema")].append(event)

    recurrentes = []
    for (equipment_id, sistema), group in groups.items():
        if len(group) < 2:
            continue
        fechas = sorted(d for d in (_parse_day(e) for e in group) if d)
        gaps = [(b - a).days for a, b in zip(fechas, fechas[1:])] if len(fechas) > 1 else []
        gap_promedio = round(sum(gaps) / len(gaps), 1) if gaps else None
        tendencia = "ESTABLE"
        if len(gaps) >= 2 and gaps[-1] < (sum(gaps) / len(gaps)) * 0.7:
            tendencia = "EN AUMENTO"
        elif len(gaps) >= 2 and gaps[-1] > (sum(gaps) / len(gaps)) * 1.5:
            tendencia = "A LA BAJA"
        texto = " ".join(str(e.get("descripcion") or "") for e in group)
        conocimiento = _match_knowledge(sistema, texto)
        total_min = sum(e.get("duracion_min") or 0 for e in group)
        ultimo = max(group, key=lambda e: str(e.get("inicio") or e.get("fecha") or ""))
        recurrentes.append(
            {
                "equipment_id": equipment_id,
                "model": ultimo.get("model"),
                "sistema": sistema,
                "eventos": len(group),
                "total_min": round(total_min, 1),
                "gap_promedio_dias": gap_promedio,
                "tendencia": tendencia,
                "ultima_fecha": str(ultimo.get("inicio") or ultimo.get("fecha") or "")[:10] or None,
                "ultima_descripcion": ultimo.get("descripcion"),
                "causa_probable": conocimiento["causa"],
                "solucion_sugerida": conocimiento["solucion"],
                "confianza": "ALTA" if len(group) >= 3 else "MEDIA",
            }
        )
    recurrentes.sort(key=lambda item: (item["tendencia"] == "EN AUMENTO", item["eventos"], item["total_min"]), reverse=True)

    # --- Tendencia por sistema: primera vs segunda mitad del periodo --------
    fechas_evento = sorted(d for d in (_parse_day(e) for e in correctivas) if d)
    tendencias_sistema = []
    if len(fechas_evento) >= 4:
        corte = fechas_evento[len(fechas_evento) // 2]
        por_sistema: dict[str, list[int]] = defaultdict(lambda: [0, 0])
        for event in correctivas:
            day = _parse_day(event)
            if not day:
                continue
            sistema = event.get("sistema") or "Sin sistema"
            por_sistema[sistema][0 if day < corte else 1] += 1
        for sistema, (antes, despues) in por_sistema.items():
            if antes + despues < 3:
                continue
            variacion = round((despues - antes) / max(antes, 1) * 100)
            tendencias_sistema.append(
                {
                    "sistema": sistema,
                    "primera_mitad": antes,
                    "segunda_mitad": despues,
                    "variacion_pct": variacion,
                    "direccion": "SUBE" if despues > antes else "BAJA" if despues < antes else "ESTABLE",
                }
            )
        tendencias_sistema.sort(key=lambda item: item["variacion_pct"], reverse=True)

    # --- Equipos en riesgo: score de recurrencia + severidad + estado -------
    riesgo: dict[str, dict[str, Any]] = {}
    for item in recurrentes:
        entry = riesgo.setdefault(
            item["equipment_id"],
            {"equipment_id": item["equipment_id"], "model": item["model"], "score": 0, "razones": []},
        )
        entry["score"] += item["eventos"] * 2 + (3 if item["tendencia"] == "EN AUMENTO" else 0)
        entry["razones"].append(
            f"{item['eventos']} averias de {item['sistema']}"
            + (" con frecuencia en aumento" if item["tendencia"] == "EN AUMENTO" else "")
        )
    for equipo in detail["equipment"]:
        if equipo["equipment_id"] in riesgo and equipo.get("criticas"):
            riesgo[equipo["equipment_id"]]["score"] += equipo["criticas"]
            riesgo[equipo["equipment_id"]]["razones"].append(f"{equipo['criticas']} eventos criticos")
    for event in events[:80]:
        estado = str(event.get("estado") or "").upper().replace("/", "")
        if estado == "FS" and event["equipment_id"] in riesgo:
            entry = riesgo[event["equipment_id"]]
            if "actualmente F/S" not in entry["razones"]:
                entry["score"] += 3
                entry["razones"].append("actualmente F/S")
    equipos_riesgo = sorted(riesgo.values(), key=lambda item: item["score"], reverse=True)[:8]
    for index, entry in enumerate(equipos_riesgo):
        entry["nivel"] = "CRITICO" if index < 2 and entry["score"] >= 10 else "ALTO" if entry["score"] >= 7 else "MEDIO"

    return {
        "source": "pattern_analysis",
        "days": days,
        "eventos_analizados": len(events),
        "averias_analizadas": len(correctivas),
        "recurrentes": recurrentes[:20],
        "tendencias_sistema": tendencias_sistema[:10],
        "equipos_riesgo": equipos_riesgo,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }
