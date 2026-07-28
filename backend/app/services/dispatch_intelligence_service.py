from __future__ import annotations

import statistics
from datetime import datetime, timedelta
from typing import Any

from app.services.cycle_history_service import query_rows

# Inteligencia de despacho v1: deteccion de anomalias de ciclo por CAEX.
#
# Que mide: el tiempo entre descargas consecutivas del mismo CAEX (gap entre
# 'datetime' de un ciclo y el siguiente). No es el tiempo de ciclo fino
# (WENCO no expone ese quiebre para historizar - ver kpis.py), pero es una
# senal real y accionable para despacho: si un camion que normalmente
# descarga cada ~15 min lleva 45 min sin hacerlo, algo paso (averia, cola,
# bloqueo de ruta, operador) independiente de la causa exacta.
#
# Baseline: mediana + MAD (median absolute deviation) de los gaps del equipo
# en una ventana reciente, excluyendo gaps enormes de cambio de turno/dia
# (ruido, no anomalia real). MAD en vez de desviacion estandar porque los
# gaps de ciclo no son normales (colas ocasionales largas sesgan la media).

_MAX_GAP_FOR_BASELINE_MIN = 180  # excluye huecos de cambio de turno/dia
_MIN_GAPS_FOR_BASELINE = 5
_MAD_MULTIPLIER = 3.5
_MIN_ABSOLUTE_THRESHOLD_MIN = 25  # piso: nunca marcar anomalia bajo esto


def _split_origen(origen: str | None) -> tuple[str, str, str]:
    parts = [p.strip() for p in str(origen or "").split("/") if p.strip()]
    fase = parts[0] if parts else "Sin dato"
    banco = parts[1] if len(parts) > 1 else "Sin dato"
    malla = "/".join(parts[2:]) if len(parts) > 2 else "Sin dato"
    return fase, banco, malla


def get_dispatch_filters(days: int = 30) -> dict[str, Any]:
    """Valores distintos para poblar el filtro (fecha, UC, CAEX, fase, malla)."""
    cutoff = (datetime.now() - timedelta(days=days)).date().isoformat()
    rows = query_rows(
        """
        SELECT DISTINCT fecha, turno, caex_id, carguio_id, origen
        FROM ciclos WHERE fecha >= ?
        """,
        (cutoff,),
    )
    fechas = sorted({r["fecha"] for r in rows if r["fecha"]}, reverse=True)
    caex_ids = sorted({r["caex_id"] for r in rows if r["caex_id"]})
    carguio_ids = sorted({r["carguio_id"] for r in rows if r["carguio_id"]})
    fases: set[str] = set()
    mallas: set[str] = set()
    for row in rows:
        fase, _, malla = _split_origen(row["origen"])
        if fase != "Sin dato":
            fases.add(fase)
        if malla != "Sin dato":
            mallas.add(malla)
    return {
        "fechas": fechas[:60],
        "turnos": ["DIA", "NOCHE"],
        "caex_ids": caex_ids,
        "carguio_ids": carguio_ids,
        "fases": sorted(fases),
        "mallas": sorted(mallas),
    }


def _apply_filters_sql(
    caex_id: str | None, carguio_id: str | None,
) -> tuple[str, list[Any]]:
    clauses = []
    params: list[Any] = []
    if caex_id:
        clauses.append("caex_id = ?")
        params.append(caex_id)
    if carguio_id:
        clauses.append("carguio_id = ?")
        params.append(carguio_id)
    return (" AND " + " AND ".join(clauses)) if clauses else "", params


def _equipment_baseline(rows: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
    """Mediana + MAD de gaps entre ciclos consecutivos, por equipo."""
    by_equipo: dict[str, list[datetime]] = {}
    for row in rows:
        if not row["caex_id"] or not row["datetime"]:
            continue
        try:
            ts = datetime.fromisoformat(row["datetime"])
        except ValueError:
            continue
        by_equipo.setdefault(row["caex_id"], []).append(ts)

    baseline: dict[str, dict[str, float]] = {}
    for equipo, timestamps in by_equipo.items():
        timestamps.sort()
        gaps = [
            (b - a).total_seconds() / 60
            for a, b in zip(timestamps, timestamps[1:])
            if 0 < (b - a).total_seconds() / 60 <= _MAX_GAP_FOR_BASELINE_MIN
        ]
        if len(gaps) < _MIN_GAPS_FOR_BASELINE:
            continue
        mediana = statistics.median(gaps)
        mad = statistics.median([abs(g - mediana) for g in gaps]) or 1.0
        umbral = max(mediana + _MAD_MULTIPLIER * mad, _MIN_ABSOLUTE_THRESHOLD_MIN, mediana * 2)
        baseline[equipo] = {
            "mediana_min": round(mediana, 1),
            "mad_min": round(mad, 1),
            "umbral_min": round(umbral, 1),
            "muestras": len(gaps),
        }
    return baseline


def get_cycle_anomalies(
    fecha: str | None = None,
    turno: str | None = None,
    caex_id: str | None = None,
    carguio_id: str | None = None,
    fase: str | None = None,
    malla: str | None = None,
    baseline_days: int = 14,
) -> dict[str, Any]:
    """Anomalias de ciclo: equipos con un hueco entre descargas mayor a lo
    esperado para ellos mismos (no un umbral generico para toda la flota).

    Sin fecha (default): evalua el gap abierto de "ahora" contra el ultimo
    ciclo de cada equipo (uso en vivo, despacho). Con fecha: revisa todos
    los gaps ocurridos ese turno (revision historica).
    """
    extra_sql, extra_params = _apply_filters_sql(caex_id, carguio_id)

    # Baseline: ventana reciente ANTES del corte de evaluacion, mismo filtro
    # de equipo/UC (para que el "normal" de un CAEX en fase X sea comparable).
    baseline_cutoff = (
        datetime.fromisoformat(fecha) if fecha else datetime.now()
    ) - timedelta(days=baseline_days)
    baseline_rows = query_rows(
        f"SELECT caex_id, carguio_id, datetime, origen FROM ciclos WHERE fecha >= ?{extra_sql}",
        (baseline_cutoff.date().isoformat(), *extra_params),
    )
    if fase or malla:
        baseline_rows = [
            r for r in baseline_rows
            if (not fase or _split_origen(r["origen"])[0] == fase)
            and (not malla or _split_origen(r["origen"])[2] == malla)
        ]
    baseline = _equipment_baseline(baseline_rows)

    # Ventana de evaluacion: el turno/fecha pedido, o el turno vigente si no
    # se especifica nada (ultimos 2 dias para cubrir el cruce de medianoche).
    eval_cutoff = fecha if fecha else (datetime.now() - timedelta(days=2)).date().isoformat()
    eval_rows = query_rows(
        f"SELECT caex_id, camion_modelo, carguio_id, datetime, origen, turno FROM ciclos WHERE fecha >= ?{extra_sql}",
        (eval_cutoff, *extra_params),
    )
    if turno:
        eval_rows = [r for r in eval_rows if r["turno"] == turno]
    if fase or malla:
        eval_rows = [
            r for r in eval_rows
            if (not fase or _split_origen(r["origen"])[0] == fase)
            and (not malla or _split_origen(r["origen"])[2] == malla)
        ]

    by_equipo: dict[str, list[dict[str, Any]]] = {}
    for row in eval_rows:
        if row["caex_id"] and row["datetime"]:
            by_equipo.setdefault(row["caex_id"], []).append(row)

    now = datetime.now()
    evaluando_historico = bool(fecha)
    anomalias: list[dict[str, Any]] = []
    for equipo, rows in by_equipo.items():
        base = baseline.get(equipo)
        if not base:
            continue
        rows.sort(key=lambda r: r["datetime"])
        timestamps = [datetime.fromisoformat(r["datetime"]) for r in rows]

        # Gaps cerrados dentro de la ventana evaluada.
        for previo, actual, row in zip(timestamps, timestamps[1:], rows[1:]):
            gap_min = (actual - previo).total_seconds() / 60
            if 0 < gap_min <= _MAX_GAP_FOR_BASELINE_MIN and gap_min > base["umbral_min"]:
                anomalias.append({
                    "equipment_id": equipo,
                    "model": row.get("camion_modelo"),
                    "carguio_id": row.get("carguio_id"),
                    "tipo": "gap_cerrado",
                    "inicio": previo.isoformat(timespec="minutes"),
                    "fin": actual.isoformat(timespec="minutes"),
                    "gap_min": round(gap_min, 1),
                    "esperado_min": base["mediana_min"],
                    "umbral_min": base["umbral_min"],
                    "severidad": "CRITICA" if gap_min > base["umbral_min"] * 1.6 else "ALTA",
                })

        # Gap abierto: solo tiene sentido si estamos evaluando "ahora" (sin
        # fecha historica especifica) - el ultimo ciclo del equipo vs el
        # presente.
        if not evaluando_historico:
            ultimo = timestamps[-1]
            gap_abierto_min = (now - ultimo).total_seconds() / 60
            if 0 < gap_abierto_min <= _MAX_GAP_FOR_BASELINE_MIN * 2 and gap_abierto_min > base["umbral_min"]:
                anomalias.append({
                    "equipment_id": equipo,
                    "model": rows[-1].get("camion_modelo"),
                    "carguio_id": rows[-1].get("carguio_id"),
                    "tipo": "gap_abierto",
                    "inicio": ultimo.isoformat(timespec="minutes"),
                    "fin": None,
                    "gap_min": round(gap_abierto_min, 1),
                    "esperado_min": base["mediana_min"],
                    "umbral_min": base["umbral_min"],
                    "severidad": "CRITICA" if gap_abierto_min > base["umbral_min"] * 1.6 else "ALTA",
                })

    anomalias.sort(key=lambda a: a["gap_min"], reverse=True)
    return {
        "source": "cycle_gap_baseline",
        "fecha": fecha,
        "turno": turno,
        "modo": "historico" if evaluando_historico else "en_vivo",
        "equipos_con_baseline": len(baseline),
        "anomalias": anomalias[:40],
        "nota": (
            "El 'ciclo' medido es el tiempo entre descargas consecutivas del mismo CAEX (no el desglose fino "
            "carga/viaje/descarga, que WENCO no expone para historizar). El umbral es propio de cada equipo "
            "(mediana + desviacion robusta de sus propios gaps recientes), no un numero generico de flota."
        ),
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }
