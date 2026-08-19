# NORTHMINE Agent Program Checklist

Este documento es la vista humana de `NORTHMINE_AGENT_PROGRAM_CHECKLIST.json`. Git y la evidencia ejecutable prevalecen sobre relatos históricos. `IMPLEMENTED`, `VERIFIED`, `DEPLOYED` y `ACCEPTED` son estados distintos; sin evidencia no existe check verde.

Phase progress: 40 requirements; 0 accepted; 12 verified; 16 implemented; 8 partial; 2 planned

Program progress: 14 stages; 0 accepted; 11 merged; 0 partial; 1 current

## Historia reconstruida

| Etapa | Estado real | Commits principales | Producción |
|---|---|---|---|
| Foundation | MERGED | base `102209e` | NOT VERIFIED |
| Semantic Control | MERGED | `7ca8ac6`, merge `311a9d1` | NOT VERIFIED |
| Module Instrumentation | MERGED | `b0a7c2d` | NOT VERIFIED |
| Planner / Executor / Verifier | MERGED | `4befcd7` | NOT VERIFIED |
| Runtime + Voice | MERGED | `fe1b582`, `b6d7a76` | NOT VERIFIED |
| Perception | MERGED | `68a76ec` | NOT VERIFIED |
| Memory / Proactivity / Work Products | MERGED | `a0a8913` | NOT VERIFIED |
| Browser Runtime Hardening | MERGED | `2803235`, `3833efa`, `9198950` | CURRENT SMOKE PENDING |
| Realtime Conversation | MERGED | `33eaec2`, `1b7b3a7` | LIVE ACCEPTANCE PENDING |
| Production Reconciliation | MERGED | `311a9d1`, `075c111`, `8cc8a00`, `8419e1`, `34f690a` | NOT VERIFIED |
| Microphone Onboarding | MERGED | `7cc01d8`, `1d32f03`, merge `34f690a` | DEVICE MATRIX PENDING |
| Realtime Speech-to-Speech | IMPLEMENTED / OPTIONAL | `7d1d056`; WebRTC + sideband conservados y apagados por defecto | OPTIONAL_NOT_CONFIGURED; no bloquea producto |
| Operational Agent Hardening | IN_PROGRESS | checkpoint local `31712a6`, base `34f690a` | NOT DEPLOYED |
| NORTHMINE Agent Demo Tour | VERIFIED | `d3f9a83`, pacing `9d7d0bf`, base `c4cd431` | DEMO_ACCEPTED LOCAL; no acredita aceptación física ni producción |

Estados sincronizados de requisitos históricos:

<!-- foundation-runtime-boundary:IMPLEMENTED -->
<!-- semantic-registry:VERIFIED -->
<!-- semantic-no-selectors:VERIFIED -->
<!-- entity-resolution:VERIFIED -->
<!-- pev-planner:VERIFIED -->
<!-- pev-verifier:VERIFIED -->
<!-- runtime-ws:VERIFIED -->
<!-- voice-empty-guard:VERIFIED -->
<!-- perception-priority:VERIFIED -->
<!-- memory-scope:VERIFIED -->
<!-- human-approval:VERIFIED -->
<!-- vite-ws-proxy:VERIFIED -->
<!-- seenode-websockets:MERGED -->
<!-- barge-in:PARTIAL -->
<!-- speech-segmentation:VERIFIED -->
<!-- merge-integrity:VERIFIED -->
<!-- mic-user-gesture:VERIFIED -->
<!-- mic-policy:MERGED -->
<!-- realtime-authority:IMPLEMENTED -->
<!-- demo-environment-gate:VERIFIED -->
<!-- demo-controller:VERIFIED -->
<!-- demo-full-tour:VERIFIED -->
<!-- demo-five-scenarios:VERIFIED -->
<!-- demo-runtime-reuse:VERIFIED -->
<!-- demo-trace:VERIFIED -->
<!-- demo-cli:VERIFIED -->
<!-- demo-visual-evidence:VERIFIED -->
<!-- demo-deterministic-acceptance:VERIFIED -->
<!-- demo-physical-separation:VERIFIED -->

## NORTHMINE Agent Demo Tour

| Gate | Estado | Evidencia |
|---|---|---|
| Environment gate | VERIFIED | `AGENT_DEMO_MODE=true`, rechazo fuera de entorno autorizado cubierto por prueba |
| Controller + 20 escenas | VERIFIED | `AgentDemoController`; trace completo 20/20 |
| Cinco escenarios | VERIFIED | `agent:demo:harness` PASS |
| Runtime/Harness reuse | VERIFIED | fixtures del harness + WebSocket Runtime + Planner/tools/Verifier reales |
| Trace y evidencia visual | VERIFIED | trace sanitizado, 8 screenshots; video permanece opcional |
| Demo determinística visual | VERIFIED | 20/20 escenas, UI Actions 8/8, 191,5 s, Chrome sin errores de consola/red |
| Demo accepted | DEMO_ACCEPTED | aceptación local visual y determinística; no es aceptación física |
| Physical browser acceptance | SEPARATE / PENDING | no se acredita por esta demo |

## Operational Agent Hardening

| Bloque | Estado | Evidencia / pendiente |
|---|---|---|
| Identidad NORTHMINE | IMPLEMENTED | modal actualizado; búsqueda final pendiente |
| Razonamiento crítico | VERIFIED | schemas, hypotheses, conclusion, harness |
| Conversación progresiva | PARTIAL | speech policy implementada; live pendiente |
| Guidance UI | IMPLEMENTED | layer, estados, registry; E2E pendiente |
| Charts / tables / maps | PARTIAL | contratos listos; handlers visuales por módulo pendientes |
| Quick Actions | IMPLEMENTED | `user.intent`, globales/contextuales |
| Command Palette | IMPLEMENTED | Ctrl/Cmd+K; keyboard/focus |
| Context Actions | IMPLEMENTED | click contextual / Shift+F10 sobre widgets registrados |
| ReportComposer / ReportVerifier | VERIFIED | 71 pruebas focalizadas pasaron |
| Agent Harness | VERIFIED | 20/20 determinísticos |
| Fault / realtime / security harness | PARTIAL | fault/realtime verificados; seguridad y E2E parciales |
| Automated Chrome E2E | BLOCKED_BY_TOOLING | extensión/puente nativo ausentes; no bloquea funcionalidad del producto |
| Automated visual regression | BLOCKED_BY_TOOLING | depende del mismo bridge de automatización |
| Physical Chrome acceptance | PENDING | protocolo en `PHYSICAL_ACCEPTANCE.md` |
| OpenAI Realtime LIVE | OPTIONAL_NOT_CONFIGURED | `REALTIME_LIVE_IMPLEMENTED=true`; WebRTC, endpoint SDP y sideband conservados; `OPENAI_REALTIME_ENABLED=false`; no bloquea Runtime, harness, demo ni despliegue |
| Product functionality | NOT BLOCKED | Runtime y voz actual son la ruta operativa; experiencia física pendiente |
| Seenode | NOT_DEPLOYED | no existe push ni despliegue de esta fase |

Estados sincronizados de la fase:

<!-- oah-identity:IMPLEMENTED -->
<!-- oah-report-branding:IMPLEMENTED -->
<!-- oah-investigation-contract:VERIFIED -->
<!-- oah-competing-hypotheses:VERIFIED -->
<!-- oah-contradictions:VERIFIED -->
<!-- oah-followups:PARTIAL -->
<!-- oah-progressive-response:IMPLEMENTED -->
<!-- oah-speech-policy:VERIFIED -->
<!-- oah-interruption:PARTIAL -->
<!-- oah-guidance-layer:IMPLEMENTED -->
<!-- oah-guidance-states:IMPLEMENTED -->
<!-- oah-guidance-contract:IMPLEMENTED -->
<!-- oah-guidance-registry:IMPLEMENTED -->
<!-- oah-chart-actions:PARTIAL -->
<!-- oah-table-actions:PARTIAL -->
<!-- oah-map-actions:PARTIAL -->
<!-- oah-quick-actions:IMPLEMENTED -->
<!-- oah-command-palette:IMPLEMENTED -->
<!-- oah-context-actions:IMPLEMENTED -->
<!-- oah-recommendations:IMPLEMENTED -->
<!-- oah-report-composer:VERIFIED -->
<!-- oah-report-charts-tables:IMPLEMENTED -->
<!-- oah-report-verifier:VERIFIED -->
<!-- oah-report-versioning:IMPLEMENTED -->
<!-- oah-harness-contract:VERIFIED -->
<!-- oah-golden-scenarios:VERIFIED -->
<!-- oah-fault-injection:VERIFIED -->
<!-- oah-hallucination:VERIFIED -->
<!-- oah-ui-e2e:BLOCKED -->
<!-- oah-report-harness:VERIFIED -->
<!-- oah-realtime-harness:VERIFIED -->
<!-- oah-security-harness:PARTIAL -->
<!-- oah-latency:PARTIAL -->
<!-- oah-accessibility:IMPLEMENTED -->
<!-- oah-performance:PARTIAL -->
<!-- oah-audit:IMPLEMENTED -->
<!-- oah-ci:IMPLEMENTED -->
<!-- oah-full-tests:IN_PROGRESS -->
<!-- oah-live-acceptance:PLANNED -->
<!-- oah-seenode:PLANNED -->

Estado de la capacidad conversacional opcional:

```text
OPENAI_REALTIME_ENABLED=false
REALTIME_LIVE_IMPLEMENTED=true
REALTIME_LIVE_CONFIGURED=false
REALTIME_LIVE_READY=false
REALTIME_LIVE_STATUS=OPTIONAL_NOT_CONFIGURED
```

OpenAI Realtime no es dependencia de cierre para Runtime, Planner, Executor,
Verifier, memoria, percepción, UI Actions, reportes, harness, demo ni despliegue.
La ruta operativa permanece `micrófono → STT navegador → Runtime → TTS actual`.
La experiencia física de esa ruta continúa pendiente de aceptación humana.

## Dependency graph

```text
Realtime Conversation
  → Microphone acquisition
  → Realtime session / turn ownership
  → server-side Runtime
  → Command Router
  → Planner → Executor → Verifier
  → semantic UI actions → ACK → Guidance Layer
  → evidence → hypotheses → conclusion → report gate
```

## Capability matrix

| Capability | Exists | Tests | Harness | Production |
|---|---:|---:|---|---|
| Navigate | yes | yes | 13 map navigation | UNKNOWN |
| Apply filter | yes | yes | missing | UNKNOWN |
| Focus entity | yes | yes | 12 find equipment | UNKNOWN |
| Investigate production | yes | yes | 01 production drop | UNKNOWN |
| Compare shifts | yes | yes | 10 compare shifts | UNKNOWN |
| Generate report | yes | yes | 16 executive report | UNKNOWN |
| Voice conversation | yes | yes | 19 interruption | UNKNOWN |
| Barge-in | yes | partial | 19 interruption | UNKNOWN |

## Device matrix

| Capability | Chrome Desktop | Segundo PC | Android | Tablet | Production |
|---|---|---|---|---|---|
| Mic permission | NOT VERIFIED | NOT TESTED | NOT TESTED | NOT TESTED | NOT VERIFIED |
| Realtime audio | NOT VERIFIED | NOT TESTED | NOT TESTED | NOT TESTED | NOT VERIFIED |
| Barge-in | NOT VERIFIED | NOT TESTED | NOT TESTED | NOT TESTED | NOT VERIFIED |
| UI manipulation | NOT VERIFIED | NOT TESTED | NOT TESTED | NOT TESTED | NOT VERIFIED |
| Guidance effects | NOT VERIFIED | NOT TESTED | NOT TESTED | NOT TESTED | NOT VERIFIED |

## Matrices actuales

- Reasoning: competing hypotheses, contradictory evidence, missing evidence y causality guard tienen implementación + harness; live queda NOT VERIFIED.
- Reports: resumen, tablas/gráficos, versionado y ReportVerifier existen; producción queda NOT VERIFIED.
- UI: Producción, Flota y Carguío tienen navigate/focus/guidance/ACK; highlights especializados siguen PARTIAL. Vista Aérea sigue PARTIAL.

## Incidentes históricos

| Incidente | Causa | Fix |
|---|---|---|
| Vite WS | proxy sin `ws:true` | `2803235` |
| Seenode WS | dependencia `websockets` ausente | `3833efa` |
| Uvicorn WS | import no garantizaba implementación | `9198950` |
| Speech 200 vacío | provider failure mal representado | `b6d7a76` |
| Mic globalmente bloqueado | Permissions-Policy | `7cc01d8` |

## Known issues y release acceptance

- ENVIRONMENT: WENCO SQL/pyodbc no está disponible en el entorno local de pruebas.
- RESOLVED LOCAL: `npm ci`, typecheck, 98/98 unit y build pasaron el 2026-08-12.
- AUTOMATION_TOOLING_BLOCKER: Chrome está instalado y abierto, pero la ChatGPT Chrome Extension y el puente nativo no están instalados. Solo bloquea E2E/visual automatizados; NORTHMINE no depende de esa extensión para funcionar.
- 13 × `PREEXISTING / ENVIRONMENT / SQL-WENCO`: WENCO/`pyodbc` no disponible localmente. Regresión: NO.
- 1 × `PREEXISTING / SUPERSEDED_TEST / NON_REGRESSION`: `test_security_hardening` llama `/api/demo/summary`, retirado con 410; reemplazado por `/api/summary`.
- Suite backend completa histórica: 341/355. Gate operacional actual sin WENCO: 102/102 PASS. Los 2 controles `test_shift_report` ejecutados en este cierre quedaron `PREEXISTING / ENVIRONMENT / SQL-WENCO` por ausencia de `pyodbc`.
- `REALTIME_LIVE_STATUS=OPTIONAL_NOT_CONFIGURED`: WebRTC + endpoint SDP + sideband Runtime están implementados y probados con dobles, pero apagados por defecto. Su configuración y smoke real son opcionales y no bloquean NORTHMINE. No se leyó ni expuso ningún secreto.
- RESOLVED TEST ORACLE: barge-in corta audio localmente y la confirmación backend conserva FIFO/replay. Agent Runtime: 43/43 PASS.
- La fase actual no está desplegada. Health local backend/frontend: PASS (`/`, `/health`, `/api/health` HTTP 200). WebSocket físico, voz física, Chrome console, mobile/tablet y rollback siguen `NOT VERIFIED` para el commit final. OpenAI Realtime permanece opcional y fuera de estos gates.

## Architecture decisions vigentes

1. FastAPI/Runtime conservan autoridad server-side.
2. UI actions son semánticas; nunca coordenadas ni selectores arbitrarios del modelo.
3. Planner / Executor / Verifier no son reemplazados por Realtime.
4. El usuario autorizado conserva la decisión y aprobación operacional.
5. No se registra audio crudo, secretos, prompts internos ni chain-of-thought.
