from __future__ import annotations

import math

META_MES = 4_499_998


def simulate(
    caex: int = 28,
    ciclos_hora: float = 3.8,
    ton_ciclo: float = 218.0,
    disponibilidad: float = 0.88,
    dias: int = 31,
    turno: str = "AMBOS",
) -> dict:
    turnos_dia = 1 if turno in ("DIA", "NOCHE") else 2
    horas_turno = 12

    per_caex = ciclos_hora * horas_turno * disponibilidad * dias * turnos_dia * ton_ciclo
    ciclos_total = caex * ciclos_hora * horas_turno * disponibilidad * dias * turnos_dia
    produccion = int(ciclos_total * ton_ciclo)
    brecha = produccion - META_MES
    pct_meta = round(produccion / META_MES * 100, 1)

    if per_caex > 0:
        caex_minimo = math.ceil(META_MES / per_caex)
    else:
        caex_minimo = 999

    if brecha > META_MES * 0.02:
        estado = "SOBRE_META"
    elif brecha >= 0:
        estado = "EN_RIESGO"
    else:
        estado = "BAJO_META"

    curva_caex = [
        {
            "caex": n,
            "produccion": int(n * ciclos_hora * horas_turno * disponibilidad * dias * turnos_dia * ton_ciclo),
            "sobre_meta": int(n * ciclos_hora * horas_turno * disponibilidad * dias * turnos_dia * ton_ciclo) >= META_MES,
        }
        for n in range(10, 43)
    ]

    # Sensitivity analysis
    def _prod(c_h: float, t_c: float, disp: float) -> int:
        return int(caex * c_h * horas_turno * disp * dias * turnos_dia * t_c)

    s_ciclos = _prod(ciclos_hora * 0.9, ton_ciclo, disponibilidad)
    s_ton    = _prod(ciclos_hora, ton_ciclo * 0.9, disponibilidad)
    s_disp   = _prod(ciclos_hora, ton_ciclo, max(0.0, disponibilidad - 0.05))

    sensibilidad = {
        "ciclos_hora_baja_10pct": {
            "produccion": s_ciclos,
            "delta": s_ciclos - produccion,
            "estado": _estado(s_ciclos),
        },
        "ton_ciclo_baja_10pct": {
            "produccion": s_ton,
            "delta": s_ton - produccion,
            "estado": _estado(s_ton),
        },
        "disponibilidad_baja_5pt": {
            "produccion": s_disp,
            "delta": s_disp - produccion,
            "estado": _estado(s_disp),
        },
    }

    return {
        "inputs": {
            "caex": caex,
            "ciclos_hora": ciclos_hora,
            "ton_ciclo": ton_ciclo,
            "disponibilidad": disponibilidad,
            "dias": dias,
            "turno": turno,
        },
        "resultado": {
            "produccion_estimada": produccion,
            "meta_mes": META_MES,
            "brecha": brecha,
            "estado": estado,
            "ciclos_totales": int(ciclos_total),
            "caex_minimo": caex_minimo,
            "pct_meta": pct_meta,
        },
        "curva_caex": curva_caex,
        "sensibilidad": sensibilidad,
    }


def _estado(prod: int) -> str:
    brecha = prod - META_MES
    if brecha > META_MES * 0.02:
        return "SOBRE_META"
    if brecha >= 0:
        return "EN_RIESGO"
    return "BAJO_META"
