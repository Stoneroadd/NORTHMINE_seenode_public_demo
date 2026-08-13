# DevOps/QA Tiers — Demo, Piloto, Producción

Documento único de gobernanza operacional para NORTHMINE Intelligence (NORTHREACT). Reemplaza la referencia rota que citaban `README.md`, `CHECKLIST_OPERACIONAL.md` y `ROADMAP_OPERACIONAL.md` — consolida en un solo lugar lo que antes estaba repetido y fragmentado en esos tres archivos, sin duplicar su contenido operativo detallado (para procedimientos paso a paso de arranque/administración de usuarios, seguir usando `CHECKLIST_OPERACIONAL.md`).

Ver también: `docs/PLAN_MAESTRO_SEGURIDAD.md` (registro de hallazgos de seguridad con severidad y remediación) y `ARCHITECTURE.md` §6 (deuda arquitectónica conocida) y `docs/DIAGNOSTICO_ARQUITECTURA_2026-07.md` (backlog de Épicas HU-x.y).

---

## 1. Definición de tiers

| Tier | Requisitos | Bloquea el paso al siguiente tier si falla |
|---|---|---|
| **Demo** | Datos sintéticos, `NORTHMINE_MODE=demo`/`ENVIRONMENT=demo`, credenciales demo permitidas, CORS local. Build frontend y smoke backend en verde. | Demo comercial si falla build/smoke. |
| **Piloto** | Usuarios reales con roles propios (sin cuentas compartidas), datos exportados/acotados o SQL en prueba, mapeo de campos (CAEX/carguio/operador/fase/origen/destino/material/estados/demoras) validado, comparación de KPIs contra reporte operacional vigente, evidencia UAT. | Piloto con datos reales si sigue activo el demo login. |
| **Producción** | `ENVIRONMENT=production`, `NORTHMINE_MODE=sql` con fuente homologada, `NORTHMINE_DEMO_MODE=false`, `NORTHMINE_ALLOW_DEMO_LOGIN=false`, arranque sin errores de `require_production_safe()`, secretos reales (no fallback demo), CORS sin `localhost`, HTTPS/TLS, backups probados (usuarios/auditoría/fuente operacional), monitoreo + alertas + runbook + rollback + contacto de soporte, smoke HTTP autenticado contra el ambiente final. | Go-live si cualquier riesgo P0 de la sección 2 sigue abierto. |

## 2. Registro de riesgos unificado

Fusiona la tabla operativa de `ROADMAP_OPERACIONAL.md` (P0/P1) con el registro arquitectónico de `docs/DIAGNOSTICO_ARQUITECTURA_2026-07.md` §4. Se mantienen los IDs originales de cada documento fuente para no romper referencias cruzadas ya existentes (HU-x.y, etc.).

### P0 — bloquean producción

| ID | Riesgo | Mitigación | Fuente |
|---|---|---|---|
| R-P0-01 | Conector WENCO/SQL no cerrado ni homologado. | Sprint SQL, comparación KPI vs reporte actual y UAT. | ROADMAP_OPERACIONAL.md |
| R-P0-02 | Producción con demo mode, demo login, secretos fallback o CORS localhost. | Dry-run `require_production_safe()`, secret manager y config productiva. Ver `docs/PLAN_MAESTRO_SEGURIDAD.md` V-01/V-02/V-12 para los gaps concretos en el código que hacen esto posible hoy. | ROADMAP_OPERACIONAL.md |
| R-P0-03 | Piloto con datos reales usando cuentas demo o passwords compartidas. | Usuarios reales, roles, MFA si aplica y auditoría. | ROADMAP_OPERACIONAL.md |
| R-P0-04 | Backups/restore no probados para usuarios, auditoría o fuente operacional. | Prueba de restauración y retención definida. | ROADMAP_OPERACIONAL.md |
| DIAG-1 | `_guess_modelo()` hardcodeado → KPIs de flota por modelo incorrectos en modo `sql`, silenciosamente. | HU-2.1; corto plazo: warning visible en UI de "mix de flota no verificado". | DIAGNOSTICO_ARQUITECTURA §4 |
| DIAG-2 | `wenco_data.py` sin fallback ante caída de SQL Server → dashboard completo caído en turno (ya hubo incidente ~1h). | HU-2.3 + HU-2.2, con rollback y ventana de prueba fuera de turno. | DIAGNOSTICO_ARQUITECTURA §4 |
| DIAG-5 | Cambiar puerto/proceso backend en horario de turno activo → corta el dashboard en medio de la operación. | Desplegar fuera de turno; rollback = revertir env var / redeploy versión anterior. | DIAGNOSTICO_ARQUITECTURA §4 |

### P1 — endurecer antes de piloto/producción estable

| ID | Riesgo | Mitigación | Fuente |
|---|---|---|---|
| R-P1-01 | Schema WENCO distinto al esperado. | Consulta exploratoria y contrato de mapeo por campo. | ROADMAP_OPERACIONAL.md |
| R-P1-02 | Drift entre backend, frontend y `docs/API_CONTRACT.md` (ya marcado desactualizado). | Revisar rutas con `rg "@router\." backend\app\api` en cada release. | ROADMAP_OPERACIONAL.md |
| R-P1-03 | ML demo interpretado como modelo productivo. | Rotular demo y entrenar/validar con histórico real. | ROADMAP_OPERACIONAL.md |
| R-P1-04 | Vista aérea/TIF no productizada. | Probar archivo real, preprocesar tiles/imágenes y cachear metadata. | ROADMAP_OPERACIONAL.md |
| R-P1-05 | Checks manuales sin CI/CD. | Automatizar build, smoke, tests backend y `scripts\validate_security.bat`. Ver `docs/PLAN_MAESTRO_SEGURIDAD.md` V-21. | ROADMAP_OPERACIONAL.md |
| DIAG-3 | Puertos compartidos dev/demo → imposible probar cambios durante una demo de venta, o arranque cruzado accidental. | HU-3.1/3.2. | DIAGNOSTICO_ARQUITECTURA §4 |
| DIAG-4 | `NORTHMINE_MODE` vs `NORTHMINE_DEMO_MODE` contradictorios → confusión sobre qué datos se muestran (ya observado en `.env` local). | HU-2.4. | DIAGNOSTICO_ARQUITECTURA §4 |
| DIAG-6 | Ranking de Operadores sintético mostrado sin distinción clara a supervisores (riesgo reputacional/confianza). | Traducir/destacar visualmente `data_mode` en `OperatorAuditDrawer.tsx`. | DIAGNOSTICO_ARQUITECTURA §4 |
| DIAG-7 | 0 tests frontend → cambios en `store`/`secureApi` sin red de seguridad automatizada. | Épica 5. | DIAGNOSTICO_ARQUITECTURA §4 |

**Cerrado:** R-RES-01 (`POST /api/auth/login` respondía 422 en smoke/TestClient) — cerrado 2026-06-06, mantener como test de regresión en cada sprint.

Para los hallazgos de seguridad específicos a nivel de código (secretos hardcodeados, exposición de `/health`, MFA, rate limiting, etc.) ver el registro completo con severidad P0/P1/P2 en `docs/PLAN_MAESTRO_SEGURIDAD.md` — no se duplican acá.

## 3. Comandos reproducibles

```powershell
# Frontend
cd frontend
npm run lint
npm run build

# Backend
cd backend
python -m compileall app
python check_system.py
python -B ..\scripts\smoke_backend.py

# Seguridad pre-deploy
scripts\validate_security.bat

# Inventario de rutas API (detectar drift vs docs/API_CONTRACT.md)
rg "@(router|app)\.(get|post|put|patch|delete)\(" backend\app -n
```

## 4. Cadencia de auditoría

Proyecto de un solo desarrollador — cadencia liviana, no un proceso de comité:

- **Pre-deploy** (todo tier): correr la sección 3 completa + `scripts\validate_security.bat`. Tratar cualquier fallo como bloqueante.
- **Antes de cada hito mayor** (entrar a piloto, entrar a producción): repetir una auditoría de 3 frentes (backend / documentación de gobernanza / frontend) para detectar drift respecto a `docs/PLAN_MAESTRO_SEGURIDAD.md`.
- **Al agregar una dependencia nueva**: correr `pip-audit` (Python) / `npm audit` (Node) manualmente — no hay CI/CD todavía (R-P1-05).
- **Gates de piloto y producción**: usar el checklist detallado ya existente en `CHECKLIST_OPERACIONAL.md` (secciones "Gate de piloto" y "Gate de producción") — este documento no lo repite.
