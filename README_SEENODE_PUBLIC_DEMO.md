# Seenode public demo

Esta carpeta esta preparada para publicar NORTHMINE como demo publica sin subir datos locales ni credenciales.

## Arquitectura recomendada

Usar un solo Web Service en Seenode desde la raiz del repo. En este modo FastAPI
sirve la API y tambien el build React, por lo que login y datos usan el mismo
dominio publico.

- Root Directory: raiz del repo
- Build Command: `npm run build`
- Start Command: `npm start`
- Port: usar el puerto asignado por Seenode mediante `PORT`
- Environment Variables: copiar `backend/.env.seenode.example` y reemplazar secretos.

Credenciales demo:

- `admin` / `admin`
- `demo` / `demo`
- `supervisor` / `supervisor`
- `operador` / `operador`

El frontend solo debe usar `VITE_API_URL` si se decide separar frontend y backend
en dos servicios. En el despliegue de un solo servicio, dejar `VITE_API_URL` vacio
para que use el mismo dominio.

## Orden de despliegue

1. Subir esta carpeta a GitHub o GitLab.
2. Crear o actualizar un Web Service desde la raiz del repo.
3. Configurar `npm run build` como Build Command.
4. Configurar `npm start` como Start Command.
5. Configurar variables demo y secretos.
6. Redeploy.
7. Probar `/health` y luego entrar al frontend con usuario demo.

## Seguridad antes de publicar

- No subir `.env`, `.env.local`, bases `.db`, llaves `.local`, logs, `pids`, `.venv`, `node_modules` ni `dist`.
- Mantener `ENVIRONMENT=demo` para esta demo publica.
- No configurar credenciales WENCO/SQL en este despliegue.
- Usar secretos largos y distintos para `SECRET_KEY`, `REFRESH_SECRET_KEY` y `PASSWORD_SALT`.
- Considerar acceso privado o autenticacion adicional si el demo se comparte con clientes especificos.

## Base de datos para solicitudes de demo

Las solicitudes del formulario `/solicitar-demo` (evaluacion tecnica / pedir demo) se
guardan en la tabla `demo_access_requests` y se revisan en `/admin/demo-access` con
usuario `admin`. El backend crea la tabla automaticamente al iniciar.

En seenode el servicio web exige un almacen durable (`NORTHMINE_DEMO_ACCESS_REQUIRE_DURABLE=true`),
asi que sin base configurada el formulario responde 503 y no guarda nada. Para habilitarlo:

1. En el dashboard de seenode: **Databases** -> **Create** -> **PostgreSQL** (el tier mas bajo basta).
2. Copiar el connection string de la base creada.
3. En el Web Service -> pestaña **Environment**, agregar:
   - `DATABASE_URL` = el connection string del paso 2.
   - `NORTHMINE_DEMO_ACCESS_FINGERPRINT_KEY` = clave estable de 64 caracteres
     (minimo 32) para el deduplicado de solicitudes. Generar con
     `python -c "import secrets; print(secrets.token_hex(32))"`.
4. Redeploy y probar: enviar el formulario y revisar `/admin/demo-access` (admin/admin).

Referencia de variables en `backend/.env.seenode.example`.

## Generar secretos

Usar estos comandos locales y copiar cada salida a Seenode:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
python -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
```

El primer comando sirve para `SECRET_KEY`, `REFRESH_SECRET_KEY` y `PASSWORD_SALT`. El segundo sirve para `AUDIT_ENCRYPTION_KEY`.

## Comandos locales utiles

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
$env:ENVIRONMENT='demo'
$env:NORTHMINE_MODE='demo'
$env:NORTHMINE_DATA_MODE='DEMO'
$env:NORTHMINE_DEMO_MODE='true'
$env:NORTHMINE_LOCAL_AUTO_SYNC_ENABLED='false'
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001
```

Frontend:

```powershell
cd frontend
npm ci
$env:VITE_API_URL='http://127.0.0.1:8001'
npm run dev
```

