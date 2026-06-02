import os
import uuid
from datetime import date, datetime, timedelta

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from processor import generate_excel, process_workbook

app = FastAPI(title="Marcaciones → Tango API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store: token → {rows, created_at}
_store: dict = {}
_TTL = timedelta(minutes=30)


def _evict():
    cutoff = datetime.utcnow() - _TTL
    expired = [k for k, v in _store.items() if v["created_at"] < cutoff]
    for k in expired:
        del _store[k]


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/process")
async def process(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith((".xlsx", ".xls")):
        raise HTTPException(400, "El archivo debe ser .xlsx o .xls")

    contents = await file.read()
    try:
        result = process_workbook(contents)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"Error al procesar el archivo: {exc}")

    _evict()
    token = str(uuid.uuid4())
    _store[token] = {"rows": result["rows"], "created_at": datetime.utcnow()}

    return {
        "token":    token,
        "stats":    result["stats"],
        "rows":     result["rows"],
        "warnings": result["warnings"],
    }


@app.get("/api/download/{token}")
def download(token: str):
    if token not in _store:
        raise HTTPException(404, "Sesión expirada o inválida. Volvé a cargar el archivo.")

    rows = _store[token]["rows"]
    excel_bytes = generate_excel(rows)
    filename = f"tango_{date.today().strftime('%Y%m%d')}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Serve React SPA (production: static/ dir exists after Docker build) ───────
_STATIC = os.path.join(os.path.dirname(__file__), "static")

if os.path.isdir(_STATIC):
    app.mount("/assets", StaticFiles(directory=os.path.join(_STATIC, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        target = os.path.join(_STATIC, full_path)
        if os.path.isfile(target):
            return FileResponse(target)
        return FileResponse(os.path.join(_STATIC, "index.html"))
