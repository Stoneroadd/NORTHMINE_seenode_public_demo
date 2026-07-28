# NORTHMINE Backend

Backend FastAPI para NORTHMINE2. La imagen y el proceso sin `ENVIRONMENT`
explÃ­cito fallan cerrados como producciÃ³n; para desarrollo o demo hay que usar
un archivo `.env` explÃ­cito (`.env.development.example` o `.env.demo.example`).

## Instalacion local

```powershell
cd C:\NORTHMINE2\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Variables

Ver `.env.example`.

`ENVIRONMENT=demo` fuerza `NORTHMINE_MODE=demo`. En producciÃ³n se exige
`ENVIRONMENT=production`, `NORTHMINE_MODE=sql`, secretos distintos de al menos
32 caracteres, credenciales WENCO y orÃ­genes CORS HTTPS explÃ­citos.

La conexiÃ³n WENCO usa `Encrypt=yes;TrustServerCertificate=no`. Instala la CA
corporativa que firma el certificado SQL Server en el host o contenedor; no
habilites `NORTHMINE_SQL_TRUST_SERVER_CERTIFICATE` en producciÃ³n.
