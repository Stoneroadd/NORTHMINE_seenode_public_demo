# NORTHMINE OpenAI Realtime LIVE Gate

Fecha de implementación: 2026-08-12

Branch: `feature/operational-agent-hardening`

## Estado verificable

```text
REALTIME_LIVE_IMPLEMENTED = true
REALTIME_LIVE_READY = false
Classification = IMPLEMENTED_NOT_CONFIGURED
PHYSICAL_BROWSER_ACCEPTANCE = PENDING
```

`REALTIME_LIVE_READY` sigue en `false` porque este entorno no declara una
credencial server-side ni se ha completado una llamada real. No se leyó,
imprimió ni persistió ningún secreto.

## Camino LIVE implementado

```text
click explícito
  → getUserMedia
  → RTCPeerConnection del navegador
  → POST SDP autenticado a NORTHMINE
  → OpenAI /v1/realtime/calls
  → audio full-duplex WebRTC

Location call_id
  → sideband WebSocket server-side
  → allowlist northmine_runtime
  → RBAC + Runtime + Planner + Executor + Verifier
  → eventos y UI Actions existentes
  → function_call_output verificado
  → respuesta Realtime
```

- La clave estándar existe únicamente en backend.
- El navegador no recibe clave estándar ni client secret.
- El endpoint exige autenticación NORTHMINE y ownership de `LiveSession`.
- El modelo no puede elegir selectores, CSS ni herramientas arbitrarias.
- El sideband observa copias de eventos públicos; no drena la cola WebSocket
  del navegador y no registra audio ni chain-of-thought.
- El TTS anterior permanece como fallback explícito. Durante LIVE se suprime
  su audio duplicado, conservando captions y acknowledgements del Runtime.

## Configuración requerida

```text
OPENAI_REALTIME_ENABLED=true
OPENAI_API_KEY=<server-side secret>
OPENAI_REALTIME_MODEL=gpt-realtime-2.1-mini
```

Opcionales: `OPENAI_REALTIME_VOICE`, límites de duración/concurrencia,
inactividad y timeout de tool. Los ejemplos están en `backend/.env.example`.

La ruta `GET /api/ai-agent/realtime/status` devuelve únicamente disponibilidad,
modelo, transporte y nombres de variables ausentes. Nunca devuelve valores.

## Fallback y clasificación

Si LIVE no está configurado, NORTHMINE puede mantener voz local y muestra
explícitamente que es respaldo. Ese camino no acredita `REALTIME_LIVE_READY`,
micrófono físico, altavoz físico ni OpenAI Realtime.

## Evidencia ejecutada

- Backend focalizado Realtime: 8/8 PASS.
- Frontend SpeechOutputRouter Realtime: 9/9 PASS.
- Typecheck + frontend build: PASS.
- Pruebas reales con proveedor: PENDING por configuración ausente.
- Aceptación física: PENDING.

## Gate de salida

Cambiar `REALTIME_LIVE_READY=true` únicamente después de:

1. Presencia de las tres variables requeridas, sin exponer sus valores.
2. Creación real de sesión WebRTC sin fallback.
3. Sideband conectado y tool call procesada por el Runtime existente.
4. Smoke de modelo y sesión sin secretos en artefactos.

Esto todavía no acredita micrófono, altavoz, barge-in ni experiencia física;
esos controles permanecen en `PHYSICAL_ACCEPTANCE.md`.
