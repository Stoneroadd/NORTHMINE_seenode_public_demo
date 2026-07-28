from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

from app.core.config import get_settings
from app.services.averias_import_service import _connect as _averias_connect
from app.services.cycle_history_service import query_rows

# Analisis experto: cruza el historico de ciclos (produccion) con el historico
# de averias (mantencion) y lo traduce a hallazgos en lenguaje simple.
#  1. Toneladas perdidas por averia, por equipo (costo de indisponibilidad).
#  2. Calidad de mantencion: averias que ocurren pocos dias despues de una PM.
#  3. Realismo de la meta de turno contra la distribucion historica real.
#  4. Control estadistico: la semana actual de averias es normal o anomala.


def _demo_expert_analysis(days: int) -> dict[str, Any]:
    """Respuesta completa y explícitamente sintética para la demostración local.

    Evita que un demo sin historial de ciclos o mantención se vea vacío, sin
    mezclar ni escribir información ficticia en las bases históricas.
    """
    generated_at = datetime.now().isoformat(timespec="seconds")
    return {
        "source": "northmine_demo_synthetic",
        "synthetic": True,
        "days": days,
        "hallazgos": [
            {
                "titulo": "Costo de indisponibilidad",
                "valor": "18.640 t",
                "detalle": "Estimación sintética de toneladas no movidas por detenciones correctivas. CAEX-17 concentra la mayor oportunidad: 5.420 t estimadas.",
                "tono": "ambar",
            },
            {
                "titulo": "Calidad de la mantención",
                "valor": "18,8%",
                "detalle": "En esta muestra sintética, 9 de 48 averías posteriores a mantención programada ocurrieron dentro de 7 días. Conviene revisar los casos repetidos antes de ajustar la pauta.",
                "tono": "ambar",
            },
            {
                "titulo": "Realismo de la meta de turno",
                "valor": "72,4% cumplida",
                "detalle": "La meta de 70.000 t se alcanzó en 63 de 87 turnos sintéticos. La mediana es 73.850 t: una exigencia desafiante pero alcanzable.",
                "tono": "verde",
            },
            {
                "titulo": "Control semanal de averías",
                "valor": "6 eventos (normal)",
                "detalle": "La última semana sintética registra 6 eventos frente a un promedio de 5,2. Está dentro del rango esperado; mantener monitoreo preventivo.",
                "tono": "verde",
            },
        ],
        "toneladas_perdidas": {
            "total": 18640,
            "equipos": [
                {"equipment_id": "CAEX-17", "dias_detenido": 0.8, "ton_dia_promedio": 6775, "ton_perdidas": 5420},
                {"equipment_id": "CAEX-08", "dias_detenido": 0.6, "ton_dia_promedio": 6420, "ton_perdidas": 3852},
                {"equipment_id": "CAEX-21", "dias_detenido": 0.5, "ton_dia_promedio": 6310, "ton_perdidas": 3155},
                {"equipment_id": "CAEX-04", "dias_detenido": 0.4, "ton_dia_promedio": 6040, "ton_perdidas": 2416},
                {"equipment_id": "CAEX-13", "dias_detenido": 0.6, "ton_dia_promedio": 5995, "ton_perdidas": 3597},
            ],
        },
        "post_pm": {
            "pct_dentro_7_dias": 18.8,
            "averias_post_pm": 48,
            "equipos_repetidos": [
                {"equipment_id": "CAEX-17", "casos": 3},
                {"equipment_id": "CAEX-08", "casos": 2},
                {"equipment_id": "CAEX-21", "casos": 2},
            ],
        },
        "meta": {
            "meta_turno": 70000,
            "turnos_analizados": 87,
            "pct_turnos_cumplidos": 72.4,
            "mediana_turno": 73850,
            "percentil_meta": 48,
        },
        "control_semanal": {
            "semana": "DEMO-S30",
            "averias_semana": 6,
            "promedio_historico": 5.2,
            "limite_superior": 9.1,
            "estado": "NORMAL",
        },
        "generated_at": generated_at,
    }


def _es_correctiva(tipo: str | None) -> bool:
    return "aver" in (tipo or "").lower()


def _es_programada(tipo: str | None) -> bool:
    lower = (tipo or "").lower()
    return "planificado" in lower or "programada" in lower or "mantenimiento" in lower


def _fetch_averias(cutoff: str) -> list[dict[str, Any]]:
    with _averias_connect() as conn:
        return [
            dict(row)
            for row in conn.execute(
                "SELECT * FROM averia_events WHERE fecha >= ? ORDER BY COALESCE(inicio, fecha)",
                (cutoff,),
            )
        ]


def get_expert_analysis(days: int = 90) -> dict[str, Any]:
    if get_settings().is_demo:
        return _demo_expert_analysis(days)

    cutoff = (datetime.now() - timedelta(days=max(days, 7))).date().isoformat()
    hallazgos: list[dict[str, str]] = []

    # ------------------------------------------------------------------ 1
    # Produccion por equipo desde el historico de ciclos.
    ciclos_equipo = query_rows(
        """
        SELECT caex_id AS equipo, SUM(tonelaje) AS tons, COUNT(DISTINCT fecha) AS dias
        FROM ciclos WHERE fecha >= ? AND caex_id IS NOT NULL GROUP BY caex_id
        """,
        (cutoff,),
    )
    ciclos_palas = query_rows(
        """
        SELECT carguio_id AS equipo, SUM(tonelaje) AS tons, COUNT(DISTINCT fecha) AS dias
        FROM ciclos WHERE fecha >= ? AND carguio_id IS NOT NULL GROUP BY carguio_id
        """,
        (cutoff,),
    )
    ton_dia: dict[str, float] = {}
    for row in ciclos_equipo + ciclos_palas:
        if row["equipo"] and row["dias"]:
            ton_dia[str(row["equipo"]).upper()] = row["tons"] / row["dias"]

    averias = _fetch_averias(cutoff)
    averia_min_equipo: dict[str, float] = defaultdict(float)
    for event in averias:
        if _es_correctiva(event.get("tipo")) and event.get("duracion_min"):
            averia_min_equipo[event["equipment_id"]] += event["duracion_min"]

    perdidas = []
    total_perdido = 0.0
    for equipo, minutos in averia_min_equipo.items():
        rate = ton_dia.get(equipo)
        if not rate:
            continue
        dias_detenido = minutos / 1440
        tons = rate * dias_detenido
        total_perdido += tons
        perdidas.append(
            {
                "equipment_id": equipo,
                "dias_detenido": round(dias_detenido, 1),
                "ton_dia_promedio": round(rate),
                "ton_perdidas": round(tons),
            }
        )
    perdidas.sort(key=lambda item: item["ton_perdidas"], reverse=True)
    if perdidas:
        lider = perdidas[0]
        hallazgos.append(
            {
                "titulo": "Costo de las averias en produccion",
                "valor": f"{round(total_perdido):,} t".replace(",", "."),
                "detalle": (
                    f"Toneladas que la flota dejo de mover por averias en {days} dias. "
                    f"El mayor costo es {lider['equipment_id']}: ~{lider['ton_perdidas']:,} t perdidas "
                    f"({lider['dias_detenido']} dias detenido, movia ~{lider['ton_dia_promedio']:,} t/dia)."
                ).replace(",", "."),
                "tono": "rojo" if total_perdido > 100000 else "ambar",
            }
        )

    # ------------------------------------------------------------------ 2
    # Averias que llegan pocos dias despues de una mantencion programada.
    eventos_equipo: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for event in averias:
        stamp = event.get("inicio") or event.get("fecha")
        if stamp:
            eventos_equipo[event["equipment_id"]].append({**event, "_stamp": str(stamp)[:10]})
    post_pm_total = 0
    post_pm_rapidas = 0
    post_pm_equipos: dict[str, int] = defaultdict(int)
    for equipo, eventos in eventos_equipo.items():
        eventos.sort(key=lambda item: item["_stamp"])
        ultima_pm: str | None = None
        for event in eventos:
            # Solo PM reales (M. Planificado); el chequeo diario ocurre todos
            # los dias y sesgaria la metrica hacia el 100%.
            if "planificado" in (event.get("tipo") or "").lower():
                ultima_pm = event["_stamp"]
            elif _es_correctiva(event.get("tipo")) and ultima_pm:
                gap = (datetime.fromisoformat(event["_stamp"]) - datetime.fromisoformat(ultima_pm)).days
                post_pm_total += 1
                if 0 <= gap <= 7:
                    post_pm_rapidas += 1
                    post_pm_equipos[equipo] += 1
    pct_post_pm = round(post_pm_rapidas / post_pm_total * 100, 1) if post_pm_total else None
    peores_post_pm = sorted(post_pm_equipos.items(), key=lambda item: item[1], reverse=True)[:5]
    if pct_post_pm is not None:
        hallazgos.append(
            {
                "titulo": "Calidad de la mantencion",
                "valor": f"{pct_post_pm}%",
                "detalle": (
                    f"De las averias que ocurren despues de una mantencion programada, el {pct_post_pm}% "
                    f"aparece dentro de los 7 dias siguientes. Un valor alto sugiere intervenciones que no "
                    f"resuelven el problema de fondo."
                    + (f" Casos repetidos: {', '.join(f'{eq} ({n})' for eq, n in peores_post_pm[:3])}." if peores_post_pm else "")
                ),
                "tono": "rojo" if pct_post_pm >= 30 else "ambar" if pct_post_pm >= 15 else "verde",
            }
        )

    # ------------------------------------------------------------------ 3
    # Realismo de la meta de turno contra la historia real.
    meta_turno = max(0, int(get_settings().shift_target_tons or 0)) or 70000
    turnos = query_rows(
        "SELECT fecha, turno, SUM(tonelaje) AS tons FROM ciclos WHERE fecha >= ? GROUP BY fecha, turno",
        (cutoff,),
    )
    turnos_validos = [row for row in turnos if row["tons"] and row["tons"] > 10000]
    meta_info = None
    if len(turnos_validos) >= 10:
        valores = sorted(row["tons"] for row in turnos_validos)
        cumplidos = sum(1 for value in valores if value >= meta_turno)
        pct_cumplimiento = round(cumplidos / len(valores) * 100, 1)
        mediana = valores[len(valores) // 2]
        percentil_meta = round(sum(1 for value in valores if value < meta_turno) / len(valores) * 100)
        meta_info = {
            "meta_turno": meta_turno,
            "turnos_analizados": len(valores),
            "pct_turnos_cumplidos": pct_cumplimiento,
            "mediana_turno": round(mediana),
            "percentil_meta": percentil_meta,
        }
        hallazgos.append(
            {
                "titulo": "Que tan realista es la meta de turno",
                "valor": f"{pct_cumplimiento}% cumplida",
                "detalle": (
                    f"En {len(valores)} turnos historicos, la meta de {meta_turno:,} t se cumplio el "
                    f"{pct_cumplimiento}% de las veces. El turno tipico mueve {round(mediana):,} t "
                    f"(la meta esta en el percentil {percentil_meta}: "
                    + ("exigente pero alcanzable." if 40 <= percentil_meta <= 75 else
                       "muy facil, conviene subirla." if percentil_meta < 40 else
                       "muy exigente, se cumple pocas veces.")
                ).replace(",", "."),
                "tono": "verde" if 40 <= percentil_meta <= 75 else "ambar",
            }
        )

    # ------------------------------------------------------------------ 4
    # Control estadistico simple: semana actual de averias vs historia.
    semana_counts: dict[str, int] = defaultdict(int)
    for event in averias:
        if _es_correctiva(event.get("tipo")):
            stamp = str(event.get("inicio") or event.get("fecha") or "")[:10]
            if stamp:
                iso = datetime.fromisoformat(stamp).isocalendar()
                semana_counts[f"{iso[0]}-S{iso[1]:02d}"] += 1
    control = None
    if len(semana_counts) >= 5:
        semanas = sorted(semana_counts.items())
        historicas = [count for _, count in semanas[:-1]]
        actual_label, actual = semanas[-1]
        media = sum(historicas) / len(historicas)
        varianza = sum((value - media) ** 2 for value in historicas) / len(historicas)
        sigma = varianza ** 0.5
        estado = "ANOMALA ALTA" if actual > media + 2 * sigma else "ANOMALA BAJA" if actual < media - 2 * sigma else "NORMAL"
        control = {
            "semana": actual_label,
            "averias_semana": actual,
            "promedio_historico": round(media, 1),
            "limite_superior": round(media + 2 * sigma, 1),
            "estado": estado,
        }
        hallazgos.append(
            {
                "titulo": "Semana actual de averias",
                "valor": f"{actual} averias ({estado.lower()})",
                "detalle": (
                    f"La semana en curso lleva {actual} averias; el promedio historico es {round(media, 1)} "
                    f"por semana (limite de alerta: {round(media + 2 * sigma, 1)}). "
                    + ("Dentro de lo normal: no reaccionar a ruido." if estado == "NORMAL"
                       else "Fuera del rango normal: amerita revision de causa." if estado == "ANOMALA ALTA"
                       else "Inusualmente baja (o semana incompleta).")
                ),
                "tono": "verde" if estado == "NORMAL" else "rojo" if estado == "ANOMALA ALTA" else "ambar",
            }
        )

    return {
        "source": "expert_analysis",
        "days": days,
        "hallazgos": hallazgos,
        "toneladas_perdidas": {"total": round(total_perdido), "equipos": perdidas[:12]},
        "post_pm": {
            "pct_dentro_7_dias": pct_post_pm,
            "averias_post_pm": post_pm_total,
            "equipos_repetidos": [{"equipment_id": eq, "casos": n} for eq, n in peores_post_pm],
        },
        "meta": meta_info,
        "control_semanal": control,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }
