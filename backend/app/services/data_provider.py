"""Punto unico de resolucion del dataset operacional.

El modo demo fue eliminado (ver docs/DIAGNOSTICO_ARQUITECTURA_2026-07.md,
Epica 1, y el commit "eliminar modo demo"): todo consumidor del dataset
operacional pasa por get_dataset()/get_fleet_full(), que llaman siempre a
wenco_data.py (conector real de WENCO). No reimplementar este acceso en
otro lugar.

HU-2.3 (fallback ante caida de SQL Server): cada llamada exitosa se cachea
en memoria por (fecha, dias). Si wenco_data.py levanta una excepcion (SQL
Server caido, timeout, etc.), se devuelve el ultimo dataset valido para esa
misma combinacion de parametros, marcado con "stale": True, en vez de dejar
propagar un 500 que tumbe el endpoint completo en medio de un turno. Sin
cache previo para esos parametros exactos (ej. arranque en frio, o una
consulta con una ventana de dias nunca pedida antes) no hay nada honesto que
servir, asi que la excepcion se propaga igual que antes.
"""

from __future__ import annotations

import logging
import random
from datetime import date, datetime, time, timedelta
from typing import Any

from app.core.config import get_settings
from app.services.data_provenance import with_provenance
from app.services.wenco_data import get_equipment_status as _get_wenco_equipment_status
from app.services.wenco_data import get_equipment_status_history as _get_wenco_equipment_status_history
from app.services.wenco_data import get_wenco_dataset, get_wenco_fleet_full

logger = logging.getLogger(__name__)

_dataset_cache: dict[tuple[str | None, int], dict[str, Any]] = {}
_fleet_cache: dict[int, dict[str, Any]] = {}
_status_cache: dict[int, dict[str, Any]] = {}
_status_history_cache: dict[int, list[dict[str, Any]]] = {}


def _demo_equipment_status(dias: int = 1) -> dict[str, dict[str, Any]]:
    """Estados ficticios completos para que la demo no dependa de WENCO."""
    selected = date.today()
    base = datetime.combine(selected, time(hour=18, minute=40))
    status: dict[str, dict[str, Any]] = {}
    # Las demoras se presentan con los mismos codigos y categorias WENCO que
    # consume el Cockpit. Asi la demo permite leer la causa operacional, no
    # solo un generico "sin actividad".
    special = {
        "CAEX04": ("DEMORA_OPERACIONAL", "O02", "O02 Colacion", 34),
        "CAEX07": ("STANDBY", "S99", "S99 Standby gestionado", 28),
        "CAEX09": ("MANTENCION", "M30", "M30 Averia sistema hidraulico", 95),
        "CAEX11": ("DEMORA_OPERACIONAL", "O01", "O01 Cambio de Turno", 16),
        "CAEX15": ("DEMORA_OPERACIONAL", "O11", "O11 Combustible", 24),
        "CAEX18": ("DEMORA_OPERACIONAL", "O18", "O18 Espera en Chancado", 42),
        "CAEX21": ("DEMORA_OPERACIONAL", "O16", "O16 Detenido por Combustible", 28),
        "CAEX22": ("DEMORA_OPERACIONAL", "O27", "O27 Falla Operacional", 39),
        "PALA 2": ("DEMORA_OPERACIONAL", "N14", "N14 Pala Esperando CAEX", 31),
    }
    for index in range(1, 25):
        equipment_id = f"CAEX{index:02d}"
        category, code, description, minutes = special.get(equipment_id, ("PRODUCTIVO", "N09", "N09 Produccion General", 0))
        status[equipment_id] = {
            "category": category,
            "status_code": code,
            "status_desc": description,
            "start_timestamp": (base - timedelta(minutes=minutes)).isoformat(timespec="minutes") if minutes else base.isoformat(timespec="minutes"),
        }
    for equipment_id in ("PALA 1", "PALA 2", "PALA 3", "CF 1", "CF 2"):
        category, code, description, minutes = special.get(equipment_id, ("PRODUCTIVO", "O01", "O01 Carguio productivo", 0))
        status[equipment_id] = {
            "category": category,
            "status_code": code,
            "status_desc": description,
            "start_timestamp": (base - timedelta(minutes=minutes)).isoformat(timespec="minutes") if minutes else base.isoformat(timespec="minutes"),
        }
    return status


def _demo_equipment_status_history(dias: int = 7) -> list[dict[str, Any]]:
    selected = date.today()
    events = [
        ("CAEX04", "DEMORA_OPERACIONAL", "O02", "O02 Colacion", 34),
        ("CAEX09", "MANTENCION", "M30", "M30 Averia sistema hidraulico", 95),
        ("CAEX11", "DEMORA_OPERACIONAL", "O01", "O01 Cambio de Turno", 16),
        ("CAEX15", "DEMORA_OPERACIONAL", "O11", "O11 Combustible", 24),
        ("CAEX18", "DEMORA_OPERACIONAL", "O18", "O18 Espera en Chancado", 42),
        ("CAEX21", "DEMORA_OPERACIONAL", "O16", "O16 Detenido por Combustible", 28),
        ("CAEX22", "DEMORA_OPERACIONAL", "O27", "O27 Falla Operacional", 39),
        ("PALA 2", "DEMORA_OPERACIONAL", "N14", "N14 Pala Esperando CAEX", 31),
    ]
    result = []
    for equipment_id, category, code, description, minutes in events:
        end = datetime.combine(selected, time(hour=18, minute=40))
        start = end - timedelta(minutes=minutes)
        result.append({
            "equip_ident": equipment_id,
            "category": category,
            "status_code": code,
            "status_desc": description,
            "start_timestamp": start.isoformat(timespec="minutes"),
            "end_timestamp": end.isoformat(timespec="minutes"),
        })
    return result


def _demo_dataset(fecha: str | None, dias: int) -> dict[str, Any]:
    """Genera turnos reproducibles, pero distintos, para la demo local.

    Cada fecha tiene una semilla propia: repetir una consulta entrega el mismo
    turno (útil para comparar), mientras que día/noche, CAEX, UC y eventos de
    mantención cambian de forma creíble entre jornadas.
    """
    settings = get_settings()
    selected = date.fromisoformat(fecha[:10]) if fecha else date.today()
    start = selected - timedelta(days=max(dias, 1) - 1)
    caex_models = ["CAT789D"] * 8 + ["CAT793F"] * 8 + ["KOM980E-5"] * 8
    loaders = [
        ("PALA 1", "P&H 4100XPC AC"), ("PALA 2", "KOM PC5500"),
        ("PALA 3", "CAT 390F"), ("CF 1", "CAT 995"), ("CF 2", "CAT 994K"),
    ]
    payload_by_model = {"CAT789D": 190, "CAT793F": 220, "KOM980E-5": 360}
    cycles: list[dict[str, Any]] = []
    loader_status_durations: list[dict[str, Any]] = []

    for offset in range((selected - start).days + 1):
        operational_day = start + timedelta(days=offset)
        day_rng = random.Random(settings.demo_seed + operational_day.toordinal() * 17)
        for shift, first_hour, shift_factor in (("DIA", 7, 1.04), ("NOCHE", 19, 0.93)):
            shift_rng = random.Random(settings.demo_seed + operational_day.toordinal() * 101 + (1 if shift == "DIA" else 2))
            unavailable = set(shift_rng.sample(range(24), shift_rng.randint(1, 4)))
            for truck_index, model in enumerate(caex_models, start=1):
                truck_rng = random.Random(settings.demo_seed + operational_day.toordinal() * 1000 + truck_index * 37 + (0 if shift == "DIA" else 1))
                if truck_index - 1 in unavailable:
                    continue
                for slot in range(12):
                    # Cada CAEX realiza 1–2 ciclos/hora; las decisiones tienen
                    # variación por turno, hora, modelo y condición del día.
                    cycle_count = 1 + int(truck_rng.random() < (0.31 if shift == "DIA" else 0.22))
                    for sequence in range(cycle_count):
                        absolute_hour = (first_hour + slot) % 24
                        stamp_day = operational_day + timedelta(days=1 if shift == "NOCHE" and absolute_hour < first_hour else 0)
                        minute = 7 + ((truck_index * 11 + slot * 13 + sequence * 19) % 48)
                        stamp = datetime.combine(stamp_day, time(absolute_hour, minute))
                        loader_id, loader_model = loaders[(truck_index + slot + sequence + (0 if shift == "DIA" else 2)) % len(loaders)]
                        payload = payload_by_model[model] * shift_factor * (0.88 + truck_rng.random() * 0.22)
                        # PALA 1 representa la pala eléctrica P&H 4100XPC de
                        # referencia en el demo: mayor continuidad y aporte
                        # por ciclo para que el reporte muestre una historia
                        # operacional coherente de alto rendimiento.
                        if loader_id == "PALA 1":
                            payload *= 3.10
                        # Un frente con menor continuidad crea valles visibles
                        # en las velas/series, en vez de una línea plana.
                        if slot in {3, 8} and truck_rng.random() < 0.28:
                            payload *= 0.72
                        tonnes = max(120, round(payload))
                        phase = "F01" if (truck_index + slot + offset) % 5 < 3 else "F02"
                        cycles.append({
                            "id": f"DEMO-{operational_day:%Y%m%d}-{shift}-{truck_index:02d}-{slot}-{sequence}",
                            "datetime": stamp.isoformat(timespec="minutes"),
                            "start_datetime": (stamp - timedelta(minutes=27 + (truck_index % 9))).isoformat(timespec="minutes"),
                            "shift_date": operational_day.isoformat(),
                            "fecha_dia": stamp.date().isoformat(),
                            "turno_calc": shift,
                            "hora": absolute_hour,
                            "caex_id": f"CAEX{truck_index:02d}",
                            "camion_modelo": model,
                            "carguio_id": loader_id,
                            "pala_modelo": loader_model,
                            "material": "MINERAL" if phase == "F01" else "ESTERIL",
                            "origen": f"{phase}/{2280 + (truck_index % 5) * 16}/{102 + slot * 3}/DEMO",
                            "destino": "CHANCADO PRIMARIO DEMO" if phase == "F01" else "BOTADERO DEMO",
                            "fase": phase,
                            "tonelaje": tonnes,
                            "viajes": 1,
                            "payload_target": payload_by_model[model],
                            "haul_distance_km": round(2.7 + truck_rng.random() * 2.4, 1),
                            "empty_distance_km": round(2.3 + truck_rng.random() * 1.7, 1),
                            "operador_caex": f"OPERADOR {truck_index:02d}",
                            "operador_pala": f"OPERADOR UC {(truck_index % 5) + 1:02d}",
                            "tiempo_vacio_min": round(7 + truck_rng.random() * 9, 1),
                            "tiempo_cargado_min": round(12 + truck_rng.random() * 11, 1),
                        })
            # Eventos variables en UC: no todos los turnos, ni todas las UC,
            # tienen las mismas demoras o averías.
            for event_index, (loader_id, _) in enumerate(loaders):
                if day_rng.random() < 0.55:
                    duration = day_rng.choice([12, 18, 25, 35, 48, 62])
                    status = day_rng.choice(["N14 Pala Esperando", "O11 Combustible", "M30 Avería", "M20 Mantención"])
                    event_hour = (first_hour + day_rng.randrange(12)) % 24
                    event_day = operational_day + timedelta(days=1 if shift == "NOCHE" and event_hour < first_hour else 0)
                    started = datetime.combine(event_day, time(event_hour, day_rng.randrange(0, 45)))
                    loader_status_durations.append({
                        "loader_id": loader_id,
                        "status_code": status.split()[0],
                        "status_desc": status,
                        "start_timestamp": started.isoformat(timespec="minutes"),
                        "end_timestamp": (started + timedelta(minutes=duration)).isoformat(timespec="minutes"),
                        "duration_minutes": duration,
                        "turno": shift,
                    })
    return with_provenance({
        "source": "northmine-demo-synthetic",
        "today": selected.isoformat(),
        "plan": [],
        "cycles": cycles,
        "loader_status_durations": loader_status_durations,
        "stale": False,
    })


def get_dataset(fecha: str | None = None, dias: int = 2) -> dict[str, Any]:
    if get_settings().is_demo:
        return _demo_dataset(fecha, dias)
    key = (fecha, dias)
    try:
        result = get_wenco_dataset(fecha, dias=dias) if fecha else get_wenco_dataset(dias=dias)
        result = with_provenance({**result, "stale": False})
        _dataset_cache[key] = result
        return result
    except Exception:
        cached = _dataset_cache.get(key)
        if cached is not None:
            logger.warning(
                "WENCO no disponible, devolviendo dataset cacheado (fecha=%s, dias=%s) marcado stale",
                fecha, dias,
            )
            return with_provenance({**cached, "stale": True})
        raise


def get_fleet_full(dias: int = 7, seed: int = 42) -> dict[str, Any]:
    try:
        result = get_wenco_fleet_full(dias=dias)
        result = with_provenance({**result, "stale": False})
        _fleet_cache[dias] = result
        return result
    except Exception:
        cached = _fleet_cache.get(dias)
        if cached is not None:
            logger.warning("WENCO no disponible, devolviendo fleet_full cacheado (dias=%s) marcado stale", dias)
            return with_provenance({**cached, "stale": True})
        raise


def get_equipment_status(dias: int = 1) -> dict[str, dict[str, Any]]:
    """Estado real de equipos (HU-11.3), dato auxiliar - no es el dataset principal.

    Si no hay nada que servir (ni WENCO ni cache), devuelve {} en vez de
    propagar la excepcion: los consumidores (kpis.py::build_fleet_status) ya
    degradan por equipo cuando no encuentran estado real para un caex_id
    puntual, asi que no vale la pena tumbar el endpoint entero por esto.
    """
    if get_settings().is_demo:
        provenance = with_provenance({"source": "northmine-demo-synthetic"})["provenance"]
        return {key: {**value, "provenance": provenance} for key, value in _demo_equipment_status(dias).items()}
    try:
        result = _get_wenco_equipment_status(dias=dias)
        provenance = with_provenance({"source": "wenco-sql-live"})["provenance"]
        result = {key: {**value, "provenance": provenance} for key, value in result.items()}
        _status_cache[dias] = result
        return result
    except Exception:
        cached = _status_cache.get(dias)
        if cached is not None:
            logger.warning("WENCO no disponible, devolviendo estado de equipos cacheado (dias=%s)", dias)
            return cached
        logger.warning("WENCO no disponible y sin cache de estado de equipos (dias=%s)", dias)
        return {}


def get_equipment_status_history(dias: int = 7) -> list[dict[str, Any]]:
    """Historial real de transiciones MANTENCION/DEMORA (ver wenco_data.get_equipment_status_history).

    Mismo criterio de degradacion que get_equipment_status: sin WENCO y sin
    cache, devuelve lista vacia en vez de tumbar el endpoint de historial de averias.
    """
    if get_settings().is_demo:
        provenance = with_provenance({"source": "northmine-demo-synthetic"})["provenance"]
        return [{**item, "provenance": provenance} for item in _demo_equipment_status_history(dias)]
    try:
        result = _get_wenco_equipment_status_history(dias=dias)
        provenance = with_provenance({"source": "wenco-sql-live"})["provenance"]
        result = [{**item, "provenance": provenance} for item in result]
        _status_history_cache[dias] = result
        return result
    except Exception:
        cached = _status_history_cache.get(dias)
        if cached is not None:
            logger.warning("WENCO no disponible, devolviendo historial de estado cacheado (dias=%s)", dias)
            return cached
        logger.warning("WENCO no disponible y sin cache de historial de estado (dias=%s)", dias)
        return []
