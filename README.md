# Marcaciones → Tango

Webapp que importa el **Reporte de Marcaciones** (Excel), procesa las horas y exporta el archivo de novedades listo para importar en **Tango Gestión**.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.12 · FastAPI · openpyxl |
| Frontend | React 18 · Vite · Nginx |
| Infra | Docker · docker-compose |

---

## Reglas de conversión

| Columna del reporte | Código Tango | Regla |
|---|---|---|
| Normal (días comunes) | `HSAUT` | Decimal exacto (horas) |
| Normal (días feriado) | `HSFET` | Decimal exacto (horas) |
| Extras 50% | `HSEX50` | Redondeo 30 min¹ |
| Extras 100% | `HSEX100` | Redondeo 30 min¹ |

¹ **Regla 30 min:** si el resto de minutos es < 30 se descarta; si es ≥ 30 sube a la hora siguiente.  
Un feriado se detecta por la palabra "FERIADO" en la columna Observaciones o Marcaciones.

---

## Deploy en Railway (producción)

Conectá el repo a Railway. Detecta el `Dockerfile` raíz automáticamente y despliega un único servicio que sirve frontend + backend.

Variables de entorno en Railway:
| Variable | Descripción |
|----------|-------------|
| `PORT` | Railway la setea automáticamente |

## Levantar con Docker Compose (desarrollo local)

```bash
cp .env.example .env
docker-compose up --build
```

- App: http://localhost:80  
- API docs: http://localhost:8000/docs

> El `docker-compose.yml` usa dos contenedores separados (frontend con nginx + backend). Para producción/Railway se usa el `Dockerfile` raíz que combina todo en uno.

---

## Desarrollo local

### Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

API disponible en http://localhost:8000

### Frontend

```bash
cd frontend
npm install
cp ../.env.example .env.local   # asegurate de tener VITE_API_URL=http://localhost:8000
npm run dev
```

App disponible en http://localhost:5173

---

## Estructura del proyecto

```
├── backend/
│   ├── main.py          # FastAPI — endpoints /api/process y /api/download/{token}
│   ├── processor.py     # Lógica de parsing y generación del Excel Tango
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx      # Componente principal (upload → preview → download)
│   │   ├── App.css
│   │   └── main.jsx
│   ├── nginx.conf       # Proxy /api → backend en producción
│   ├── vite.config.js
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/process` | Recibe el Excel de marcaciones, devuelve JSON con preview y token |
| `GET`  | `/api/download/{token}` | Devuelve el Excel Tango generado (válido 30 min) |
| `GET`  | `/api/health` | Health check |
