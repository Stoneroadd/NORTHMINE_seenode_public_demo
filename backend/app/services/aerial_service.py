from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

AERIAL_EXTENSIONS = {".tif", ".tiff", ".jp2", ".ecw", ".png", ".jpg", ".jpeg"}


def _root_dir() -> Path:
    return Path(__file__).resolve().parents[3]


def _generated_at() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _candidate_dirs() -> list[Path]:
    root = _root_dir()
    return [
        root / "data" / "aerial",
        root / "data" / "aerea",
        root / "assets" / "aerial",
        root / "frontend" / "public" / "assets" / "aerial",
    ]


def _file_metadata(path: Path) -> dict[str, Any]:
    stat = path.stat()
    return {
        "file_name": path.name,
        "extension": path.suffix.lower().lstrip("."),
        "size_mb": round(stat.st_size / (1024 * 1024), 2),
        "updated_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(timespec="seconds"),
        "status": "metadata_only",
    }


def list_available_aerial_files(limit: int = 20) -> dict[str, Any]:
    files: list[dict[str, Any]] = []
    for folder in _candidate_dirs():
        if not folder.exists() or not folder.is_dir():
            continue
        for path in folder.iterdir():
            if path.is_file() and path.suffix.lower() in AERIAL_EXTENSIONS:
                files.append(_file_metadata(path))
    files = sorted(files, key=lambda item: item["updated_at"], reverse=True)[:limit]
    return {"source": "metadata", "count": len(files), "items": files, "generated_at": _generated_at()}


_PREVIEW_DIR_NAME = "_previews"
_PREVIEW_MAX_PX = 3000


def _find_source_file(file_name: str) -> Path | None:
    safe_name = Path(file_name).name  # bloquea path traversal
    for folder in _candidate_dirs():
        candidate = folder / safe_name
        if candidate.is_file() and candidate.suffix.lower() in AERIAL_EXTENSIONS:
            return candidate
    return None


def get_or_build_preview(file_name: str) -> Path | None:
    """JPEG reducido (max 3000 px) del ortomosaico, cacheado junto al TIF.

    Los GeoTIFF de 100+ MB no se pueden renderizar en el navegador; esta
    vista previa es la imagen que muestra el modulo Vista Aerea.
    """
    source = _find_source_file(file_name)
    if source is None:
        return None
    preview_dir = source.parent / _PREVIEW_DIR_NAME
    preview = preview_dir / f"{source.stem}.jpg"
    if preview.is_file() and preview.stat().st_mtime >= source.stat().st_mtime:
        return preview

    from PIL import Image

    Image.MAX_IMAGE_PIXELS = None  # ortomosaicos legitimos superan el limite default
    with Image.open(source) as img:
        img.thumbnail((_PREVIEW_MAX_PX, _PREVIEW_MAX_PX))
        if img.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", img.size, (8, 18, 32))
            rgba = img.convert("RGBA")
            background.paste(rgba, mask=rgba.split()[-1])
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")
        preview_dir.mkdir(parents=True, exist_ok=True)
        tmp = preview.with_suffix(".jpg.part")
        img.save(tmp, "JPEG", quality=84, optimize=True)
        tmp.replace(preview)
    return preview


def get_latest_aerial_status() -> dict[str, Any]:
    files = list_available_aerial_files()
    latest = files["items"][0] if files["items"] else None
    return {
        "source": "metadata",
        "status": "en_validacion" if latest else "sin_ortomosaico",
        "faena": "Rajo DES",
        "latest_file": latest,
        "files_count": files["count"],
        "viewer_status": "metadata_only",
        "heavy_tif_loaded": False,
        "equipment_counts": {
            "palas": 0,
            "caex": 0,
            "botaderos": 0,
        },
        "warnings": ["Ubicacion real de equipos no configurada; no se generan posiciones sinteticas."],
        "generated_at": _generated_at(),
    }
