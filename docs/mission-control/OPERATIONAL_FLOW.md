# Operational Flow

## Estado y alcance

**DEMOSTRATIVO / datos sintéticos / EN VALIDACIÓN.** Operational Flow es la representación de usuario del Operational Graph para el escenario determinístico S01: detención mecánica de PH03. No consulta Wenco, no representa una faena real, no ejecuta comandos FMS y no constituye una implementación productiva de Mission Control.

La experiencia permite seguir una condición operacional desde su origen hasta sus consecuencias conocidas sin presentar una inferencia como hecho. El backend es autoritativo para identidad, alcance tenant/site, tiempo, procedencia, calidad, relaciones y evento. El frontend conserva únicamente estado de presentación: instante elegido, nodo seleccionado y visibilidad de capas.

## Dirección de experiencia

Operational Flow extiende el lenguaje Mission Control industrial de grafito y cobre. La interfaz permanece calmada cuando la operación está estable y aumenta la jerarquía solo para mostrar una condición, su propagación y su recuperación. Cobre identifica selección y acción; los estados operacionales usan etiquetas, formas/iconos y colores semánticos independientes.

La lectura aplica progressive disclosure:

1. **Entender:** condición dominante, impacto, faena, turno y tiempo efectivo.
2. **Relacionar:** cadena causal conectada y propagación visible.
3. **Investigar:** nodo seleccionado, relaciones vigentes, evidencia, procedencia y calidad.

## Cadena causal S01

```text
Frente 03 -> PH03 -> 6 CAEX -> Ruta Norte -> Chancador 01
                                      |              |
                                      v              v
                              Velocidad / ciclo -> Tonelaje -> Plan turno -> Impacto costo
```

- Frente, PH03, ruta y destino se presentan como entidades.
- El grupo de seis CAEX es una agregación derivada de asignaciones sintéticas.
- Ciclo, tonelaje y plan son resultados determinísticos derivados.
- El costo permanece `UNKNOWN`, se rotula `HYPOTHESIS` y muestra `Sin cálculo autorizado`; no existe evidencia suficiente para calcularlo.
- Los instantes demostrativos son estable (10:24), evento (10:31), impacto (10:45) y recuperación (10:52), en `America/Santiago`.

## Arquitectura

```text
OperationalFlowPage
  -> React Query
  -> GET /api/mission-control/operational-flow?at=<ISO-8601 con zona>
  -> router autenticado y alcance tenant/site resuelto en servidor
  -> build_demo_operational_flow_snapshot
  -> OperationalFlowSnapshot v2
  -> canvas SVG o cadena móvil + inspector contextual
```

- La página se carga de forma diferida en `/mission-control/operational-flow` dentro de la aplicación autenticada existente.
- `getOperationalFlowSnapshot()` usa el cliente API común; el navegador no envía tenant ni site como autoridad.
- El frontend rechaza una respuesta cuyo `schema_version` no sea `mission-control.operational-flow.v2`.
- El servicio demo está habilitado solo en entornos `demo`, `development` o `testing`; fuera de ellos responde `404`.
- La API exige autenticación y contexto tenant/site completo. Un tiempo sin zona o fuera de la ventana S01 responde `422`.
- El snapshot se reconstruye de forma determinística para el instante solicitado; no hay persistencia, streaming, replay durable ni lectura Wenco en esta entrega.

## Contrato API

### Solicitud

```http
GET /api/mission-control/operational-flow?at=2026-08-20T10:45:00-04:00
Authorization: sesión NORTHMINE
```

`at` es opcional; si se omite, el demo usa 10:45. Cuando se entrega, debe incluir zona horaria y pertenecer a `2026-08-20 10:24-11:00 America/Santiago`.

### Respuesta `OperationalFlowSnapshot`

| Grupo | Campos principales | Responsabilidad |
|---|---|---|
| Contrato | `schema_version` | Compatibilidad frontend/backend. |
| Alcance | `tenant_id`, `site_id`, `shift_id`, `shift_label` | Derivado de la sesión por el servidor. |
| Tiempo | `site_timezone`, `temporal_mode`, `effective_at`, `generated_at` | Snapshot temporal demostrativo. |
| Veracidad | `provenance`, `data_quality`, `scenario` | Procedencia sintética y calidad explícitas. |
| Topología | `nodes`, `relationships` | Entidades, agregados, resultados y relaciones dirigidas. |
| Investigación | `nodes[].technical_details` | Variables Level 3 agrupadas, temporales y trazables por nodo. |
| Evidencia | `evidence` | Afirmación, valor, observación y procedencia. |
| Evento | `active_event` | Evento S01 y nodos afectados; puede ser `null` en estado estable. |
| Navegación demo | `scenario_moments` | Instantes autorizados para reconstruir la historia. |

### Semántica

- `FACT`: dato suministrado por el harness sintético; no significa Wenco ni producción.
- `DERIVED`: resultado determinístico calculado desde evidencia sintética.
- `HYPOTHESIS`: relación o resultado no comprobado; puede incluir confianza y nunca se presenta como hecho.
- Calidad: `FRESH | STALE | INCOMPLETE | CONFLICTING | UNAVAILABLE`.
- Condición: `NORMAL | ATTENTION | CRITICAL | RECOVERING | UNKNOWN`.
- Procedencia del escenario: `origin=SYNTHETIC`, `demo_context=true`; la representación global y los cálculos son `DERIVED`.

## Interacción y responsive

### Desktop

- El workspace usa un grafo SVG acotado y un inspector lateral persistente.
- Cada nodo puede seleccionarse con puntero, `Enter` o barra espaciadora.
- La barra temporal reconstruye el snapshot en cuatro momentos S01.
- Las capas permiten mostrar u ocultar impacto y etiquetas de afirmación; la topología permanece visible.
- El inspector expone condición, resumen, tipo de afirmación, calidad, procedencia, relaciones y evidencia.
- `Datos técnicos` abre bajo demanda asignaciones, tiempos de ciclo, velocidades, colas, tonelaje y plan sin sobrecargar los nodos.
- El canvas impide selección accidental de texto durante el movimiento o arrastre del puntero; el inspector conserva texto copiable.

### Tablet

- Bajo 1180 px, el inspector pasa debajo del grafo y distribuye su contenido en dos columnas.
- Se conserva la misma secuencia de lectura y selección.

### Mobile

- Bajo 760 px, el SVG no se encoge: se reemplaza por una lista causal ordenada y seleccionable.
- Los controles mantienen objetivos táctiles de al menos 44 px; el selector temporal usa 56 px.
- El inspector se convierte en una columna y el pie de procedencia se alinea al flujo de lectura.

## Accesibilidad y movimiento

- El SVG incluye `title` y `desc`; los nodos tienen nombre accesible, estado de selección y operación por teclado.
- La alternativa móvil usa botones nativos dentro de una lista ordenada.
- Estado e impacto no dependen solo del color: combinan texto, forma/icono y tratamiento de línea.
- Los toggles de tiempo y capas exponen `aria-pressed`; loading, error e incompatibilidad de esquema tienen estados explícitos.
- El cambio de situación usa anuncio `polite` y la información temporal usa elementos `time`.
- `prefers-reduced-motion` elimina la animación de propagación sin ocultar estado, relación ni evidencia.

## Límites y no objetivos

- No hay Wenco, SQL operacional ni credenciales productivas.
- No hay ejecución automática ni ruta de mutación FMS.
- No hay cálculo autorizado de costo; el valor permanece desconocido.
- Las variables finas son fixtures sintéticas del escenario S01 y nunca se presentan como registros Wenco.
- No hay grafo operacional persistente, replay durable, streaming ni sincronización LIVE.
- No hay motor general de layout: el layout está autorizado solo para los nodos S01 conocidos y falla explícitamente ante nodos no soportados.
- No completa Phase 1, no inicia una fase posterior y no acredita preparación para producción.
