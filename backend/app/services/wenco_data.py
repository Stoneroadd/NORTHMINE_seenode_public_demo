"""
NORTHMINE - Conector de datos reales WENCO SQL Server.
Unico proveedor del dataset operacional (el modo demo fue eliminado).
"""

from __future__ import annotations

import calendar
import ast
import logging
import os
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

try:
    import pyodbc
except ImportError:  # pragma: no cover - optional in public demo mode
    pyodbc = None

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def month_plan(year: int, month: int) -> list[dict[str, Any]]:
    """Meta mensual de produccion, configurable via NORTHMINE_MONTHLY_TARGET_TONS.

    WENCO no tiene una fuente confiable de meta mensual (tablas vacias o
    desactualizadas hace mas de un ano - ver docs/DIAGNOSTICO_ARQUITECTURA_2026-07.md).
    Sin la env var configurada, no hay plan (lista vacia): los consumidores
    (kpis.py) deben mostrar "sin meta configurada" en vez de inventar un numero.
    """
    settings = get_settings()
    target = settings.monthly_target_tons
    if not target:
        return []
    days = calendar.monthrange(year, month)[1]
    daily = round(target / days)
    return [
        {"date": date(year, month, day).isoformat(), "plan_tons": daily}
        for day in range(1, days + 1)
    ]

FLEET_TYPES = {
    "789D": {"capacidad": 190, "t_ciclo": 220},
    "793D": {"capacidad": 220, "t_ciclo": 210},
    "793F": {"capacidad": 220, "t_ciclo": 200},
    "980E-5": {"capacidad": 380, "t_ciclo": 230},
}


def _streamlit_db_config() -> dict[str, str]:
    """Lee la configuracion WENCO ya usada por Streamlit, si existe localmente.

    Es un puente de paridad local: evita copiar credenciales a NORTHREACT y
    permite que ambos proyectos apunten al mismo WENCO mientras se extrae un
    paquete comun definitivo.

    No importamos northmine_db.py directamente porque ese modulo carga pandas y
    otras dependencias de Streamlit que no pertenecen al backend FastAPI.
    """
    configured_path = os.getenv("NORTHMINE_STREAMLIT_PATH", "").strip()
    repo_root = Path(__file__).resolve().parents[3]
    candidate_roots = [Path(configured_path)] if configured_path else []
    candidate_roots.append(repo_root.parent / "streamlit")
    module_path = next((root / "northmine_db.py" for root in candidate_roots if (root / "northmine_db.py").exists()), None)
    if module_path is None:
        return {}
    try:
        tree = ast.parse(module_path.read_text(encoding="utf-8"))
    except Exception:
        logger.warning("No se pudo leer DB_CONFIG desde %s", module_path, exc_info=True)
        return {}

    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        if not any(isinstance(target, ast.Name) and target.id == "DB_CONFIG" for target in node.targets):
            continue
        try:
            config = ast.literal_eval(node.value)
        except Exception:
            logger.warning("DB_CONFIG en %s no es literal evaluable", module_path, exc_info=True)
            return {}
        return config if isinstance(config, dict) else {}

    return {}


def _connection_config() -> dict[str, str]:
    settings = get_settings()
    # Puente de conveniencia SOLO para desarrollo local (ver docstring de
    # _streamlit_db_config). Nunca se consulta en produccion: ahi, credenciales
    # SQL faltantes deben fallar explicito, no resolverse leyendo el codigo
    # fuente de un proyecto legado sin vetar.
    streamlit_config = {} if settings.is_production else _streamlit_db_config()
    if streamlit_config:
        logger.warning(
            "Usando credenciales SQL leidas de streamlit/northmine_db.py (fallback de "
            "desarrollo) porque NORTHMINE_SQL_* no esta configurado. No usar en produccion."
        )
    return {
        "server": settings.sql_server or streamlit_config.get("server", ""),
        "database": settings.sql_db or streamlit_config.get("database", "WENCO"),
        "user": settings.sql_user or streamlit_config.get("user", ""),
        "password": settings.sql_password or streamlit_config.get("password", ""),
        "driver": os.getenv("NORTHMINE_SQL_DRIVER", streamlit_config.get("driver", "ODBC Driver 17 for SQL Server")),
        # Certificate validation is mandatory in production. A temporary
        # development exception is explicit and never inherited from a legacy
        # Streamlit configuration.
        "trust_server_certificate": "yes" if (not settings.is_production and settings.sql_trust_server_certificate) else "no",
    }


def _connection_string(config: dict[str, str]) -> str:
    """Build an encrypted, certificate-validating SQL Server connection."""
    return (
        f"DRIVER={{{config['driver']}}};"
        f"SERVER={config['server']},1433;"
        f"DATABASE={config['database']};"
        f"UID={config['user']};"
        f"PWD={config['password']};"
        "Encrypt=yes;"
        f"TrustServerCertificate={config['trust_server_certificate']};"
    )


def _get_connection():
    if pyodbc is None:
        raise RuntimeError("pyodbc is not installed; real WENCO/SQL mode requires the SQL Server ODBC dependency.")
    config = _connection_config()
    missing = [key for key in ("server", "database", "user", "password") if not config.get(key)]
    if missing:
        raise RuntimeError(
            "Configuracion WENCO incompleta para modo REAL: "
            + ", ".join(f"NORTHMINE_SQL_{key.upper()}" for key in missing)
        )
    conn = pyodbc.connect(_connection_string(config), timeout=15)
    # La coleccion de este WENCO guarda varchar en cp1252 (texto en espanol
    # con tildes/enies), no utf-8. Sin esto, pyodbc decodifica SQL_CHAR como
    # utf-8 por defecto y las tildes salen como el caracter de reemplazo
    # (confirmado con evidencia real: "Averï¿½a"/"Camiï¿½n" en STATUS_DESC).
    conn.setdecoding(pyodbc.SQL_CHAR, encoding="cp1252")
    conn.setdecoding(pyodbc.SQL_WCHAR, encoding="utf-16le")
    conn.setencoding(encoding="utf-8")
    return conn


def _fase_from_destino(destino: str) -> str:
    d = (destino or "").upper()
    if "CHANCADO" in d:
        return "CHANCADO"
    if "F02" in d:
        return "F02"
    return "F01"


def _guess_modelo(caex_id: str) -> str:
    """Fallback cuando el equipo no aparece en EQUIP (no catalogado en WENCO).

    El modelo real viene de un LEFT JOIN contra EQUIP.MODEL_NUMBER en la query
    principal (ver get_wenco_dataset). Este placeholder solo se usa si ese
    join no encuentra match para el HAULING_UNIT_IDENT del ciclo.
    """
    return "789D"


def get_wenco_dataset(today_iso: str | None = None, dias: int = 2) -> dict[str, Any]:
    """
    Dataset operacional real, unico proveedor (get_dataset() en data_provider.py).
    Trae ciclos reales desde HAUL_CYCLE_TRANS para el rango de dias indicado.
    dias=2 por defecto para cubrir turno noche que cruza medianoche.
    """
    today = date.fromisoformat(today_iso) if today_iso else date.today()
    plan = month_plan(today.year, today.month)

    query = """
        SELECT
            h.HAUL_CYCLE_REC_IDENT,
            h.START_TIMESTAMP,
            h.DUMP_END_SHIFT_DATE,
            h.DUMP_END_SHIFT_IDENT,
            h.HAULING_UNIT_IDENT,
            h.LOADING_UNIT_IDENT,
            h.LOAD_LOCATION_SNAME,
            h.BLOCK_SNAME,
            h.DUMP_LOCATION_SNAME,
            h.MATERIAL_IDENT,
            CASE
                WHEN e.EQMODEL_CODE LIKE 'CAT793%' THEN 220
                WHEN e.EQMODEL_CODE LIKE 'KOM980%' THEN 380
                WHEN e.EQMODEL_CODE LIKE 'KOM830%' THEN 220
                WHEN e.EQMODEL_CODE LIKE 'CAT789D' THEN 190
                ELSE COALESCE(h.QUANTITY_REPORTING, 0)
            END AS TONELAJE_PARIDAD,
            h.LOAD_START_TIMESTAMP,
            CASE
                WHEN dbo.ARE_TIMESTAMPS_IN_DST(h.DUMP_END_SHIFT_DATE, h.DUMP_END_SHIFT_DATE) = 1
                    THEN DATEADD(HOUR, 1, h.DUMP_END_TIMESTAMP)
                ELSE h.DUMP_END_TIMESTAMP
            END AS DUMP_END_TS_PARIDAD,
            h.HAUL_DISTANCE,
            h.EMPTY_DISTANCE,
            h.PAYLOAD_TARGET,
            e.EQMODEL_CODE,
            ee.EQMODEL_CODE,
            h.HAULING_UNIT_BADGE_IDENT,
            h.LOADING_UNIT_BADGE_IDENT,
            op_haul.BADGE_NAME,
            op_load.BADGE_NAME
        FROM HAUL_CYCLE_TRANS h
        INNER JOIN EQUIP e ON e.EQUIP_IDENT = h.HAULING_UNIT_IDENT
        INNER JOIN EQUIP ee ON ee.EQUIP_IDENT = h.LOADING_UNIT_IDENT
        LEFT JOIN DM_OPERATORS op_haul ON op_haul.BADGE_IDENT = h.HAULING_UNIT_BADGE_IDENT
        LEFT JOIN DM_OPERATORS op_load ON op_load.BADGE_IDENT = h.LOADING_UNIT_BADGE_IDENT
        WHERE h.DUMP_END_SHIFT_DATE >= ?
          AND h.DUMP_END_TIMESTAMP IS NOT NULL
        ORDER BY DUMP_END_TS_PARIDAD
    """
    status_query = """
        SELECT r.equip_ident, r.status_code, sc.STATUS_DESC, r.start_timestamp, r.end_timestamp
        FROM EQUIP_STATUS_TRANS r
        LEFT JOIN EQUIP_STATUS_CODE sc ON sc.STATUS_CODE = r.status_code
        WHERE r.shift_date >= ?
          AND r.status_code IS NOT NULL
          AND r.start_timestamp IS NOT NULL
        ORDER BY r.start_timestamp
    """
    desde = today - timedelta(days=dias - 1)

    cycles: list[dict[str, Any]] = []
    loader_status_durations: list[dict[str, Any]] = []
    try:
        with _get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, [desde])
            for row in cursor.fetchall():
                (rec_id, start_ts, shift_date, shift_ident, caex_id,
                 carguio_id, load_location, block_name, destino, material, tonelaje,
                 load_start_ts, dump_end_ts, haul_distance, empty_distance,
                 payload_target, truck_model, loader_model, hauling_badge, loading_badge,
                 hauler_name, loader_name) = row

                if dump_end_ts is None or tonelaje is None:
                    continue

                turno_calc = "DIA" if str(shift_ident) == "1" else "NOCHE"
                modelo = truck_model.strip() if truck_model and truck_model.strip() else _guess_modelo(caex_id)
                pala_modelo = loader_model.strip() if loader_model and loader_model.strip() else "N/D"
                if load_location and block_name:
                    origen = f"{load_location}/{block_name}"
                else:
                    origen = load_location or "Origen No Definido"

                # Tiempos derivados de los 3 timestamps disponibles (start, load_start,
                # dump_end). WENCO no expone aqui el quiebre fino (espera pala, carguio,
                # espera bota, descarga) que si tiene el contrato canonico de NORTHMINE
                # (Streamlit) - solo estos dos tramos agregados por ahora.
                tiempo_vacio_min = round((load_start_ts - start_ts).total_seconds() / 60, 1) if load_start_ts else None
                tiempo_cargado_min = round((dump_end_ts - load_start_ts).total_seconds() / 60, 1) if load_start_ts and dump_end_ts else None

                cycles.append({
                    "id": f"WENCO-{int(rec_id)}",
                    "datetime": dump_end_ts.isoformat(timespec="minutes"),
                    "start_datetime": start_ts.isoformat(timespec="minutes") if start_ts else None,
                    "shift_date": shift_date.date().isoformat() if shift_date else None,
                    "shift_ident": str(shift_ident) if shift_ident is not None else None,
                    "fecha_dia": dump_end_ts.date().isoformat(),
                    "turno_calc": turno_calc,
                    "hora": dump_end_ts.hour,
                    "caex_id": caex_id,
                    "camion_modelo": modelo,
                    "carguio_id": carguio_id,
                    "pala_modelo": pala_modelo,
                    "material": material or "N/D",
                    "origen": origen or "N/D",
                    "destino": destino or "N/D",
                    "fase": _fase_from_destino(destino),
                    "tonelaje": int(tonelaje),
                    "viajes": 1,
                    "payload_target": float(payload_target) if payload_target is not None else None,
                    "haul_distance_km": float(haul_distance) if haul_distance is not None else None,
                    "empty_distance_km": float(empty_distance) if empty_distance is not None else None,
                    # HU-11.4: operador real via badge (HAULING_UNIT_BADGE_IDENT/
                    # LOADING_UNIT_BADGE_IDENT -> DM_OPERATORS.BADGE_NAME). None si
                    # el badge no tiene match o el ciclo no trae badge - nunca se
                    # inventa un nombre.
                    "operador_caex": hauler_name.strip() if hauler_name and hauler_name.strip() else None,
                    "operador_pala": loader_name.strip() if loader_name and loader_name.strip() else None,
                    "operador_caex_badge": hauling_badge or None,
                    "operador_pala_badge": loading_badge or None,
                    "tiempo_vacio_min": tiempo_vacio_min,
                    "tiempo_cargado_min": tiempo_cargado_min,
                })
            cursor.execute(status_query, [desde])
            for equip_ident, status_code, status_desc, start_ts, end_ts in cursor.fetchall():
                if not equip_ident or not start_ts:
                    continue
                loader_status_durations.append(
                    {
                        "loader_id": str(equip_ident).strip(),
                        "status_code": str(status_code or "").strip(),
                        "status_desc": (status_desc or status_code or "").strip() or None,
                        "start_timestamp": start_ts.isoformat(timespec="minutes"),
                        "end_timestamp": end_ts.isoformat(timespec="minutes") if end_ts else None,
                    }
                )
        logger.info(f"WENCO: {len(cycles)} ciclos reales cargados desde {desde}")
    except Exception as e:
        logger.error(f"WENCO connection error: {e}")
        raise

    return {
        "source": "wenco-sql-live",
        "today": today.isoformat(),
        "plan": plan,
        "cycles": cycles,
        "loader_status_durations": loader_status_durations,
    }


def get_wenco_fleet_full(dias: int = 7) -> dict[str, Any]:
    """
    Ranking de flota real (get_fleet_full() en data_provider.py).
    Agrega ciclos reales por camion para armar el ranking de flota.
    """
    dataset = get_wenco_dataset(dias=dias)
    cycles = dataset["cycles"]

    por_caex: dict[str, dict[str, Any]] = {}
    for c in cycles:
        cid = c["caex_id"]
        if cid not in por_caex:
            por_caex[cid] = {
                "caex_id": cid,
                "modelo": c["camion_modelo"],
                "toneladas": 0,
                "ciclos": 0,
                "payload_targets": [],
            }
        por_caex[cid]["toneladas"] += c["tonelaje"]
        por_caex[cid]["ciclos"] += 1
        if c.get("payload_target"):
            por_caex[cid]["payload_targets"].append(c["payload_target"])

    ranking = []
    for item in por_caex.values():
        modelo = item["modelo"]
        perfil = FLEET_TYPES.get(modelo, {"capacidad": 190, "t_ciclo": 220})
        # Capacidad real: PAYLOAD_TARGET viene de la config de despacho de WENCO
        # por camion (no por modelo generico) - mas preciso que FLEET_TYPES.
        # FLEET_TYPES queda como fallback si el ciclo no trae PAYLOAD_TARGET.
        payload_targets = item["payload_targets"]
        capacidad = round(sum(payload_targets) / len(payload_targets), 1) if payload_targets else perfil["capacidad"]
        tiempo_ciclo = round(perfil["t_ciclo"] / 10, 1)
        tph = round(item["toneladas"] / max(dias * 12, 1), 1)
        ranking.append({
            "caex_id": item["caex_id"],
            "modelo": modelo,
            "capacidad": capacidad,
            "toneladas": item["toneladas"],
            "ciclos": item["ciclos"],
            "tph": tph,
            "eficiencia_pct": 0.0,
            "estado": "ACTIVO" if item["ciclos"] > 0 else "SIN ACTIVIDAD",
            "prom_ciclo": round(item["toneladas"] / max(item["ciclos"], 1), 1),
            "tiempo_ciclo_min": tiempo_ciclo,
        })

    ranking = sorted(ranking, key=lambda x: x["toneladas"], reverse=True)
    for index, item in enumerate(ranking):
        item["rank"] = index + 1

    estado_flota = {
        "activo": sum(1 for i in ranking if i["estado"] == "ACTIVO"),
        "sin_actividad": sum(1 for i in ranking if i["estado"] == "SIN ACTIVIDAD"),
        "mantencion": 0,
        "demora": 0,
    }

    por_modelo = []
    for modelo, perfil in FLEET_TYPES.items():
        rows = [r for r in ranking if r["modelo"] == modelo]
        if not rows:
            continue
        best = max(rows, key=lambda x: x["toneladas"])
        por_modelo.append({
            "modelo": modelo,
            "equipos": len(rows),
            "eficiencia_pct": 0.0,
            "ciclos_hora": 0.0,
            "t_ciclo_nominal": perfil["capacidad"],
            "t_ciclo_real": perfil["t_ciclo"],
            "mejor_caex": best["caex_id"],
        })

    total_ton = sum(r["toneladas"] for r in ranking)
    total_ciclos = sum(r["ciclos"] for r in ranking)

    return {
        "source": "wenco-sql-live",
        "dias": dias,
        "resumen": {
            "total_caex": len(ranking),
            "disponibilidad": 0.0,
            "prom_ciclo": round(total_ton / max(total_ciclos, 1), 1),
            "ciclos_hora": 0.0,
        },
        "ranking": ranking,
        "por_modelo": por_modelo,
        "estado_flota": estado_flota,
    }


STATUS_CATEGORY_BY_PREFIX = {
    "N": "PRODUCTIVO",
    "M": "MANTENCION",
    "O": "DEMORA_OPERACIONAL",
    "S": "STANDBY",
}


def _status_category(status_code: str | None) -> str:
    """Categoria real de un status_code de WENCO, por prefijo de letra.

    Confirmado con evidencia SQL 2026-07-04 (ver docs/DIAGNOSTICO_ARQUITECTURA_2026-07.md,
    HU-11.3): N=ciclo operacional normal, M=mantencion/averia,
    O=demora operacional/administrativa, S=standby. Agrupacion aprobada
    explicitamente por el usuario tras revisar los 48 codigos activos reales.
    """
    prefix = (status_code or "").strip()[:1].upper()
    return STATUS_CATEGORY_BY_PREFIX.get(prefix, "SIN_DATO")


def get_equipment_status(dias: int = 1) -> dict[str, dict[str, Any]]:
    """Ultimo estado real por equipo, desde EQUIP_STATUS_TRANS + EQUIP_STATUS_CODE.

    Devuelve, por equip_ident, el registro de estado mas reciente dentro de
    la ventana de dias pedida (status_code, descripcion real en espanol,
    categoria N/M/O/S, y si sigue abierto - end_timestamp None).
    """
    query = """
        WITH ranked AS (
            SELECT equip_ident, status_code, start_timestamp, end_timestamp,
                   ROW_NUMBER() OVER (PARTITION BY equip_ident ORDER BY start_timestamp DESC) AS rn
            FROM EQUIP_STATUS_TRANS
            WHERE shift_date >= ?
        )
        SELECT r.equip_ident, r.status_code, sc.STATUS_DESC, r.start_timestamp, r.end_timestamp
        FROM ranked r
        LEFT JOIN EQUIP_STATUS_CODE sc ON sc.STATUS_CODE = r.status_code
        WHERE r.rn = 1
    """
    desde = date.today() - timedelta(days=dias - 1)
    result: dict[str, dict[str, Any]] = {}
    try:
        with _get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, [desde])
            for equip_ident, status_code, status_desc, start_ts, end_ts in cursor.fetchall():
                if not equip_ident:
                    continue
                result[equip_ident] = {
                    "status_code": status_code,
                    "status_desc": (status_desc or status_code or "").strip() or None,
                    "category": _status_category(status_code),
                    "start_timestamp": start_ts.isoformat(timespec="minutes") if start_ts else None,
                    "end_timestamp": end_ts.isoformat(timespec="minutes") if end_ts else None,
                }
        logger.info(f"WENCO: estado real cargado para {len(result)} equipos")
    except Exception as e:
        logger.error(f"WENCO equipment status error: {e}")
        raise
    return result


def get_equipment_status_history(dias: int = 7, limit: int = 500) -> list[dict[str, Any]]:
    """Historial real de transiciones MANTENCION/DEMORA por equipo, desde EQUIP_STATUS_TRANS.

    A diferencia de get_equipment_status (que solo trae el estado mas reciente
    por equipo), esta funcion trae todas las transiciones de averia/demora
    dentro de la ventana pedida, para alimentar el historial de averias
    (antes fabricado con random en averias_service.get_breakdown_history).
    """
    query = """
        SELECT TOP (?) r.equip_ident, r.status_code, sc.STATUS_DESC, r.start_timestamp, r.end_timestamp
        FROM EQUIP_STATUS_TRANS r
        LEFT JOIN EQUIP_STATUS_CODE sc ON sc.STATUS_CODE = r.status_code
        WHERE r.shift_date >= ? AND (r.status_code LIKE 'M%' OR r.status_code LIKE 'O%')
        ORDER BY r.start_timestamp DESC
    """
    desde = date.today() - timedelta(days=dias - 1)
    rows: list[dict[str, Any]] = []
    try:
        with _get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, [limit, desde])
            for equip_ident, status_code, status_desc, start_ts, end_ts in cursor.fetchall():
                if not equip_ident:
                    continue
                rows.append(
                    {
                        "equip_ident": equip_ident,
                        "status_code": status_code,
                        "status_desc": (status_desc or status_code or "").strip() or None,
                        "category": _status_category(status_code),
                        "start_timestamp": start_ts.isoformat(timespec="minutes") if start_ts else None,
                        "end_timestamp": end_ts.isoformat(timespec="minutes") if end_ts else None,
                    }
                )
        logger.info(f"WENCO: historial de estado cargado ({len(rows)} transiciones)")
    except Exception as e:
        logger.error(f"WENCO equipment status history error: {e}")
        raise
    return rows

def test_connection() -> dict[str, Any]:
    """Prueba de conectividad simple, para diagnostico."""
    settings = get_settings()
    result = {
        "sql_server": settings.sql_server,
        "sql_db": settings.sql_db,
        "connection_ok": False,
        "error": None,
    }
    try:
        with _get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM HAUL_CYCLE_TRANS WHERE START_SHIFT_DATE >= DATEADD(day, -1, GETDATE())")
            count = cursor.fetchone()[0]
            result["connection_ok"] = True
            result["ciclos_ultimas_24h"] = int(count)
    except Exception as e:
        result["error"] = str(e)
    return result

