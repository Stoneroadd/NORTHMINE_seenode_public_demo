# NORTHMINE Agent Harness

## NORTHMINE Agent Demo Tour

El Demo Tour es la capa visual y secuencial del mismo harness. Usa Runtime,
Planner, Executor, Verifier, memoria, acciones UI semánticas, ReportComposer y
ReportVerifier; no crea un agente alternativo.

```bash
npm run agent:demo
npm run agent:demo -- --scenario=report
npm run agent:demo -- --mode=deterministic
npm run agent:demo -- --mode=live
```

Opciones de ritmo: `--speed=fast`, `--speed=normal` y
`--speed=presentation`. En modo `live`, si Realtime no está disponible, la UI
y el trace declaran el fallback a `deterministic`; nunca simulan una conexión
real. Los artefactos sanitizados quedan bajo `agent-harness/artifacts/`.

Clasificación: `AUTOMATED_AGENT_DEMO`. Esta ejecución no acredita micrófono,
speaker, permisos nativos ni `PHYSICAL_BROWSER_ACCEPTANCE`.

Runner determinístico del pipeline `intent -> evidencia -> hipótesis -> verifier -> UI/report response`. No usa OpenAI, ElevenLabs, micrófono, Seenode ni servicios externos. Cada ejecución produce un `AgentTrace` sanitizado sin audio, secretos ni razonamiento privado.

Los contratos reales viven en `backend/app/ai`; fixtures, fallos y oráculos viven en este directorio. Los escenarios comparan propiedades, no texto completo.
