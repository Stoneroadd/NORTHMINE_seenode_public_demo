# NORTHMINE Intelligence v2.0
## Sistema de Control Operacional Minero - Demo Comercial

---

### Que es NORTHMINE

NORTHMINE Intelligence es un sistema de monitoreo y control operacional para faenas mineras a cielo abierto. Integra datos de flotas CAEX, palas de carguio, produccion por turno y alertas operacionales en un unico dashboard ejecutivo accesible desde navegador.

La version demo usa datos sinteticos representativos de una operacion real de 38 CAEX y 5 palas. Incluye prediccion de produccion con Machine Learning, simulador de escenarios, vista aerea de equipos y analisis ejecutivo con IA.

Esta guia es solo para demo comercial/local. Para piloto o produccion usar la matriz y checks de `docs\DEVOPS_QA_TIERS.md`; produccion exige SQL/WENCO real homologado, demo login deshabilitado, secretos reales, CORS cerrado, monitoreo, backups y UAT aprobado.

---

### Instalacion rapida

Requisitos: Python 3.11+ y Node.js 20+.

Opcion recomendada desde la raiz del proyecto:

```powershell
.\SETUP.bat
```

Instalacion manual:

```powershell
# 1. Backend
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 --no-server-header --no-date-header

# 2. Frontend (otra terminal)
cd frontend
npm install --legacy-peer-deps
npm run dev

# 3. Abrir navegador
# http://localhost:5173
```

`arrancar.bat` inicia backend, frontend y navegador automaticamente, pero requiere que el entorno ya haya sido preparado.

---

### Credenciales demo

| Usuario | Contrasena | Acceso |
|---------|------------|--------|
| admin | admin | Acceso total |
| demo | demo | Acceso ejecutivo |
| supervisor | supervisor | Operacional + analisis + exportacion |
| operador | operador | Turno + flota + alertas |

---

### Modulos del sistema

| Modulo | Ruta | Descripcion |
|--------|------|-------------|
| Resumen Ejecutivo | /dashboard | Banner F01, acumulado mes, proyeccion fin de mes |
| Turno Actual | /turno | KPI en vivo, estado CAEX hora a hora, command center |
| Produccion | /produccion | Tonelaje vs plan, heatmap operacional |
| Rendimiento | /rendimiento | Heatmap 7x24 h, curva promedio por hora |
| Flota | /flota | Ranking de CAEX, eficiencia por modelo |
| Carguio | /carguio | Palas activas, ciclos y ton/ciclo por unidad |
| Alertas | /alertas | Alertas operacionales con drill-down de equipo |
| Comparativa | /comparativa | Dos periodos lado a lado, variacion por KPI |
| Prediccion ML | /prediccion | Random Forest, proyeccion con banda de confianza |
| Simulador | /simulador | Punto de cruce de meta por cantidad de CAEX |
| Vista Aerea | /aerea | Mapa con posicion de equipos |
| NORTHMINE AI | Integrado | Analisis ejecutivo con IA |
| Exportacion PDF | /turno | Reporte completo de turno |

---

### Variables futuras para piloto/produccion

Estas variables no convierten la demo en produccion por si solas. Deben validarse junto con el contrato de datos, seguridad, monitoreo y checks de `docs\DEVOPS_QA_TIERS.md`.

Conexion a SQL Server:

```bash
# backend/.env
SQL_SERVER=172.30.10.110
SQL_PORT=1433
SQL_DATABASE=WENCO
SQL_USER=northmine
SQL_PASSWORD=tu_password
```

Analisis con IA:

```bash
# backend/.env
ANTHROPIC_API_KEY=sk-ant-...
```

Sin esta variable el sistema opera con analisis demo predeterminados.

---

### Arquitectura tecnica

```text
Navegador (React + Vite)
        |
        | REST / JSON
        v
FastAPI (Python 3.11+)
        |
        |-- SQLite / SQL Server (WENCO)
        |-- Anthropic API
        `-- Demo data
```

---

### Smoke test

```powershell
python -B scripts\smoke_backend.py
```

Valida endpoints clave del backend: produccion, flota, alertas, PDF, ML, simulador, vista aerea y fallback de IA.

---

### Contacto

**NORTHMINE Intelligence** - Simon Mazuela R.
master.robless@gmail.com

Sistema desarrollado para demostracion comercial. Todos los datos son sinteticos y representativos de una operacion minera real.
