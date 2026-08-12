# NORTHMINE OpenAI Realtime LIVE Gate

Fecha de auditoría: 2026-08-12

Branch auditada: `feature/operational-agent-hardening`

HEAD auditado: `c17ae9b`

## Resultado

```text
REALTIME_LIVE_READY = false
Classification = NOT_CONFIGURED
PHYSICAL_BROWSER_ACCEPTANCE = PENDING
```

Este resultado no evalúa ni expone secretos. Confirma únicamente si el HEAD
contiene el camino técnico necesario para abrir una sesión OpenAI Realtime
real y mantener NORTHMINE Runtime como autoridad de herramientas.

## Evidencia del HEAD

- La captura de voz visible usa `SpeechRecognition` del navegador.
- La salida hablada usa `speechSynthesis` o los proveedores por turnos ya
  existentes.
- No existe cliente `RTCPeerConnection` para OpenAI Realtime.
- No existe endpoint backend que cree una sesión o client secret efímero.
- No existe conexión sideband OpenAI Realtime enlazada al Runtime.
- `VITE_REALTIME_VOICE_ENABLED` habilita la capa conversacional local; no
  configura un proveedor OpenAI.
- La referencia `AI_REALTIME_PROVIDER` aparece sólo como comentario de
  diagnóstico; no existe como configuración ejecutable.

El commit histórico `f79f53c` declara nombres de configuración Realtime, pero
no es ancestro de este HEAD y sólo agrega configuración: no implementa WebRTC,
creación de sesión ni sideband. No fue cherry-picked durante este gate.

Configuración observada sin leer valores:

| Variable | Presente |
|---|---:|
| `OPENAI_REALTIME_ENABLED` | NO |
| `OPENAI_API_KEY` | NO |
| `OPENAI_REALTIME_MODEL` | NO |

## Configuración requerida cuando exista el camino LIVE

Los valores permanecen exclusivamente server-side y nunca deben registrarse:

```text
OPENAI_REALTIME_ENABLED=true
OPENAI_API_KEY=<server-side secret>
OPENAI_REALTIME_MODEL=gpt-realtime-2.1-mini
```

Además, el camino LIVE requiere antes de declararse listo:

1. Endpoint backend autenticado para crear la sesión/client secret efímero.
2. WebRTC browser → OpenAI Realtime para audio full-duplex.
3. Sideband server-side ligado a la misma sesión.
4. Tool calls reenviadas a Runtime/RBAC/Planner/Executor/Verifier.
5. Smoke server-side de acceso al modelo y creación de sesión, descartando el
   client secret sin imprimirlo.
6. Fallback explícito que no se presente como LIVE.

Estos puntos son requisitos de configuración/integración; no fueron
implementados porque este gate prohíbe agregar funcionalidades nuevas.

## Gate de salida

Sólo cambiar a:

```text
REALTIME_LIVE_READY = true
```

cuando una sesión real se establezca sin fallback determinístico, el canal
sideband esté conectado al Runtime existente y el smoke no exponga secretos.
Esto todavía no acredita micrófono, altavoz, barge-in ni experiencia física.
