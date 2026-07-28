# NORTHMINE 2.0 - Security Hardening

## Resumen

Hardening de seguridad para preparar conexion a datos reales mineros.

## Cambios realizados

### Backend

| Archivo | Cambio |
|---------|--------|
| `app/core/security.py` | Migracion SHA256 a bcrypt. Funciones `hash_password`, `verify_password`. |
| `app/core/audit.py` | Tablas `token_blacklist` y `password_history`. Funciones de auditoria y sesiones. |
| `app/core/dependencies.py` | `get_current_user` verifica blacklist de tokens. |
| `app/core/config.py` | Campos `password_history_count`, `session_timeout_minutes`, `bcrypt_rounds`. |
| `app/api/routes.py` | Endpoints `POST /auth/logout`, `POST /auth/change-password`, `POST /admin/revoke-user-tokens/{user_id}`, `GET /admin/metrics`. |
| `app/main.py` | Startup llama `init_security_tables()`. |
| `app/models/schemas.py` | Nuevos modelos `ChangePasswordRequest` y `SecurityMetricsResponse`. |
| `requirements.txt` | Dependencia `bcrypt`. |

### Frontend

| Archivo | Cambio |
|---------|--------|
| `src/services/authService.ts` | `logout()` llama `POST /api/auth/logout` antes de limpiar `localStorage`. |
| `src/components/layout/AppShell.tsx` | `handleLogout` es asincrono. |
| `src/hooks/useIdleTimeout.ts` | Hook de inactividad. |
| `src/components/ui/IdleTimeoutBanner.tsx` | Banner superior de timeout. |
| `src/App.tsx` | Integra timeout de sesion. |
| `src/components/settings/SettingsPanel.tsx` | Seccion para cambio de contrasena. |
| `src/store/index.ts` | Estados nuevos para timeout y cambio de contrasena. |

### Tests

| Archivo | Descripcion |
|---------|-------------|
| `tests/conftest.py` | Fixtures de cliente y login. |
| `tests/test_security_hardening.py` | Tests de roles, brute force, blacklist, password history, metrics y revoke. |

### Scripts

| Archivo | Descripcion |
|---------|-------------|
| `scripts/validate_security.bat` | Validacion pre-deploy: secrets, tests, docs, audit log y dependencias. |

## Endpoints nuevos

| Metodo | Ruta | Rol | Descripcion |
|--------|------|-----|-------------|
| POST | `/api/auth/logout` | Cualquiera | Blacklistea token y elimina refresh cookie. |
| POST | `/api/auth/change-password` | Cualquiera | Cambia password validando historial y fortaleza. |
| POST | `/api/admin/revoke-user-tokens/{user_id}` | Admin | Revoca todos los tokens de un usuario. |
| GET | `/api/admin/metrics` | Admin | Metricas de seguridad. |

## Variables de entorno nuevas

```env
PASSWORD_HISTORY_COUNT=5
SESSION_TIMEOUT_MINUTES=30
BCRYPT_ROUNDS=12
```

## Como probar

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest tests\test_security_hardening.py -v

cd ..\frontend
npm install --legacy-peer-deps
npm run build
```

## Notas

- Los tokens blacklisteados persisten hasta su expiracion natural.
- Los usuarios demo se hashean al iniciar el backend.
- Ejecutar `scripts\validate_security.bat` antes de cada deploy de produccion.
