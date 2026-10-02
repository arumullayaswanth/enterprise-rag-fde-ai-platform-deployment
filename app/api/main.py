"""FastAPI surface for the RAG service.

Endpoints
    GET  /              web UI (static, no credentials in the assets)
    GET  /health        liveness probe, for the load balancer
    GET  /ready         checks the OpenSearch index is reachable
    POST /ingest        load + chunk + embed + index a source
    POST /query         retrieval-augmented answer

Two unrelated kinds of authentication are involved here, and conflating them is
a common mistake:

1. The service to AWS. Bedrock, S3 and OpenSearch calls are signed with the
   task role's temporary credentials, handled by boto3. Nothing to configure.

2. The caller to this service. Controlled by REQUIRE_AUTH. When true, /query
   and /ingest need an `x-api-key` header matching API_KEY, and the service
   refuses to start if API_KEY is missing so it cannot fail open. When false
   every route is public, which means anyone who can reach the load balancer can
   read the indexed corpus and spend Bedrock tokens on this account. Only run
   that way behind a restricted network path.
"""

from __future__ import annotations

import hmac
import json
import logging
import os
from functools import lru_cache
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.ingestion.chunker import chunk_documents
from app.ingestion.indexer import OPENSEARCH_INDEX, get_client, index_chunks
from app.ingestion.loader import load
from app.retrieval.rag import answer_question
from app.retrieval.search import hybrid_search, vector_search

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

API_KEY = os.getenv("API_KEY", "")
REQUIRE_AUTH = os.getenv("REQUIRE_AUTH", "true").lower() != "false"
# Serves the built React app (Vite output). Override with FRONTEND_DIST for a
# custom build location; defaults to ../../frontend/dist relative to this file.
STATIC_DIR = Path(
    os.getenv("FRONTEND_DIST", Path(__file__).resolve().parents[2] / "frontend" / "dist")
)

if REQUIRE_AUTH and not API_KEY:
    raise RuntimeError(
        "API_KEY is not set. Set API_KEY (recommended: inject from Secrets Manager) "
        "or explicitly set REQUIRE_AUTH=false for local development only."
    )

app = FastAPI(title="RAG DevOps API", version="1.1.0")

# CORS. The React dev server (and any configured production origin) call this
# API from a different origin, so the browser needs these headers. Origins are
# driven by CORS_ALLOW_ORIGINS (comma-separated); defaults cover local Vite.
_cors_origins = [
    o.strip()
    for o in os.getenv(
        "CORS_ALLOW_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def require_api_key(x_api_key: str = Header(default="")) -> None:
    if not REQUIRE_AUTH:
        return
    if not hmac.compare_digest(x_api_key, API_KEY):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid api key")


class IngestRequest(BaseModel):
    source: str = Field(..., description="Local path or s3://bucket/prefix")
    chunk_size: int = Field(1000, ge=100, le=8000)
    overlap: int = Field(150, ge=0, le=2000)


class IngestResponse(BaseModel):
    source: str
    documents: int
    chunks: int
    indexed: int
    failed: int
    index: str


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    k: int = Field(5, ge=1, le=20)
    mode: str = Field("hybrid", pattern="^(hybrid|vector)$")


class Citation(BaseModel):
    marker: int
    title: str
    score: float


class QueryResponse(BaseModel):
    question: str
    answer: str
    citations: list[Citation] = []
    model_id: str


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# ----------------------------------------------------------------- dashboard
# The UI dashboard needs corpus aggregates (headcount by department, the
# leaderboard, cost-center budgets). These come straight from the structured
# JSON on disk, which is fast and does not depend on OpenSearch being warm.
DATA_DIR = Path(os.getenv("DATA_DIR", Path(__file__).resolve().parents[2] / "sample-data"))


def _load_json(name: str) -> list[dict]:
    path = DATA_DIR / "structured" / name
    if not path.is_file():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("could not read %s: %s", path, exc)
        return []
    return data if isinstance(data, list) else [data]


@lru_cache(maxsize=1)
def _dashboard_payload() -> dict:
    employees = _load_json("employee-directory.json")
    metrics = _load_json("performance-metrics.json")
    cost_centers = _load_json("cost-centers.json")

    by_dept: dict[str, int] = {}
    by_status: dict[str, int] = {}
    by_level: dict[str, int] = {}
    for e in employees:
        by_dept[e.get("department", "Unknown")] = by_dept.get(e.get("department", "Unknown"), 0) + 1
        by_status[e.get("employment_status", "Unknown")] = by_status.get(e.get("employment_status", "Unknown"), 0) + 1
        by_level[e.get("level", "?")] = by_level.get(e.get("level", "?"), 0) + 1

    leaderboard = sorted(metrics, key=lambda m: m.get("leaderboard_rank", 999))[:10]
    total_budget = sum(c.get("annual_budget_usd", 0) for c in cost_centers)
    total_spend = sum(c.get("ytd_spend_usd", 0) for c in cost_centers)

    return {
        "totals": {
            "employees": len(employees),
            "departments": len(by_dept),
            "cost_centers": len(cost_centers),
            "annual_budget_usd": total_budget,
            "ytd_spend_usd": total_spend,
        },
        "by_department": [{"name": k, "count": v} for k, v in sorted(by_dept.items(), key=lambda kv: -kv[1])],
        "by_status": [{"name": k, "count": v} for k, v in by_status.items()],
        "by_level": [{"name": k, "count": v} for k, v in sorted(by_level.items())],
        "leaderboard": leaderboard,
        "cost_centers": sorted(cost_centers, key=lambda c: -c.get("annual_budget_usd", 0)),
        "employees": employees,
    }


@app.get("/stats", dependencies=[Depends(require_api_key)])
def stats() -> dict:
    return _dashboard_payload()


@app.get("/ready", dependencies=[Depends(require_api_key)])
def ready() -> dict:
    try:
        exists = get_client().indices.exists(index=OPENSEARCH_INDEX)
    except Exception as exc:  # noqa: BLE001 - surfaced as 503 below
        logger.warning("readiness check failed: %s", exc)
        raise HTTPException(status_code=503, detail="search backend unavailable") from exc
    return {"status": "ok", "index": OPENSEARCH_INDEX, "index_exists": exists}


@app.post("/ingest", response_model=IngestResponse, dependencies=[Depends(require_api_key)])
def ingest(req: IngestRequest) -> IngestResponse:
    try:
        docs = [d.to_dict() for d in load(req.source)]
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    chunks = chunk_documents(docs, chunk_size=req.chunk_size, overlap=req.overlap)
    summary = index_chunks(chunks)
    logger.info("ingested source=%s docs=%d chunks=%d", req.source, len(docs), len(chunks))
    return IngestResponse(
        source=req.source,
        documents=len(docs),
        chunks=len(chunks),
        indexed=summary.get("indexed", 0),
        failed=summary.get("failed", 0),
        index=summary.get("index", OPENSEARCH_INDEX),
    )


@app.post("/query", response_model=QueryResponse, dependencies=[Depends(require_api_key)])
def query(req: QueryRequest) -> QueryResponse:
    search_fn = hybrid_search if req.mode == "hybrid" else vector_search
    result = answer_question(req.question, k=req.k, search_fn=search_fn)
    return QueryResponse(
        question=req.question,
        answer=result.answer,
        citations=[Citation(**c) for c in result.citations],
        model_id=result.model_id,
    )


# ------------------------------------------------------------------- web UI
# Serves the built React single-page app. Mounted last so it cannot shadow the
# API routes above. The assets are public because they hold no credentials; the
# user supplies the API key at runtime. In local development the React app runs
# on the Vite dev server (port 5173) instead and talks to this API via CORS.
if (STATIC_DIR / "index.html").is_file():
    # Vite emits hashed assets under /assets; mount them at the same path.
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/", include_in_schema=False)
    def index() -> FileResponse:
        return FileResponse(STATIC_DIR / "index.html")

    # SPA fallback: any unknown non-API path returns index.html so client-side
    # view switching works on a hard refresh.
    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_fallback(full_path: str) -> FileResponse:
        candidate = STATIC_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
else:  # pragma: no cover - the dev server serves the UI in local development
    logger.warning("frontend build %s not found; run `npm run build` to serve the UI", STATIC_DIR)
