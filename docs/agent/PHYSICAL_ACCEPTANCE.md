# NORTHMINE Operational Agent — Physical Acceptance

Estado global: **PENDING — prerequisite LIVE bloqueado**

Este protocolo certifica la experiencia integrada en un Chrome real. No depende del bridge de automatización. Estados permitidos: `PASS`, `FAIL`, `NOT TESTED`, `BLOCKED`.

## Identificación

| Campo | Valor |
|---|---|
| Commit | HEAD LIVE que supere `docs/agent/LIVE_REALTIME_GATE.md` |
| Fecha / hora | NOT TESTED |
| Operador | NOT TESTED |
| Equipo / SO | NOT TESTED |
| Chrome | NOT TESTED |
| Entorno / URL | LOCAL — NOT TESTED |
| Fuente operacional | Demo local; SQL/WENCO puede permanecer no disponible |

Prerequisito: esta ejecución sólo comienza cuando
`REALTIME_LIVE_READY=true`. El fallback determinístico y el pipeline
`SpeechRecognition + speechSynthesis` no acreditan este protocolo.

## Prueba integrada

| # | Verificación | Ejecución y criterio observable | Estado | Evidencia / notas |
|---:|---|---|---|---|
| 1 | Activación y micrófono | Activar NORTHMINE AI desde un click. Debe adquirir micrófono o mostrar una instrucción accionable y veraz. | NOT TESTED | |
| 2 | Entrada hablada | Hablar sin presionar enviar. La transcripción debe entrar al mismo contrato conversacional del agente. | NOT TESTED | |
| 3 | Respuesta oral Realtime | Decir: “¿Qué está pasando con producción?”. Debe comenzar una respuesta oral full-duplex sin usar fallback determinístico. | NOT TESTED | Registrar `first_audio_latency_ms`. |
| 4 | Barge-in | Mientras habla, decir: “No, concéntrate en Pala 03.” Debe cortar audio inmediatamente y conservar evidencia útil. | NOT TESTED | Registrar `barge_in_stop_latency_ms`. |
| 5 | Contexto multiturno | Preguntar: “¿Desde cuándo?”. Debe mantener Pala 03 como entidad y el mismo hilo de investigación. | NOT TESTED | |
| 6 | Investigación | Preguntar por la desviación de producción. Debe invocar Runtime y obtener evidencia verificable. | NOT TESTED | Registrar `tool_result_latency_ms`. |
| 7 | Hipótesis competitivas | Preguntar: “¿Qué otras causas evaluaste?”. Debe presentar alternativas calibradas. | NOT TESTED | |
| 8 | Evidencia y contradicciones | Preguntar: “¿Qué evidencia tienes a favor y en contra?”. Debe exponer evidencia, confidence y limitaciones sin chain-of-thought. | NOT TESTED | |
| 9 | Manipulación real | Decir: “Muéstramela.” Debe navegar/enfocar NORTHMINE, no limitarse a describir. | NOT TESTED | Registrar `ui_action_latency_ms`. |
| 10 | Guidance visible | La acción debe producir glow, spotlight, pulse o highlight perceptible y confirmación accesible. | NOT TESTED | |
| 11 | Gráfico y tabla | Pedir dónde comenzó la desviación y el equipo crítico. Debe resaltar rango/punto y fila correctos. | NOT TESTED | |
| 12 | Quick Action | Sin hablar ni escribir, ejecutar “Analizar turno”. Debe enviar una intención estructurada al Runtime. | NOT TESTED | Command Palette puede probarse adicionalmente, pero no sustituye este control. |
| 13 | Reporte completo | Pedir: “Hazme un reporte completo del turno.” Debe pasar ReportVerifier antes de presentarse. | NOT TESTED | Validar cifras, unidades, evidencia, contradicciones, freshness y ausencia de secciones vacías. |
| 14 | Degradación SQL/WENCO | Preguntar por un valor exacto WENCO no disponible. Debe declarar que no puede verificarlo y no inventar datos. | NOT TESTED | |

## Métricas físicas

| Métrica | Resultado |
|---|---:|
| `first_audio_latency_ms` | NOT TESTED |
| `barge_in_stop_latency_ms` | NOT TESTED |
| `tool_result_latency_ms` | NOT TESTED |
| `ui_action_latency_ms` | NOT TESTED |

## Scoring humano

| Dimensión | Puntaje |
|---|---:|
| Conversational Fluidity | NOT TESTED / 5 |
| Agent Presence | NOT TESTED / 5 |
| Operational Intelligence | NOT TESTED / 5 |
| UI Guidance Clarity | NOT TESTED / 5 |

Regla: ninguna dimensión crítica puede quedar bajo 4/5.

## Resultado

| Gate | Estado |
|---|---|
| Conversación realtime | BLOCKED — LIVE no configurado |
| Barge-in y contexto | NOT TESTED |
| Razonamiento crítico | NOT TESTED |
| Manipulación y guidance | NOT TESTED |
| Quick actions / command palette | NOT TESTED |
| Reporte / ReportVerifier | NOT TESTED |
| Degradación sin datos | NOT TESTED |
| Ausencia visible de JARVIS | NOT TESTED |
| **PHYSICAL BROWSER ACCEPTANCE** | **PENDING — prerequisite LIVE bloqueado** |

Regla de cierre: `PHYSICAL BROWSER ACCEPTANCE = PASS` sólo cuando todos los gates esenciales anteriores sean `PASS`. Un `FAIL`, `NOT TESTED` o `BLOCKED` mantiene Operational Agent Hardening sin aceptar.

## Separación de tooling

- `AUTOMATED_CHROME_E2E = BLOCKED_BY_TOOLING`
- `AUTOMATED_VISUAL_REGRESSION = BLOCKED_BY_TOOLING`
- `PHYSICAL_BROWSER_ACCEPTANCE = PENDING`
- `PHYSICAL_BROWSER_PREREQUISITE = BLOCKED_BY_LIVE_CONFIGURATION`
- `PRODUCT_FUNCTIONALITY = NOT_BLOCKED_BY_EXTENSION`
- `SEENODE = NOT_DEPLOYED`
