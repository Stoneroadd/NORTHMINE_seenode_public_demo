# NORTHMINE Intelligence — demo pública

Sistema de control operacional para faenas mineras a cielo abierto: producción
por turno, flota CAEX, palas de carguío, alertas y un agente operacional con
IA (NORTHMINE AI) que investiga, verifica evidencia y responde por texto o
voz. Esta carpeta es el derivado público, listo para desplegar en Seenode,
del producto NORTHMINE (ver `DEPLOYMENT.md`-equivalente en
`README_SEENODE_PUBLIC_DEMO.md` para el detalle de esa relación).

## Stack

- **Frontend**: React + TypeScript + Vite.
- **Backend**: FastAPI (Python 3.11+).
- **Datos**: sintéticos/demo — sin conexión a SQL/WENCO real en este derivado
  público.

## Ejecución local

```powershell
# Backend
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8001

# Frontend (otra terminal)
cd frontend
npm install --legacy-peer-deps
npm run dev
# abrir http://localhost:5173
```

## Credenciales demo

| Usuario | Contraseña | Acceso |
|---|---|---|
| admin | admin | Total |
| demo | demo | Ejecutivo |
| supervisor | supervisor | Operacional + análisis + exportación |
| operador | operador | Turno + flota + alertas |

## Módulos principales

| Módulo | Ruta | Descripción |
|---|---|---|
| Decision Cockpit | `/dashboard` | Costos, riesgo y acción — vista ejecutiva principal |
| Turno Actual | `/turno` | KPI en vivo, estado CAEX hora a hora |
| Producción | `/produccion` | Tonelaje vs plan, heatmap operacional |
| Rendimiento | `/rendimiento` | Heatmap 7×24h, curva promedio por hora |
| Flota | `/flota` | Ranking de CAEX, eficiencia por modelo |
| Carguío | `/carguio` | Palas activas, ciclos y ton/ciclo |
| Averías | `/averias` | Inactividad y fallas de equipos |
| Alertas | `/alertas` | Alertas operacionales con drill-down |
| Comparativa | `/comparativa` | Dos períodos lado a lado |
| Predicción ML | `/prediccion` | Proyección con banda de confianza |
| Simulador | `/simulador` | Escenarios de cruce de meta |
| Vista Aérea | `/aerea` | Mapa con posición de equipos |
| Mapa Operacional 3D | `/operational-map-3d` | Constelación de datos en 3D |

NORTHMINE AI (el orbe, abajo a la derecha) está disponible en cualquier
módulo — investiga, navega y responde con evidencia real de los datos
sintéticos de la demo.

## Contacto

**NORTHMINE Intelligence** — Simón Mazuela R. — master.robless@gmail.com

## Documentación

| Tema | Dónde |
|---|---|
| Producto (audiencia, promesa, alcance de la demo) | `PRODUCT.md` |
| Diseño del sitio público (tipografía, color, motion) | `DESIGN.md` |
| Deployment en Seenode | `README_SEENODE_PUBLIC_DEMO.md` |
| Seguridad (hallazgos, estado, advertencias) | `docs/PLAN_MAESTRO_SEGURIDAD.md` |
| Persistencia de solicitudes de acceso a demo | `docs/demo-access-persistence.md` |
| Gobernanza histórica (tiers demo/piloto/producción del repo canónico) | `docs/archive/DEVOPS_QA_TIERS.md` — no aplica directamente a este derivado público |

## Política documental

- No crear archivos `.md` nuevos por defecto. Antes de documentar algo,
  verificar si ya pertenece a una fuente vigente existente de la tabla de
  arriba.
- Un tema tiene una sola fuente vigente de verdad — no duplicar entre
  documentos.
- Resultados de tests, corridas, métricas, screenshots y traces viven como
  artefactos estructurados (no como `.md` de reporte).
- Documentos históricos no compiten con la documentación activa — van a
  `docs/archive/`, claramente marcados como tal.
- No crear un `.md` por etapa, fix, sesión, prueba o deployment.
