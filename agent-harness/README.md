# NORTHMINE Agent Harness

Runner determinístico del pipeline `intent -> evidencia -> hipótesis -> verifier -> UI/report response`. No usa OpenAI, ElevenLabs, micrófono, Seenode ni servicios externos. Cada ejecución produce un `AgentTrace` sanitizado sin audio, secretos ni razonamiento privado.

Los contratos reales viven en `backend/app/ai`; fixtures, fallos y oráculos viven en este directorio. Los escenarios comparan propiedades, no texto completo.
