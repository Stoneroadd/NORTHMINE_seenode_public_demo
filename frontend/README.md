# NORTHMINE Frontend

Frontend canonico del SaaS NORTHMINE2 en React, TypeScript y Vite.

## Sprint 1.1

Incluye:

- login premium conectado a `POST /api/auth/login`;
- dashboard ejecutivo conectado a `GET /api/demo/summary`;
- indicador de estado conectado a `GET /health`;
- layout SaaS con sidebar, topbar, cards KPI, graficos, alertas y tabla operacional;
- persistencia de sesion demo en `localStorage`.

## Ejecutar

Backend:

```powershell
cd C:\NORTHMINE2\backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

Frontend:

```powershell
cd C:\NORTHMINE2\frontend
npm install
npm run dev
```

Abrir: `http://localhost:5173`

Credenciales demo:

- `admin` / `admin`
- `demo` / `demo`
- `supervisor` / `supervisor`
- `operador` / `operador`

## Estructura principal

- `src/lib/api.ts`: cliente HTTP y tipos de contrato.
- `src/services/authService.ts`: login y sesion local.
- `src/services/dashboardService.ts`: health, resumen y alertas.
- `src/components/layout`: shell SaaS.
- `src/components/kpi`: tarjetas ejecutivas.
- `src/components/charts`: graficos Recharts.
- `src/components/alerts`: panel de alertas.
- `src/components/tables`: resumen operacional.
- `src/pages/Login.tsx`: login premium.
- `src/pages/Dashboard.tsx`: dashboard funcional.

## Nota

Los archivos React heredados copiados en `src/pages/*Page.tsx`, `src/store` y `src/components/ui` se mantienen intactos por compatibilidad historica, pero no son la entrada oficial de Sprint 1.1.

