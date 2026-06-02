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

## Levantar con Docker (recomendado)

```bash
cp .env.example .env          # ajustá los puertos si hace falta
docker-compose up --build
```

- Frontend: http://localhost:3000  
- Backend (API): http://localhost:8000/docs

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
