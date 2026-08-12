# NORTHMINE Operational Agent — Physical Acceptance

Estado global: **NOT TESTED**

Este protocolo certifica la experiencia integrada en un Chrome real. No depende del bridge de automatización. Estados permitidos: `PASS`, `FAIL`, `NOT TESTED`, `BLOCKED`.

## Identificación

| Campo | Valor |
|---|---|
| Commit | `31712a6` — checkpoint funcional bajo prueba |
| Fecha / hora | NOT TESTED |
| Operador | NOT TESTED |
| Equipo / SO | NOT TESTED |
| Chrome | NOT TESTED |
| Entorno / URL | LOCAL — NOT TESTED |
| Fuente operacional | NOT TESTED |

## Prueba integrada

| # | Verificación | Ejecución y criterio observable | Estado | Evidencia / notas |
|---:|---|---|---|---|
| 1 | Activación y micrófono | Activar NORTHMINE AI desde un click. Debe adquirir micrófono o mostrar una instrucción accionable y veraz. | NOT TESTED | |
| 2 | Conversación realtime | Decir: “¿Qué está pasando con producción?”. Debe entregar un primer dato útil por voz y texto sin latencia absurda. | NOT TESTED | Registrar latencia aproximada al primer audio. |
| 3 | Barge-in y contexto | Mientras habla, decir: “No, concéntrate en Pala 03.” Debe cortar audio, preservar evidencia útil, cambiar foco y responder nuevamente. | NOT TESTED | |
| 4 | Critical reasoning | Debe presentar hallazgos verificables, hipótesis competitivas, evidencia a favor/en contra, conclusión y confidence; nunca chain-of-thought. | NOT TESTED | |
| 5 | Manipulación visible | Decir: “Muéstrame dónde.” Debe navegar/enfocar el objetivo, ejecutar la acción y mostrar glow o spotlight; no limitarse a describirla. | NOT TESTED | |
| 6 | Highlight de gráfico | Pedir dónde comenzó la desviación. Debe resaltar serie, rango o punto sustentado por datos. | NOT TESTED | |
| 7 | Highlight de tabla | Pedir el equipo crítico. Debe enfocar/resaltar la fila correcta y limpiar el efecto al terminar. | NOT TESTED | |
| 8 | Quick Action | Sin hablar ni escribir, ejecutar “Analizar turno”. Debe enviar una intención estructurada e iniciar investigación. | NOT TESTED | |
| 9 | Command Palette | Abrir con Ctrl/Cmd+K, navegar por teclado y ejecutar una acción contextual. | NOT TESTED | |
| 10 | Reporte completo | Pedir: “Hazme un reporte completo del turno.” Debe incluir sólo secciones sustentadas: resumen, producción, carguío/transporte, desviaciones, causas, contradicciones, impacto, calidad, tablas/gráficos. | NOT TESTED | |
| 11 | ReportVerifier | Verificar gate, cifras, unidades, scope, periodo, evidencia, contradicciones, freshness y ausencia de secciones vacías. Un reporte fallido no puede aprobarse automáticamente. | NOT TESTED | |
| 12 | Confidence sin CoT | Preguntar: “¿Qué tan seguro estás de esa conclusión?”. Debe explicar evidencia, contradicciones, confidence y limitaciones sin razonamiento privado. | NOT TESTED | |
| 13 | Identidad visible | Inspeccionar agente, estados, errores y reporte. No debe aparecer “JARVIS” en ninguna superficie visible. | NOT TESTED | |
| 14 | Degradación SQL/WENCO | Con la fuente no disponible, NORTHMINE debe decir que no puede verificar el indicador; no inventar cifra, causa ni confidence. | NOT TESTED | Texto esperado equivalente: “No puedo verificar el indicador porque la fuente WENCO no está disponible.” |

## Resultado

| Gate | Estado |
|---|---|
| Conversación realtime | NOT TESTED |
| Barge-in y contexto | NOT TESTED |
| Razonamiento crítico | NOT TESTED |
| Manipulación y guidance | NOT TESTED |
| Quick actions / command palette | NOT TESTED |
| Reporte / ReportVerifier | NOT TESTED |
| Degradación sin datos | NOT TESTED |
| Ausencia visible de JARVIS | NOT TESTED |
| **PHYSICAL BROWSER ACCEPTANCE** | **NOT TESTED** |

Regla de cierre: `PHYSICAL BROWSER ACCEPTANCE = PASS` sólo cuando todos los gates esenciales anteriores sean `PASS`. Un `FAIL`, `NOT TESTED` o `BLOCKED` mantiene Operational Agent Hardening sin aceptar.

## Separación de tooling

- `AUTOMATED_CHROME_E2E = BLOCKED_BY_TOOLING`
- `AUTOMATED_VISUAL_REGRESSION = BLOCKED_BY_TOOLING`
- `PHYSICAL_BROWSER_ACCEPTANCE = PENDING`
- `PRODUCT_FUNCTIONALITY = NOT_BLOCKED_BY_EXTENSION`
- `SEENODE = NOT_DEPLOYED`
