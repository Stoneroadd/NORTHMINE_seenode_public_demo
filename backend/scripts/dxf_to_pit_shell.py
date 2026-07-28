"""Convierte un DXF de diseño de rajo a pit-shell.json para el mapa mental 3D.

El mapa 3D (CAP-017) busca `frontend/public/pit-shell.json`; si no existe usa
un rajo sintetico. Este script genera ese JSON desde el DXF real exportado de
Vulcan / Datamine / Minesight (polilineas de cresta, pata, rampas, fases).

Requiere ezdxf (solo para ejecutar este script, no es dependencia del backend):

    pip install ezdxf

Uso tipico:

    python backend/scripts/dxf_to_pit_shell.py disenio_rajo.dxf
    python backend/scripts/dxf_to_pit_shell.py rajo.dxf --layers CRESTA,PATA,RAMPA
    python backend/scripts/dxf_to_pit_shell.py rajo.dxf -o frontend/public/pit-shell.json --max-points 40000

Los DXF mineros suelen traer cientos de miles de vertices; el script decima con
Ramer-Douglas-Peucker y sube la tolerancia hasta cumplir --max-points, de modo
que el navegador reciba una malla liviana (un solo draw call en el mapa).
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

Point = tuple[float, float, float]

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = REPO_ROOT / "frontend" / "public" / "pit-shell.json"


def _distance_point_segment(point: Point, start: Point, end: Point) -> float:
    px, py, pz = point
    ax, ay, az = start
    bx, by, bz = end
    abx, aby, abz = bx - ax, by - ay, bz - az
    apx, apy, apz = px - ax, py - ay, pz - az
    ab_sq = abx * abx + aby * aby + abz * abz
    if ab_sq == 0:
        return math.dist(point, start)
    t = max(0.0, min(1.0, (apx * abx + apy * aby + apz * abz) / ab_sq))
    closest = (ax + abx * t, ay + aby * t, az + abz * t)
    return math.dist(point, closest)


def rdp(points: list[Point], tolerance: float) -> list[Point]:
    """Ramer-Douglas-Peucker 3D iterativo (evita recursion profunda)."""
    if len(points) < 3 or tolerance <= 0:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        max_distance = 0.0
        index = first
        for i in range(first + 1, last):
            distance = _distance_point_segment(points[i], points[first], points[last])
            if distance > max_distance:
                max_distance = distance
                index = i
        if max_distance > tolerance:
            keep[index] = True
            stack.append((first, index))
            stack.append((index, last))
    return [point for point, kept in zip(points, keep) if kept]


def _entity_polylines(msp, spline_distance: float) -> list[tuple[str, list[Point]]]:
    lines: list[tuple[str, list[Point]]] = []
    for entity in msp:
        dxftype = entity.dxftype()
        layer = str(entity.dxf.layer)
        try:
            if dxftype == "LWPOLYLINE":
                elevation = float(entity.dxf.elevation or 0.0)
                points = [(float(x), float(y), elevation) for x, y, *_ in entity.get_points()]
            elif dxftype == "POLYLINE":
                points = [
                    (float(v.dxf.location.x), float(v.dxf.location.y), float(v.dxf.location.z))
                    for v in entity.vertices
                ]
            elif dxftype == "LINE":
                start, end = entity.dxf.start, entity.dxf.end
                points = [
                    (float(start.x), float(start.y), float(start.z)),
                    (float(end.x), float(end.y), float(end.z)),
                ]
            elif dxftype == "SPLINE":
                points = [
                    (float(p[0]), float(p[1]), float(p[2]))
                    for p in entity.flattening(spline_distance)
                ]
            else:
                continue
        except Exception as error:  # entidad corrupta: se reporta y se sigue
            print(f"  [aviso] {dxftype} en capa {layer} ignorada: {error}", file=sys.stderr)
            continue
        if len(points) >= 2:
            if getattr(entity, "closed", False) or getattr(entity.dxf, "flags", 0) & 1:
                points.append(points[0])
            lines.append((layer, points))
    return lines


def convert(
    dxf_path: Path,
    layers: list[str] | None,
    tolerance: float | None,
    max_points: int,
    name: str | None,
) -> dict:
    try:
        import ezdxf
    except ImportError:
        sys.exit("ezdxf no esta instalado. Ejecuta: pip install ezdxf")

    document = ezdxf.readfile(str(dxf_path))
    msp = document.modelspace()

    bbox_probe: list[Point] = []
    raw = _entity_polylines(msp, spline_distance=0.5)
    if layers:
        wanted = [item.strip().upper() for item in layers if item.strip()]
        raw = [(layer, pts) for layer, pts in raw if any(w in layer.upper() for w in wanted)]
    if not raw:
        available = sorted({str(l.dxf.name) for l in document.layers})
        sys.exit(
            "No se encontraron polilineas"
            + (f" en capas que contengan {layers}" if layers else "")
            + f". Capas disponibles: {', '.join(available)}"
        )

    for _, pts in raw:
        bbox_probe.extend((pts[0], pts[len(pts) // 2], pts[-1]))
    xs = [p[0] for p in bbox_probe]
    ys = [p[1] for p in bbox_probe]
    zs = [p[2] for p in bbox_probe]
    diagonal = math.dist((min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs)))
    current_tolerance = tolerance if tolerance is not None else max(diagonal * 0.001, 0.05)

    total_input = sum(len(pts) for _, pts in raw)
    polylines = raw
    while True:
        simplified = [(layer, rdp(pts, current_tolerance)) for layer, pts in polylines]
        simplified = [(layer, pts) for layer, pts in simplified if len(pts) >= 2]
        total = sum(len(pts) for _, pts in simplified)
        if total <= max_points or current_tolerance > diagonal:
            polylines = simplified
            break
        current_tolerance *= 1.6

    result = {
        "name": name or dxf_path.stem,
        "source": dxf_path.name,
        "units": "m",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "tolerance": round(current_tolerance, 4),
        "polyline_count": len(polylines),
        "point_count": sum(len(pts) for _, pts in polylines),
        "polylines": [
            {"layer": layer, "points": [[round(x, 3), round(y, 3), round(z, 3)] for x, y, z in pts]}
            for layer, pts in polylines
        ],
    }
    print(
        f"Polilineas: {len(polylines)} / puntos: {result['point_count']} "
        f"(entrada {total_input}, tolerancia {current_tolerance:.3f} m)"
    )
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("dxf", type=Path, help="DXF del diseño de rajo")
    parser.add_argument("-o", "--output", type=Path, default=DEFAULT_OUTPUT, help=f"Salida JSON (defecto: {DEFAULT_OUTPUT})")
    parser.add_argument("--layers", type=str, default=None, help="Filtro de capas por substring, separadas por coma (ej: CRESTA,PATA,RAMPA)")
    parser.add_argument("--tolerance", type=float, default=None, help="Tolerancia RDP en metros (defecto: 0.1%% de la diagonal)")
    parser.add_argument("--max-points", type=int, default=60000, help="Tope de vertices totales (defecto: 60000)")
    parser.add_argument("--name", type=str, default=None, help="Nombre visible del diseño")
    args = parser.parse_args()

    if not args.dxf.exists():
        sys.exit(f"No existe el archivo: {args.dxf}")

    result = convert(
        args.dxf,
        layers=args.layers.split(",") if args.layers else None,
        tolerance=args.tolerance,
        max_points=args.max_points,
        name=args.name,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, separators=(",", ":")), encoding="utf-8")
    size_kb = args.output.stat().st_size / 1024
    print(f"Escrito {args.output} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
