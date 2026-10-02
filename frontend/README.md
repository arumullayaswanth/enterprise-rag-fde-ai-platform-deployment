# Yash Academy — Knowledge Platform (Frontend)

Enterprise React UI for the RAG platform. Built with Vite + React + TypeScript.

**Author:** Yaswanth

## Pages

- **Ask** — the chat-style RAG assistant. Posts to `/query`, renders the grounded
  answer with inline citations and a ranked list of the sources used.
- **Overview** — live analytics from `/stats`: headcount by department, seniority
  distribution, and the cost-center budget table.
- **Directory** — searchable, filterable employee directory.
- **Org Chart** — the reporting hierarchy built from the directory.
- **Leaderboard** — top performers for the quarter.
- **Cost Centers** — departmental budgets, spend, and utilization.
- **Knowledge Base** — what lives in the corpus and example questions to ask.

## Run locally

The frontend talks to the FastAPI backend. Start both.

### 1. Backend (port 8000)

```bash
# from the repo root
set REQUIRE_AUTH=false            # Windows cmd; use export on macOS/Linux
uvicorn app.api.main:app --reload --port 8000
```

`REQUIRE_AUTH=false` is for local development only. With auth on, set your API
key in the UI via the "API key" button (stored in the browser, sent as
`x-api-key`).

### 2. Frontend dev server (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api/*` to the backend on
`http://localhost:8000` (override with `VITE_API_TARGET`), so there is no CORS
hop in development.

## Production build

```bash
cd frontend
npm run build        # outputs to frontend/dist
```

The backend serves `frontend/dist` automatically at `/`. Override the location
with the `FRONTEND_DIST` environment variable if needed.
