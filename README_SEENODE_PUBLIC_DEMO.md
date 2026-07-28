# Seenode public demo

Esta carpeta esta preparada para publicar NORTHMINE como demo publica sin subir datos locales ni credenciales.

## Arquitectura recomendada

Crear dos Web Services en Seenode desde el mismo repo:

1. Backend FastAPI
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port 80`
   - Port: `80`
   - Environment Variables: copiar `backend/.env.seenode.example` y reemplazar URLs/secretos.

2. Frontend React/Vite
   - Root Directory: `frontend`
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm start`
   - Port: `8080`
   - Environment Variables: copiar `frontend/.env.seenode.example` y reemplazar `VITE_API_URL` por la URL publica del backend.

## Orden de despliegue

1. Subir esta carpeta a GitHub o GitLab.
2. Crear primero el servicio backend en Seenode.
3. Copiar la URL publica del backend en `VITE_API_URL` del frontend.
4. Crear el servicio frontend.
5. Copiar la URL publica del frontend en `NORTHMINE_CORS_ORIGINS` del backend.
6. Redeploy backend y frontend.
7. Probar `/health` del backend y luego entrar al frontend con usuario demo.

## Seguridad antes de publicar

- No subir `.env`, `.env.local`, bases `.db`, llaves `.local`, logs, `pids`, `.venv`, `node_modules` ni `dist`.
- Mantener `ENVIRONMENT=demo` para esta demo publica.
- No configurar credenciales WENCO/SQL en este despliegue.
- Usar secretos largos y distintos para `SECRET_KEY`, `REFRESH_SECRET_KEY` y `PASSWORD_SALT`.
- Considerar acceso privado o autenticacion adicional si el demo se comparte con clientes especificos.

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

