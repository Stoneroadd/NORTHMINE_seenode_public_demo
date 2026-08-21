from __future__ import annotations

from enum import Enum
from typing import Any, Mapping


class DataOrigin(str, Enum):
    REAL = "REAL"
    SYNTHETIC = "SYNTHETIC"
    SIMULATED = "SIMULATED"
    REPLAY = "REPLAY"
    UNKNOWN = "UNKNOWN"


class DataRepresentation(str, Enum):
    SOURCE = "SOURCE"
    DERIVED = "DERIVED"


_SYNTHETIC_MARKERS = ("demo", "synthetic", "sintetic")


def resolve_provenance(dataset: Mapping[str, Any]) -> dict[str, Any]:
    """Resolve backend-owned provenance; synthetic evidence overrides REAL."""
    source = str(dataset.get("source") or "unknown").strip()
    source_lower = source.casefold()
    existing = dataset.get("provenance")
    existing_origin = existing.get("origin") if isinstance(existing, Mapping) else None
    legacy = str(dataset.get("data_source") or "").strip().upper()

    if any(marker in source_lower for marker in _SYNTHETIC_MARKERS):
        origin = DataOrigin.SYNTHETIC
    elif existing_origin in {item.value for item in DataOrigin}:
        origin = DataOrigin(str(existing_origin))
    elif legacy in {"DEMO", "SYNTHETIC"}:
        origin = DataOrigin.SYNTHETIC
    elif legacy == "SIMULATED":
        origin = DataOrigin.SIMULATED
    elif legacy == "REPLAY":
        origin = DataOrigin.REPLAY
    elif legacy == "REAL" or source_lower.startswith("wenco-"):
        origin = DataOrigin.REAL
    else:
        origin = DataOrigin.UNKNOWN

    source_system = str(
        (existing.get("source_system") if isinstance(existing, Mapping) else None)
        or dataset.get("source_system")
        or ("WENCO" if origin is DataOrigin.REAL else "NORTHMINE")
    )
    return {
        "origin": origin.value,
        "representation": DataRepresentation.SOURCE.value,
        "source_system": source_system,
        "source_id": source,
        "demo_context": origin in {DataOrigin.SYNTHETIC, DataOrigin.SIMULATED},
    }


def with_provenance(dataset: Mapping[str, Any]) -> dict[str, Any]:
    provenance = resolve_provenance(dataset)
    return {
        **dataset,
        "provenance": provenance,
        "data_source": provenance["origin"],
        "source_system": provenance["source_system"],
        "is_demo": provenance["demo_context"],
    }
