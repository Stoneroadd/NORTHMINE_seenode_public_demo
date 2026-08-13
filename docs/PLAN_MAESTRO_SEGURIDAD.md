# Plan Maestro de Seguridad — NORTHMINE/NORTHREACT

> **Documento histórico de seguridad. Los hallazgos y estados deben validarse
> contra el código actual antes de utilizarse como referencia operativa.**

Registro de hallazgos de una auditoría de 3 frentes (backend `backend/app`, documentación de gobernanza, frontend `frontend/src`) realizada 2026-07-29. Cada hallazgo tiene severidad, evidencia (archivo:línea) y una acción concreta. Organizado en oleadas de remediación; Oleada 1 ya se aplicó en esta misma pasada, el resto queda como hoja de ruta.

**Actualización 2026-07-29 (mismo día):** al preparar la publicación del demo en `NORTHMINE_seenode_public_demo` se encontró que ese repo ya tenía una implementación independiente, más madura, de gran parte de la Oleada 2/3 — rotación de refresh token de un solo uso con detección de reintento (tabla `refresh_sessions`), invalidación por `auth_version` (un contador por usuario que revoca todos los tokens vigentes en logout/cambio de password/cambio de rol/desactivación), rate limiting y brute-force lockout respaldados por Redis con fallback seguro a memoria, y una corrección real de bypass de MFA no catalogada antes (ver V-24). Esa implementación se portó hacia `NORTHREACT_actualizado` y `C:\NORTHREACT`, verificada de punta a punta (login → refresh → reintento del refresh viejo → logout → token viejo rechazado → MFA con código incorrecto rechazado).

Ver también: `docs/archive/DEVOPS_QA_TIERS.md` (gates de tier y registro de riesgos operacionales/arquitectónicos — no se duplica acá). La deuda técnica y el backlog de Épicas referenciados originalmente en `ARCHITECTURE.md` §6 / `docs/DIAGNOSTICO_ARQUITECTURA_2026-07.md` pertenecen al repositorio canónico `NORTHREACT` y no están incluidos en este repositorio público.

Convención de estado: ✅ Resuelto · 🔶 Pendiente.

---

## Oleada 1 — P0, bajo esfuerzo, bloquean cualquier despliegue real

| ID | Hallazgo | Evidencia | Acción | Estado |
|---|---|---|---|---|
| V-01 | `SECRET_KEY`/`REFRESH_SECRET_KEY` leídos por dos rutas independientes (`os.environ` directo en `security.py` vs `Settings` en `config.py`) con el mismo literal de fallback duplicado — riesgo de que diverjan si se toca uno sin el otro. | `backend/app/core/security.py:12-13` (antes) | `security.py` ahora importa `get_settings()` de `config.py` y toma `secret_key`/`refresh_secret_key` de ahí — una sola fuente de verdad, cubierta por `production_errors()`. | ✅ Resuelto |
| V-02 | `AUDIT_ENCRYPTION_KEY` sin validar en `production_errors()`, y generada al azar (`Fernet.generate_key()`) en cada arranque si la env var no está seteada → todo lo cifrado antes del reinicio queda ilegible para siempre. | `backend/app/core/crypto.py:8-13` (antes) | Se agregó `audit_encryption_key` a `Settings` con fallback fijo (no aleatorio), se agregó el mismo chequeo que `SECRET_KEY` a `production_errors()`, y `crypto.py` ahora usa `get_settings().audit_encryption_key` en vez de generar una clave al azar. | ✅ Resuelto |
| V-03 | `northmine_users.db` y `northmine_audit.db` trackeados en git pese a la regla `*.db` del `.gitignore` — contienen hashes de password (bcrypt cost=4, datos de prueba) y filas de audit log con tokens. | `git ls-files` (raíz del repo) | `git rm --cached northmine_audit.db northmine_users.db` — dejan de trackearse desde el próximo commit, los archivos locales siguen intactos para la demo. No se reescribió historia de git (son artefactos de prueba, no secretos reales; purgar historia es una operación mucho más invasiva, queda fuera de este pase). | ✅ Resuelto |
| V-04 | `/health` (sin autenticación) devolvía `production_errors` completo y `cors_origins` a cualquier visitante — revela exactamente qué está mal configurado en una instancia. | `backend/app/core/health.py:45-50` (antes), ruta sin `Depends` en `routes.py:484-485` | `checks.cors_origins` y `checks.production_errors` ahora solo se incluyen si `not settings.is_production`. `status`/`production_ready` (booleano) se mantienen siempre visibles para monitoreo externo. | ✅ Resuelto |
| V-05 | `/docs`, `/redoc`, `/openapi.json` siempre activos sin importar el entorno — expone toda la superficie de la API (rutas, schemas, flujo de auth bearer) sin autenticación. | `backend/app/main.py:28-34` (antes) | `docs_url`/`redoc_url`/`openapi_url` ahora son `None` cuando `settings.is_production` es `True`. | ✅ Resuelto |

**Verificación pendiente de esta oleada:** correr `backend/.venv/Scripts/python.exe -B scripts/smoke_backend.py` y reiniciar el demo local para confirmar que `/health`, `/docs` y el login siguen funcionando igual en modo demo (donde `is_production` es `False`, así que nada de esto cambia el comportamiento actual del demo — solo lo hace explícito para cuando `ENVIRONMENT=production`).

---

## Oleada 2 — P1, endurecer antes de piloto con usuarios reales

| ID | Hallazgo | Evidencia | Acción sugerida | Estado |
|---|---|---|---|---|
| V-06 | Logout no revoca el refresh token, solo el access token — ventana de hasta 7 días donde un token robado/filtrado sigue sirviendo para mintear access tokens nuevos tras el logout. | `backend/app/api/routes.py` (`logout()`) | Logout ahora llama a `_invalidate_auth_sessions()`, que bumpea `auth_version` del usuario en DB — todo access y refresh token emitido antes queda inválido de inmediato (`dependencies.py`/`refresh_token()` comparan `payload["auth_version"]` contra el valor actual). | ✅ Resuelto |
| V-07 | `/api/auth/refresh` acepta el token también por body JSON, no solo por cookie — debilita la protección CSRF que da `SameSite=strict` en la cookie httpOnly. | `backend/app/api/routes.py` (`refresh_token()`) | Se quitó el parámetro `body`; el endpoint ahora solo acepta el refresh token vía cookie `httpOnly`. Verificado: un intento con `{"refresh_token": "..."}` en el body sin cookie devuelve 401. | ✅ Resuelto |
| V-08 | Refresh token devuelto en el body JSON de login además de setearse como cookie httpOnly — si el frontend llegara a persistirlo en storage accesible por JS, anula parte del propósito de la cookie httpOnly. | `backend/app/api/routes.py` (`login()`, `refresh_token()`) | Se quitó `"refresh_token"` de ambas respuestas JSON; el token vive solo en la cookie httpOnly. Confirmado que el frontend (`authService.saveSession`) ya descartaba ese campo, así que no requirió cambios en frontend. | ✅ Resuelto |
| V-09 | Rate limiting (`slowapi`) y brute-force lockout (`brute_force.py`) son solo en memoria de proceso — no funcionan si hay más de un worker/instancia (cada uno con su propio contador). | `backend/app/core/rate_limit.py`, `backend/app/core/brute_force.py` | Ambos ahora usan Redis cuando `NORTHMINE_REDIS_URL` está configurada (`get_redis_client()` en `core/distributed.py`), con fallback automático a memoria si no lo está (comportamiento actual sin cambios en demo/local). En producción, `config.py` exige `redis_url` con TLS autenticada (`rediss://` + password) o falla el arranque. | ✅ Resuelto |
| V-10 | Backup codes de MFA guardados en texto plano en la DB; MFA es enteramente opt-in por usuario, sin política de "MFA obligatorio para ADMIN". | `backend/app/core/mfa.py` | La comparación de backup codes ahora usa `hmac.compare_digest` (antes `==`, vulnerable a timing attack) — ver V-24 para el hallazgo más serio encontrado en el mismo archivo. El hasheo de los backup codes en DB y la política de MFA obligatorio para ADMIN siguen sin implementar. | 🔶 Pendiente (parcial) |
| V-11 | CSP con `script-src 'self' 'unsafe-inline'` — reduce buena parte del valor anti-XSS de tener CSP. | `backend/app/core/security_headers.py:18-26` | `script_inline` ahora es condicional: solo se agrega `'unsafe-inline'` fuera de producción (necesario para el script inline de Swagger/ReDoc, que de por sí ya está deshabilitado en producción por V-05). En producción, `script-src` queda `'self'` estricto. | ✅ Resuelto |
| V-12 | `ENVIRONMENT` es un string libre sin validación de enum — cualquier valor que no sea exactamente `"production"` se trata como no-producción, incluyendo typos, y no hay ningún check "fail-closed" si viene vacío/desconocido. | `backend/app/core/config.py` | Se agregó `_VALID_ENVIRONMENTS` (`development`/`testing`/`demo`/`production`) y una property `startup_errors` que antepone un error explícito si `ENVIRONMENT` no es uno de esos valores, antes de evaluar `production_errors()`. `require_production_safe()` ahora llama a `startup_errors`. | ✅ Resuelto |
| V-13 | Frontend guarda el access token en `localStorage` (`northmine2.auth.session`) — exfiltrable por XSS si alguna vez aparece un vector de inyección. El refresh token sí está correctamente solo en cookie httpOnly. | `frontend/src/services/authService.ts:4,58`; `frontend/src/lib/secureApi.ts:6,31-42` | Es un trade-off documentado, no un bug — decidir conscientemente si se acepta (mitigado hoy por: no hay `dangerouslySetInnerHTML` en todo el frontend, TTL corto de 30 min) o si se migra el access token a memoria (zustand/contexto) sin persistir en storage. | 🔶 Pendiente |
| V-14 | `frontend/src/pages/LoginPage.tsx` es una pantalla de login alterna, no conectada al routing actual (código muerto), con un fallback `rol: data.rol ?? 'admin'` que otorgaría rol admin si el backend alguna vez omite `rol` en la respuesta. | `frontend/src/pages/LoginPage.tsx:23-31` | Confirmado sin ninguna referencia en `App.tsx` ni en el resto del frontend (grep vacío) — eliminado por completo. | ✅ Resuelto |
| V-15 | `app/models/security.py` define `LoginRequestSecure`/`RefreshRequest` (con validación de charset y blocklist de keywords SQL) pero `routes.py` usa los modelos más débiles (`LoginRequest` de `schemas.py`, solo validación de longitud). | `backend/app/models/security.py`; uso real en `backend/app/api/routes.py` | Confirmado huérfano (0 usos, a diferencia de `SimulatorRequestSecure`/`AIAnalysisRequestSecure`, que sí están conectados). Se eliminó en vez de conectarlo: las queries ya son parametrizadas (sin riesgo real de inyección SQL) y el blocklist de contraseña rechazaría contraseñas legítimas con apóstrofes/punto y coma — costo de UX sin beneficio de seguridad real. | ✅ Resuelto |
| V-16 | `test_rate_limit_login_enforced` acepta tanto un 429 como un 401 como "passing" — no puede fallar aunque el rate limiting esté completamente roto. | `backend/tests/test_sprint10.py:80-86` | Aserción reescrita para exigir 429 explícito. | ✅ Resuelto |
| V-24 | **(Nuevo)** Confirmación de setup de MFA (`POST /auth/mfa/verify`) usaba `verify_mfa_code()`, que trata "MFA no habilitado" como aprobación automática — en ese punto del flujo `mfa_enabled` todavía es `False` (se activa recién después), así que el endpoint aceptaba cualquier código (o ninguno) como válido. Un atacante con una sesión robada podía "activar" MFA plantando un secreto propio sin demostrar jamás tener la app autenticadora, dejando un backdoor persistente. | `backend/app/api/routes.py` (`mfa_verify()`), `backend/app/core/mfa.py` | Se agregó `verify_totp_code(secret, code)`, que valida el TOTP puntualmente sin el atajo de auto-aprobación; `mfa_verify()` ahora la usa en vez de `verify_mfa_code()`. Verificado: un código incorrecto en `/auth/mfa/verify` ahora devuelve 400. | ✅ Resuelto |

## Oleada 3 — P2, endurecimiento continuo

| ID | Hallazgo | Evidencia | Acción sugerida | Estado |
|---|---|---|---|---|
| V-17 | `mfa.py` hardcodea `Path("northmine_audit.db")` ignorando `NORTHMINE_AUDIT_DB`, que todo el resto de la app sí respeta — si se reubica la DB de auditoría vía env var, MFA seguiría leyendo/escribiendo en la ruta relativa por defecto. | `backend/app/core/mfa.py:13` | Ahora lee `os.environ.get("NORTHMINE_AUDIT_DB", "northmine_audit.db")`, igual que `core/audit.py` y `core/database.py`. | ✅ Resuelto |
| V-18 | `webhooks.py` lee `ENVIRONMENT` directo de `os.environ` al importar el módulo, en vez de pasar por `Settings`/`get_settings()` — riesgo de drift si algún día difieren. | `backend/app/core/webhooks.py:8,20` | Reemplazar por `get_settings().is_development`. | 🔶 Pendiente |
| V-19 | `is_token_blacklisted` falla abierto (devuelve `False`, "no está blacklisteado") si la DB de auditoría no responde — un token revocado seguiría siendo válido durante una caída de esa DB. | `backend/app/core/audit.py` | Ahora levanta `AuditStoreUnavailable` en vez de devolver `False` silenciosamente. `dependencies.py` la captura y devuelve 503 explícito; `main.py` tiene un handler global de respaldo para cualquier otro punto donde se levante. Mismo patrón aplicado a `blacklist_token`, `register_refresh_session`, `rotate_refresh_session`, `save_password_history`, `get_password_history` — todas fallan cerrado ahora en vez de silencioso. | ✅ Resuelto |
| V-20 | Sin escaneo automático de dependencias — no hay `pip-audit`/`bandit` en `requirements-dev.txt` ni `npm audit` en el flujo de trabajo del frontend. | `backend/requirements-dev.txt` | Correr `pip-audit` y `npm audit` manualmente antes de cada deploy (ver cadencia en `docs/archive/DEVOPS_QA_TIERS.md` §4); considerar agregarlos a `requirements-dev.txt`. | 🔶 Pendiente |
| V-21 | Sin CI/CD — todos los gates (`docs/archive/DEVOPS_QA_TIERS.md` §3) son manuales. Ya identificado como R-P1-05. | — | Automatizar en GitHub Actions (o similar) cuando el proyecto lo justifique; no se monta en este pase. | 🔶 Pendiente |
| V-22 | Anomalías de versión en el frontend: `axios` resuelto en `1.18.1` vs declarado `^1.7.2` en `package.json` (salto mayor no explicado por el rango); `@types/node` declarado `^26.1.0` (no existe esa versión de Node). | `frontend/package.json`, `frontend/package-lock.json` | Revisar y corregir el rango de `axios` y el pin de `@types/node`, luego `npm install` para regenerar el lockfile de forma consistente. | 🔶 Pendiente |
| V-23 | `/admin/system` (solo ADMIN) devuelve hasta 240 caracteres crudos de líneas de log que contengan "ERROR"/"TRACEBACK"/"EXCEPTION" — si algún log llega a incluir datos sensibles, se expone tal cual en la respuesta de la API. | `backend/app/core/monitoring.py:29-47` | Buena práctica de higiene de logs a futuro: evitar loguear datos sensibles en primer lugar; de lo contrario, redactar antes de exponer por API. | 🔶 Pendiente |

## Hallazgos incidentales al cerrar V-11/V-14/V-15/V-16 (2026-07-30)

Al correr la suite completa de tests para verificar estos 4 cierres, aparecieron dos problemas reales causados por el propio backport de seguridad de la Oleada 2 (no por V-11/14/15/16), más varios pre-existentes sin relación:

- **`conftest.py` no arrancaba en absoluto** (`RuntimeError: AUDIT_ENCRYPTION_KEY no esta definida`): el backport de config.py cambió el valor por defecto de `ENVIRONMENT` de `"development"` a `"production"` (fail-closed intencional — "un servidor mal configurado por accidente debe detenerse, no volverse permisivo"), pero `conftest.py` solo fijaba `ENVIRONMENT=testing` dentro de un fixture (`_init_db`), que corre DESPUÉS de `from app.main import app` — demasiado tarde para el chequeo a nivel de módulo en `crypto.py`. Se agregó `os.environ.setdefault("ENVIRONMENT", "testing")` al inicio de `conftest.py`, junto a la línea equivalente ya existente para `BCRYPT_ROUNDS`. **Este mismo bug existe hoy en `NORTHMINE_seenode_public_demo` también** (confirmado corriendo su propia suite) — no se corrigió ahí en este pase, queda como hallazgo a reportar.
- **`test_password_history_mining_requirement` fallaba con 401**: consecuencia directa y esperada de V-06 (logout/cambio de password invalida `auth_version`) — el test reutilizaba el mismo token a través de 5 cambios de contraseña sucesivos. Se corrigió para re-loguear (con `limiter.reset()` para no chocar con el rate limit de `/api/auth/login`) después de cada cambio.
- **Hallazgo nuevo, fuera de alcance, NO corregido**: `backend/app/services/kpis.py:1754` tiene `"source": source` con `source` sin definir (`NameError`) — rompe `build_shift_report()` cada vez que se llama. Afecta 5 tests (`test_shift_report.py` x2, `test_shift_export.py` x3) y probablemente cualquier llamada real a ese endpoint. Introducido en un commit anterior no relacionado con el trabajo de seguridad de esta sesión (`5eb2824`/`e4cb78c`).
- **Hallazgo nuevo, fuera de alcance, NO corregido**: 8 tests (`test_performance.py` x6, `test_security_hardening.py::test_revoke_user_tokens`) siguen llamando a `/api/demo/summary`, que está permanentemente deshabilitado (`_real_only_error`, siempre 410) — el mensaje de error del propio endpoint sugiere migrar a `/api/summary`. Tests desactualizados respecto a un endpoint ya removido, no relacionado con esta sesión.

Tras estas correcciones: **114/127 tests pasan** (antes: 0/127, la suite ni siquiera podía recolectar tests). Los 13 restantes son los dos hallazgos nuevos de arriba.

## Oleada 4 — estructural (trackeado en el diagnóstico arquitectónico del repositorio canónico `NORTHREACT`, no incluido en este repositorio público — solo referenciado acá)

- Fuga de datos ficticios en modo "real" SQL — Épica 11 del diagnóstico arquitectónico (repositorio canónico `NORTHREACT`).
- Aislamiento multi-tenant (`faena`/`empresa`) no forzado — Épica 10 (HU-10.5: auditoría de acceso cruzado entre tenants, propuesta, no implementada; repositorio canónico `NORTHREACT`).
- Cumplimiento regulatorio (SERNAGEOMIN, logs inmutables) — mencionado en el roadmap operacional del repositorio canónico `NORTHREACT`, puramente aspiracional, sin diseño.
- 0 tests de frontend — debt #8 del diagnóstico arquitectónico (repositorio canónico `NORTHREACT`), DIAG-7 en `docs/archive/DEVOPS_QA_TIERS.md`.

---

## Referencia — endpoints de gestión de sesión y seguridad

Endpoints introducidos por el hardening de sesión/password (confirmados
vigentes en `backend/app/api/routes.py`, no forman parte de la numeración
V-NN de hallazgos):

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/auth/logout` | Cualquiera | Blacklistea el token e invalida `auth_version` del usuario. |
| POST | `/api/auth/change-password` | Cualquiera | Cambia password validando historial y fortaleza. |
| POST | `/api/admin/revoke-user-tokens/{user_id}` | Admin | Revoca todos los tokens de un usuario. |
| GET | `/api/admin/metrics` | Admin | Métricas de seguridad. |

## Cadencia de auditoría

Ver `docs/archive/DEVOPS_QA_TIERS.md` §4 — no se duplica acá. En resumen: gate pre-deploy obligatorio (sección 3 de ese documento), re-auditoría de 3 frentes antes de cada hito mayor (piloto/producción), y escaneo de dependencias manual al agregar una librería nueva.
