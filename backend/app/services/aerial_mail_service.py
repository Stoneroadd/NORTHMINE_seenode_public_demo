from __future__ import annotations

import email
import hashlib
import imaplib
import json
import os
import re
from datetime import datetime, timedelta
from email.header import decode_header
from pathlib import Path
from typing import Any

from app.services.aerial_service import AERIAL_EXTENSIONS, _root_dir

# Ingesta automatica de ortomosaicos desde Gmail hacia data/aerial:
#   1. Adjuntos directos (.tif/.tiff/.jp2/.ecw/.png/.jpg) de correos recientes.
#   2. Links de Google Drive en el cuerpo del correo (los TIF pesados llegan
#      compartidos por Drive, no como adjunto): se descargan via el endpoint
#      publico uc?export=download, manejando el token de confirmacion de
#      archivos grandes. Requiere que el link sea "cualquiera con el enlace".
# Variables de entorno:
#   NORTHMINE_GMAIL_USER          casilla Gmail (ej: master.robless@gmail.com)
#   NORTHMINE_GMAIL_APP_PASSWORD  app password de Google (requiere 2FA)
#   NORTHMINE_GMAIL_FOLDER        default INBOX
#   NORTHMINE_GMAIL_DAYS          ventana de busqueda, default 14
#   NORTHMINE_GMAIL_SENDER        filtro FROM opcional
#   NORTHMINE_GMAIL_SUBJECT       filtro SUBJECT opcional
#   NORTHMINE_AERIAL_NAME_HINT    default "orto": si el nombre del archivo no
#                                 trae extension aerea reconocible, solo se
#                                 baja si contiene este texto.
#   NORTHMINE_AERIAL_MAX_MB       tope de descarga por archivo, default 4096.

_DEST_DIR = _root_dir() / "data" / "aerial"
_DXF_DEST_DIR = _DEST_DIR / "dxf"
_PIT_SHELL_OUTPUT = _root_dir() / "frontend" / "public" / "pit-shell.json"
_SEEN_PATH = _DEST_DIR / "_gmail_seen.json"
_LOG_PATH = _DEST_DIR / "_gmail_fetch.log"

# Area cuyo DXF alimenta el rajo 3D del mapa mental operacional (CAP-017).
# Las demas areas configuradas se descargan y convierten igual, pero solo
# esta pisa frontend/public/pit-shell.json.
_PIT_SHELL_PRIMARY_AREA = os.getenv("NORTHMINE_PIT_SHELL_AREA", "F1-F2")

_DRIVE_LINK_RE = re.compile(
    r"drive\.google\.com/(?:file/d/|open\?id=|uc\?[^\s\"'<>]*?id=)([\w-]{16,})"
)

_sync_state: dict[str, Any] = {"enabled": False, "interval_min": 0, "last_run": None, "last_result": None}
_auto_started = False


def _log(message: str) -> None:
    _DEST_DIR.mkdir(parents=True, exist_ok=True)
    with _LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(f"{datetime.now().isoformat(timespec='seconds')} {message}\n")


def _load_seen() -> set[str]:
    try:
        return set(json.loads(_SEEN_PATH.read_text(encoding="utf-8")))
    except (OSError, ValueError):
        return set()


def _save_seen(seen: set[str]) -> None:
    _DEST_DIR.mkdir(parents=True, exist_ok=True)
    _SEEN_PATH.write_text(json.dumps(sorted(seen)[-500:]), encoding="utf-8")


def _decode_mime(value: str | None) -> str:
    if not value:
        return ""
    decoded = ""
    for text, charset in decode_header(value):
        if isinstance(text, bytes):
            decoded += text.decode(charset or "utf-8", errors="replace")
        else:
            decoded += text
    return decoded


def _config() -> dict[str, Any]:
    return {
        "host": os.getenv("NORTHMINE_GMAIL_HOST", "imap.gmail.com"),
        "user": os.getenv("NORTHMINE_GMAIL_USER", ""),
        "password": os.getenv("NORTHMINE_GMAIL_APP_PASSWORD", ""),
        "folder": os.getenv("NORTHMINE_GMAIL_FOLDER", "INBOX"),
        "days": int(os.getenv("NORTHMINE_GMAIL_DAYS", "14")),
        "sender": os.getenv("NORTHMINE_GMAIL_SENDER", ""),
        "subject": os.getenv("NORTHMINE_GMAIL_SUBJECT", ""),
        "name_hint": os.getenv("NORTHMINE_AERIAL_NAME_HINT", "orto").lower(),
        "max_mb": float(os.getenv("NORTHMINE_AERIAL_MAX_MB", "4096")),
    }


def _wanted_name(filename: str, name_hint: str) -> bool:
    lower = filename.lower()
    if any(lower.endswith(ext) for ext in AERIAL_EXTENSIONS):
        return True
    return bool(name_hint) and name_hint in lower


def _unique_dest(filename: str, dest_dir: Path = _DEST_DIR) -> Path:
    safe = re.sub(r"[^\w.\- ]", "_", filename).strip() or "ortomosaico.tif"
    return dest_dir / safe


def _download_drive_file(
    file_id: str,
    config: dict[str, Any],
    *,
    dest_dir: Path = _DEST_DIR,
    require_aerial_name: bool = True,
) -> dict[str, Any] | None:
    import requests

    session = requests.Session()
    url = "https://drive.google.com/uc"
    params: dict[str, str] = {"export": "download", "id": file_id}
    response = session.get(url, params=params, stream=True, timeout=60)
    # Archivos grandes: Google intercala una pagina de confirmacion (virus scan).
    if "text/html" in response.headers.get("Content-Type", ""):
        token = None
        for key, value in response.cookies.items():
            if key.startswith("download_warning"):
                token = value
                break
        if token is None:
            match = re.search(r'name="confirm"\s+value="([^"]+)"', response.text)
            token = match.group(1) if match else None
            uuid_match = re.search(r'name="uuid"\s+value="([^"]+)"', response.text)
            if token:
                params["confirm"] = token
                if uuid_match:
                    params["uuid"] = uuid_match.group(1)
                response = session.get(
                    "https://drive.usercontent.google.com/download", params=params, stream=True, timeout=60,
                )
        else:
            params["confirm"] = token
            response = session.get(url, params=params, stream=True, timeout=60)
    if "text/html" in response.headers.get("Content-Type", ""):
        _log(f"DRIVE {file_id}: sin acceso publico (requiere permiso 'cualquiera con el enlace')")
        return None

    disposition = response.headers.get("Content-Disposition", "")
    name_match = re.search(r'filename="([^"]+)"', disposition)
    filename = name_match.group(1) if name_match else f"drive_{file_id}.tif"
    if require_aerial_name and not _wanted_name(filename, config["name_hint"]):
        _log(f"DRIVE {file_id}: '{filename}' no parece ortomosaico, omitido")
        return None

    dest = _unique_dest(filename, dest_dir)
    expected = int(response.headers.get("Content-Length") or 0)
    if expected and expected / (1024 * 1024) > config["max_mb"]:
        _log(f"DRIVE {file_id}: '{filename}' supera el tope de {config['max_mb']} MB, omitido")
        return None
    if dest.exists() and expected and dest.stat().st_size == expected:
        return None  # ya descargado

    dest_dir.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    written = 0
    limit_bytes = config["max_mb"] * 1024 * 1024
    with tmp.open("wb") as handle:
        for chunk in response.iter_content(chunk_size=1024 * 1024):
            if not chunk:
                continue
            handle.write(chunk)
            written += len(chunk)
            if written > limit_bytes:
                handle.close()
                tmp.unlink(missing_ok=True)
                _log(f"DRIVE {file_id}: '{filename}' excedio el tope durante descarga, abortado")
                return None
    tmp.replace(dest)
    _log(f"DRIVE GUARDADO {dest.name} ({round(written / (1024 * 1024), 1)} MB)")
    return {"filename": dest.name, "size_mb": round(written / (1024 * 1024), 2), "origen": "drive"}


def _convert_dxf_to_pit_shell(dxf_path: Path, output: Path, name: str) -> dict[str, Any] | None:
    """Reusa backend/scripts/dxf_to_pit_shell.py (RDP + capas) sin subproceso."""
    import importlib.util

    script_path = _root_dir() / "backend" / "scripts" / "dxf_to_pit_shell.py"
    spec = importlib.util.spec_from_file_location("dxf_to_pit_shell", script_path)
    if spec is None or spec.loader is None:
        _log(f"DXF: no se pudo cargar el conversor en {script_path}")
        return None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    try:
        result = module.convert(dxf_path, layers=None, tolerance=None, max_points=60000, name=name)
    except SystemExit as exc:
        _log(f"DXF {dxf_path.name}: conversion fallo - {exc}")
        return None
    output.parent.mkdir(parents=True, exist_ok=True)
    import json as _json

    output.write_text(_json.dumps(result, separators=(",", ":")), encoding="utf-8")
    _log(f"DXF CONVERTIDO {dxf_path.name} -> {output.name} ({result['polyline_count']} polilineas, {result['point_count']} puntos)")
    return {"polyline_count": result["polyline_count"], "point_count": result["point_count"]}


# --- Carpeta compartida de Google Drive (ruta oficial de los vuelos) --------
# Estructura: raiz -> "07. Julio" -> "20260716" -> "4. Encuentro" ->
# "20260716_AVA_DES_F1-F2_PCP" -> "3. Ortomosaico" -> <archivo>.tif
# La carpeta es publica ("cualquiera con el enlace"), por lo que se navega via
# el endpoint embeddedfolderview sin credenciales.

_DRIVE_FOLDER_ENTRY_RE = re.compile(r'id="entry-([\w-]+)"[\s\S]*?flip-entry-title">([^<]+)<')


def _drive_root_id() -> str:
    return os.getenv("NORTHMINE_DRIVE_ROOT_ID", "1dUwbnl3IPH24n30xD2SXB1lVZc8w_URa")


def _list_drive_folder(folder_id: str) -> list[tuple[str, str]]:
    import requests

    response = requests.get(
        "https://drive.google.com/embeddedfolderview", params={"id": folder_id}, timeout=30,
    )
    response.raise_for_status()
    return [(entry_id, name.strip()) for entry_id, name in _DRIVE_FOLDER_ENTRY_RE.findall(response.text)]


def _find_entry(entries: list[tuple[str, str]], *needles: str) -> tuple[str, str] | None:
    for entry_id, name in entries:
        lower = name.lower()
        if all(needle.lower() in lower for needle in needles):
            return entry_id, name
    return None


def sync_drive() -> dict[str, Any]:
    """Descarga el ortomosaico mas reciente de cada area configurada.

    Areas (NORTHMINE_AERIAL_AREAS, separadas por coma; alternativas de nombre
    con |): por defecto F1-F2 y el botadero 2420/2440. Para cada area recorre
    los dias hacia atras hasta encontrar el levantamiento mas reciente.
    """
    root_id = _drive_root_id()
    if not root_id:
        return {"status": "sin_configurar", "detail": "NORTHMINE_DRIVE_ROOT_ID vacio.", "imported_files": []}
    config = _config()
    lookback = int(os.getenv("NORTHMINE_AERIAL_LOOKBACK_DAYS", "12"))
    areas = [
        area.strip() for area in os.getenv(
            "NORTHMINE_AERIAL_AREAS", "F1-F2,BOT_2420-2440|BOT_2440-2420",
        ).split(",") if area.strip()
    ]
    imported: list[dict[str, Any]] = []
    checked: list[str] = []
    encuentro_cache: dict[str, list[tuple[str, str]] | None] = {}

    def _encuentro_subs(day: Any) -> list[tuple[str, str]] | None:
        key = day.strftime("%Y%m%d")
        if key in encuentro_cache:
            return encuentro_cache[key]
        result: list[tuple[str, str]] | None = None
        month_entry = _find_entry(months, f"{day.month:02d}.")
        if month_entry:
            day_entry = _find_entry(_list_drive_folder(month_entry[0]), key)
            if day_entry:
                encuentro = _find_entry(_list_drive_folder(day_entry[0]), "encuentro")
                if encuentro:
                    result = _list_drive_folder(encuentro[0])
        encuentro_cache[key] = result
        return result

    try:
        months = _list_drive_folder(root_id)
        for area in areas:
            alternativas = [alt.strip().lower() for alt in area.split("|") if alt.strip()]
            encontrado = False
            for offset in range(lookback):
                day = datetime.now().date() - timedelta(days=offset)
                subs = _encuentro_subs(day)
                if not subs:
                    continue
                survey = next(
                    (entry for entry in subs if any(alt in entry[1].lower() for alt in alternativas)),
                    None,
                )
                if not survey:
                    continue
                orto_folder = _find_entry(_list_drive_folder(survey[0]), "ortomosaico") or _find_entry(
                    _list_drive_folder(survey[0]), "orto",
                )
                if not orto_folder:
                    checked.append(f"{area} {day.isoformat()}: sin carpeta Ortomosaico")
                    continue
                tif_entries = [
                    (entry_id, name) for entry_id, name in _list_drive_folder(orto_folder[0])
                    if name.lower().endswith((".tif", ".tiff"))
                ]
                if not tif_entries:
                    checked.append(f"{area} {day.isoformat()}: carpeta Ortomosaico vacia")
                    continue
                for entry_id, name in tif_entries:
                    dest = _unique_dest(name)
                    if dest.exists():
                        checked.append(f"{area}: {name} ya descargado ({day.isoformat()})")
                        continue
                    result = _download_drive_file(entry_id, config)
                    if result:
                        imported.append({**result, "fecha_vuelo": day.isoformat(), "area": area, "tipo": "ortomosaico"})
                        try:
                            from app.services.aerial_service import get_or_build_preview

                            get_or_build_preview(result["filename"])
                        except Exception as exc:  # noqa: BLE001 - la preview no bloquea la descarga
                            _log(f"PREVIEW fallo para {result['filename']}: {exc}")

                # DXF del mismo levantamiento: diseño de mina para el rajo 3D.
                dxf_folder = _find_entry(_list_drive_folder(survey[0]), "dxf")
                if not dxf_folder:
                    checked.append(f"{area} {day.isoformat()}: sin carpeta DXF")
                else:
                    dxf_entries = [
                        (entry_id, name) for entry_id, name in _list_drive_folder(dxf_folder[0])
                        if name.lower().endswith(".dxf")
                    ]
                    output = (
                        _PIT_SHELL_OUTPUT if area == _PIT_SHELL_PRIMARY_AREA
                        else _root_dir() / "frontend" / "public" / f"pit-shell-{area.split('|')[0]}.json"
                    )
                    for entry_id, name in dxf_entries:
                        dxf_dest = _unique_dest(name, _DXF_DEST_DIR)
                        just_downloaded = False
                        if not dxf_dest.exists():
                            downloaded = _download_drive_file(
                                entry_id, config, dest_dir=_DXF_DEST_DIR, require_aerial_name=False,
                            )
                            if downloaded is None:
                                checked.append(f"{area} DXF {day.isoformat()}: descarga fallo")
                                continue
                            just_downloaded = True
                            imported.append({**downloaded, "fecha_vuelo": day.isoformat(), "area": area, "tipo": "dxf_mina"})
                        else:
                            checked.append(f"{area}: DXF {name} ya en disco ({day.isoformat()})")

                        if just_downloaded or not output.exists():
                            converted = _convert_dxf_to_pit_shell(dxf_dest, output, name=f"Rajo {area} {day.isoformat()}")
                            if converted:
                                imported.append({
                                    "filename": output.name, "size_mb": 0, "origen": "dxf_conversion",
                                    "area": area, "tipo": "pit_shell", **converted,
                                })

                # El dia mas reciente con este levantamiento manda.
                encontrado = True
                break
            if not encontrado:
                checked.append(f"{area}: sin levantamiento en los ultimos {lookback} dias")
    except Exception as exc:  # noqa: BLE001
        return {"status": "error", "detail": f"Drive: {exc}", "imported_files": imported, "checked": checked}
    return {"status": "ok", "imported_files": imported, "checked": checked}


def sync_gmail() -> dict[str, Any]:
    config = _config()
    if not config["user"] or not config["password"]:
        return {
            "status": "sin_configurar",
            "detail": "Define NORTHMINE_GMAIL_USER y NORTHMINE_GMAIL_APP_PASSWORD en backend/.env.",
            "imported_files": [],
        }
    since = (datetime.now() - timedelta(days=config["days"])).strftime("%d-%b-%Y")
    criteria = [f'(SINCE "{since}")']
    if config["sender"]:
        criteria.append(f'(FROM "{config["sender"]}")')
    if config["subject"]:
        criteria.append(f'(SUBJECT "{config["subject"]}")')

    imported: list[dict[str, Any]] = []
    errors: list[str] = []
    seen = _load_seen()
    try:
        mail = imaplib.IMAP4_SSL(config["host"])
        mail.login(config["user"], config["password"])
        mail.select(config["folder"], readonly=True)
        status, data = mail.search(None, *criteria)
        message_ids = data[0].split() if status == "OK" and data and data[0] else []
        for message_id in message_ids[-80:]:
            status, msg_data = mail.fetch(message_id, "(RFC822)")
            if status != "OK" or not msg_data or not msg_data[0]:
                continue
            message = email.message_from_bytes(msg_data[0][1])
            mail_uid = _decode_mime(message.get("Message-ID")) or message_id.decode()
            log_id = hashlib.sha1(mail_uid.encode()).hexdigest()
            if log_id in seen:
                continue
            subject = _decode_mime(message.get("Subject"))
            drive_ids: set[str] = set()
            for part in message.walk():
                filename = _decode_mime(part.get_filename())
                if filename and _wanted_name(filename, config["name_hint"]):
                    payload = part.get_payload(decode=True)
                    if payload:
                        dest = _unique_dest(filename)
                        if not dest.exists() or dest.stat().st_size != len(payload):
                            _DEST_DIR.mkdir(parents=True, exist_ok=True)
                            dest.write_bytes(payload)
                            imported.append({
                                "filename": dest.name,
                                "size_mb": round(len(payload) / (1024 * 1024), 2),
                                "origen": "adjunto",
                                "subject": subject,
                            })
                            _log(f"ADJUNTO GUARDADO {dest.name} (correo '{subject}')")
                    continue
                if part.get_content_type() in ("text/plain", "text/html"):
                    body = part.get_payload(decode=True)
                    if body:
                        text = body.decode(part.get_content_charset() or "utf-8", errors="replace")
                        drive_ids.update(_DRIVE_LINK_RE.findall(text))
            for file_id in drive_ids:
                try:
                    result = _download_drive_file(file_id, config)
                    if result:
                        imported.append({**result, "subject": subject})
                except Exception as exc:  # noqa: BLE001
                    errors.append(f"drive {file_id}: {exc}")
            seen.add(log_id)
        mail.logout()
        _save_seen(seen)
    except imaplib.IMAP4.error as exc:
        return {
            "status": "error",
            "detail": (
                f"Gmail IMAP fallo: {exc}. Verifica el app password "
                "(myaccount.google.com/apppasswords, requiere verificacion en 2 pasos)."
            ),
            "imported_files": imported,
            "errors": errors,
        }
    except OSError as exc:
        return {"status": "error", "detail": f"Sin conexion a {config['host']}: {exc}", "imported_files": imported}
    return {"status": "ok", "imported_files": imported, "errors": errors}


def sync_all_sources() -> dict[str, Any]:
    """Drive oficial primero; Gmail solo si esta configurado."""
    drive_result = sync_drive()
    config = _config()
    mail_result = (
        sync_gmail() if config["user"] and config["password"]
        else {"status": "sin_configurar", "imported_files": []}
    )
    return {
        "drive": drive_result,
        "mail": mail_result,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }


def get_sync_status() -> dict[str, Any]:
    config = _config()
    return {
        "drive_configured": bool(_drive_root_id()),
        "drive_root_id": _drive_root_id() or None,
        "gmail_configured": bool(config["user"] and config["password"]),
        "gmail_user": config["user"] or None,
        "gmail_sender_filter": config["sender"] or None,
        "name_hint": config["name_hint"],
        "dest_dir_exists": _DEST_DIR.is_dir(),
        "auto_sync": dict(_sync_state),
    }


def _auto_loop(interval_seconds: float) -> None:
    import time

    while True:
        try:
            result = sync_all_sources()
            drive_files = len(result["drive"].get("imported_files", []))
            mail_files = len(result["mail"].get("imported_files", []))
            _sync_state["last_run"] = datetime.now().isoformat(timespec="seconds")
            _sync_state["last_result"] = f"drive: {drive_files} archivos, mail: {result['mail'].get('status') if not mail_files else f'{mail_files} archivos'}"
        except Exception as exc:  # noqa: BLE001 - el loop no debe morir
            _sync_state["last_run"] = datetime.now().isoformat(timespec="seconds")
            _sync_state["last_result"] = f"error: {exc}"
        time.sleep(interval_seconds)


def start_auto_sync() -> None:
    global _auto_started
    if _auto_started:
        return
    interval_min = float(os.getenv("NORTHMINE_AERIAL_SYNC_MINUTES", "30"))
    if interval_min <= 0:
        return
    import threading

    thread = threading.Thread(target=_auto_loop, args=(interval_min * 60,), daemon=True, name="aerial-gmail-sync")
    thread.start()
    _auto_started = True
    _sync_state["enabled"] = True
    _sync_state["interval_min"] = interval_min
