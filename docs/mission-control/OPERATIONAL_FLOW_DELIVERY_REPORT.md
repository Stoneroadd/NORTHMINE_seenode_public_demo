# NORTHMINE Mission Control — Operational Flow Delivery Report

## Estado

**DEMOSTRATIVO / EN VALIDACIÓN**

Extensión de producto existente para visualizar el escenario sintético S01. La entrega no está conectada a Wenco, no es una declaración de producción y no declara Phase 1 completa.

## Objetivo

Entregar una primera representación Operational Flow que conecte frente, unidad de carguío, flota, ruta, destino, desempeño, tonelaje, plan y costo, preservando tiempo, procedencia, calidad y separación `FACT / DERIVED / HYPOTHESIS` bajo autoridad del backend.

## Entregado

- Ruta autenticada y lazy-loaded `/mission-control/operational-flow`.
- Endpoint `GET /api/mission-control/operational-flow?at=` con alcance tenant/site resuelto en servidor.
- Snapshot tipado `mission-control.operational-flow.v2` para la ventana S01.
- Estados estable, crítico, recuperando y normalizado.
- Grafo causal desktop/tablet, cadena ordenada móvil e inspector contextual.
- Evidencia y relaciones con procedencia, calidad y tipo de afirmación explícitos.
- Datos técnicos Level 3 por nodo: equipo, asignaciones CAEX, ciclo, velocidad, cola, tonelaje y plan.
- Selección accidental de texto bloqueada en el canvas, sin impedir copiar información desde el inspector.
- Degradación segura ante carga, error, esquema incompatible, tiempo inválido o layout no autorizado.
- Costo mantenido como hipótesis desconocida y sin cálculo autorizado.

## Contrato y autoridad

- El backend produce el snapshot completo; el frontend no promueve datos a LIVE, REAL o WENCO.
- El endpoint requiere sesión y rechaza contexto tenant/site incompleto.
- Parámetros tenant/site enviados por el cliente no sustituyen el alcance de la sesión.
- La ruta sintética solo está disponible en `demo`, `development` o `testing`.
- Timestamps sin zona o fuera de `2026-08-20 10:24-11:00 America/Santiago` se rechazan.
- La proyección no ejecuta comandos ni escribe en Wenco/FMS.

## Interacción y accesibilidad

- Desktop: grafo SVG navegable y inspector lateral.
- Tablet: inspector inferior en dos columnas.
- Mobile: lista causal nativa en lugar de reducir el canvas.
- Selección por puntero, teclado y botones nativos; estados `aria-pressed`, descripción accesible del grafo y foco visible.
- Estado comunicado mediante etiqueta, forma/icono y color.
- Reduced motion elimina propagación animada sin perder información.

## Pruebas de entrega

| Verificación | Resultado |
|---|---|
| Backend focalizado Operational Flow | **PASS — 11/11** |
| Frontend lint/typecheck | **PASS** |
| Frontend production build | **PASS** |
| Suite frontend completa conocida | **110/111**: un timeout preexistente, no atribuido a Operational Flow. |
| Suite backend completa conocida | **373 pass / 14 errores ambientales** preexistentes. |

Los resultados completos conocidos no se presentan como suites verdes: se conservan explícitamente el timeout frontend y los 14 errores ambientales backend. Esta entrega no reclasifica esos fallos ni los usa como evidencia de producción.

## Archivos de implementación documentados

- `frontend/src/pages/OperationalFlowPage.tsx`
- `frontend/src/mission-control/operational-flow/OperationalFlowCanvas.tsx`
- `frontend/src/mission-control/operational-flow/service.ts`
- `frontend/src/mission-control/operational-flow/types.ts`
- `frontend/src/styles/operational-flow.css`
- `backend/app/mission_control/models.py`
- `backend/app/mission_control/router.py`
- `backend/app/mission_control/service.py`
- `backend/tests/test_mission_control_operational_flow.py`

## Límites y riesgos abiertos

- Todos los valores y relaciones son sintéticos y determinísticos; no representan una faena real.
- No existe integración Wenco ni validación contra datos operacionales reales.
- El grafo usa posiciones S01 autorizadas, no un layout general para topologías arbitrarias.
- No existe persistencia operacional, replay durable, stream LIVE ni medición productiva de costo.
- Falta validación de comprensión con roles mineros y evidencia visual/E2E dedicada de esta superficie.
- Los fallos conocidos de las suites completas permanecen abiertos fuera del alcance de esta entrega.

## Decisión de entrega

Operational Flow queda documentado como una capacidad **DEMOSTRATIVA / EN VALIDACIÓN**. Es evidencia de arquitectura, contrato e interacción para S01; no autoriza despliegue productivo, no completa Phase 1 y no habilita por sí sola una fase posterior.
