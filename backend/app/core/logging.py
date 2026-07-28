from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from app.core.config import Settings


def _rotating_handler(path: Path, level: int) -> RotatingFileHandler:
    path.parent.mkdir(parents=True, exist_ok=True)
    handler = RotatingFileHandler(
        path,
        maxBytes=5 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    handler.setLevel(level)
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    )
    return handler


def configure_logging(settings: Settings) -> None:
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    log_dir = Path(settings.log_dir)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    backend_log = str(log_dir / "backend.log")
    if not any(isinstance(h, RotatingFileHandler) and h.baseFilename == backend_log for h in root_logger.handlers):
        root_logger.addHandler(_rotating_handler(log_dir / "backend.log", level))

    security_logger = logging.getLogger("northmine.security")
    security_logger.setLevel(level)
    security_log = str(log_dir / "security.log")
    if not any(isinstance(h, RotatingFileHandler) and h.baseFilename == security_log for h in security_logger.handlers):
        security_logger.addHandler(_rotating_handler(log_dir / "security.log", level))

    audit_logger = logging.getLogger("northmine.audit")
    audit_logger.setLevel(level)
    audit_log = str(log_dir / "audit.log")
    if not any(isinstance(h, RotatingFileHandler) and h.baseFilename == audit_log for h in audit_logger.handlers):
        audit_logger.addHandler(_rotating_handler(log_dir / "audit.log", level))
