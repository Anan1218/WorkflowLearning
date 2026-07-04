"""Dashboard API: app factory wiring each vertical slice's router.

Serves the built React frontend as static files from the same origin, so there
is no CORS story in production. In dev, vite proxies /api here instead.

Run:  uvicorn api.main:app --reload --port 8000
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from core.extract import MODEL as DEFAULT_PROVIDER_STRING
from core.trace import setup_tracing
from api.config import FRONTEND_DIST
from api.features.documents.router import router as documents_router
from api.features.evals.router import router as evals_router
from api.features.extract.router import router as extract_router
from api.features.guidelines.router import router as guidelines_router
from api.features.review.router import router as review_router
from api.features.samples.router import router as samples_router

app = FastAPI(title="WorkflowLearning Demo Dashboard")

# The frontend may be served from Vercel (rli-demo.stelloagents.com) while the
# API lives on Fly - allow those origins. Same-origin serving still works too.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://([a-z0-9-]+\.)?(stelloagents\.com|vercel\.app)|http://localhost:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    setup_tracing()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "model_default": DEFAULT_PROVIDER_STRING}


app.include_router(extract_router)
app.include_router(documents_router)
app.include_router(samples_router)
app.include_router(guidelines_router)
app.include_router(review_router)
app.include_router(evals_router)

# Built frontend (docker / production). In dev this dir may not exist - fine.
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        candidate = FRONTEND_DIST / path
        if path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
