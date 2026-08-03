from __future__ import annotations

import os

ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")

_SYSTEM = (
    "Eres el analista operacional de NORTHMINE Intelligence, sistema de "
    "control de una operacion minera sintetica identificada como MINA CHILE DEMO. "
    "Responde siempre en español. Sé conciso, directo y técnico. "
    "Usa terminología minera real. Máximo 3 párrafos cortos. "
    "NO uses markdown, NO uses asteriscos, NO uses bullet points. "
    "Escribe como un analista senior hablando a gerencia de turno."
)

_FALLBACK: dict[str, str] = {
    "turno": (
        "El turno registra un desempeño dentro del rango esperado. "
        "El ritmo de ciclos es consistente con los estándares históricos de la operación. "
        "Se recomienda mantener la cantidad de CAEX activos y verificar los equipos "
        "sin actividad antes del cambio de turno."
    ),
    "resumen": (
        "La operación acumula producción en línea con el plan mensual. "
        "El turno noche continúa siendo el de mayor aporte al total acumulado. "
        "Con el ritmo actual se proyecta alcanzar la meta mensual dentro del margen "
        "operacional establecido."
    ),
    "alerta": (
        "Esta situación requiere atención inmediata del supervisor de turno. "
        "Se recomienda verificar el estado del equipo involucrado y gestionar "
        "el relevo o reparación para minimizar el impacto en la producción del turno."
    ),
}


def _build_prompt(tipo: str, ctx: dict) -> str:
    if tipo == "turno":
        return (
            f"Turno: {ctx.get('turno','')} {ctx.get('fecha','')} "
            f"{ctx.get('hora_inicio','')}-{ctx.get('hora_fin','')}\n"
            f"Tonelaje: {int(ctx.get('ton_turno',0)):,} t de meta {int(ctx.get('meta_turno',0)):,} t "
            f"({float(ctx.get('pct_meta',0)):.1f}%)\n"
            f"CAEX activos: {ctx.get('caex_activos',0)}/38. "
            f"Ciclos: {ctx.get('ciclos',0)}. Prom/ciclo: {ctx.get('prom_ciclo',0)} t.\n"
            f"Palas activas: {ctx.get('palas_activas',0)}. "
            f"Alertas: {ctx.get('n_alertas',0)} ({ctx.get('n_criticas',0)} críticas).\n"
            "Analiza el desempeño del turno, identifica el punto más crítico "
            "y da una recomendación operacional concreta."
        )
    if tipo == "resumen":
        return (
            f"Mes: {ctx.get('mes','')}/{ctx.get('anio','')}. Día {ctx.get('dia_mes','')} de 31.\n"
            f"Producción acumulada: {int(ctx.get('ton_mes',0)):,} t de meta "
            f"{int(ctx.get('meta_mes',0)):,} t ({float(ctx.get('pct_mes',0)):.1f}%)\n"
            f"Turno con más producción: {ctx.get('mejor_turno','')}. "
            f"Días sobre meta: {ctx.get('dias_sobre_meta',0)}.\n"
            f"F01: {int(ctx.get('f01',0)):,} t. F02: {int(ctx.get('f02',0)):,} t. "
            f"Proyección fin de mes: {int(ctx.get('proyeccion',0)):,} t.\n"
            "Resume el estado del mes, destaca logros y riesgos principales."
        )
    # alerta
    return (
        f"Alerta {ctx.get('severidad','')}: {ctx.get('descripcion','')}\n"
        f"Equipo: {ctx.get('equipo','')}. Última actividad: {ctx.get('ultima_actividad','')}.\n"
        f"Turno activo: {ctx.get('turno','')}. Hora: {ctx.get('hora_actual','')}.\n"
        "Explica el impacto operacional de esta alerta y la acción inmediata recomendada."
    )


async def gen_ai_analysis(tipo: str, contexto: dict) -> dict:
    fallback_text = _FALLBACK.get(tipo, _FALLBACK["alerta"])

    if not ANTHROPIC_KEY:
        return {"texto": fallback_text, "source": "fallback"}

    try:
        import httpx
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 400,
                    "system": _SYSTEM,
                    "messages": [{"role": "user", "content": _build_prompt(tipo, contexto)}],
                },
            )
        data = resp.json()
        texto = data["content"][0]["text"]
        return {"texto": texto, "source": "claude"}
    except Exception:
        return {"texto": fallback_text, "source": "fallback"}
