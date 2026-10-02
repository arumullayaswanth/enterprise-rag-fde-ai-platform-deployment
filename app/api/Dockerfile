# ============================================================================
#  Dockerfile for THIS directory's service: the QUERY API + web UI.
#  Runs on ECS Fargate.
#
#  Two stages:
#    1. web     — builds the React (Vite) frontend into static assets.
#    2. runtime — the Python API, which also serves those built assets.
#
# ============================================================================

# ------------------------------------------------------------------- stage 1
#  Build the React frontend. Node is only needed here; the runtime image stays
#  Python-only and small.
FROM public.ecr.aws/docker/library/node:20-slim AS web

WORKDIR /web

# Install deps first so edits to the app source do not reinstall packages.
# npm ci installs exactly what package-lock.json pins, for reproducible builds.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Then the sources, and build. Vite emits to /web/dist.
COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------- stage 2
#  Python runtime: the API process plus the built UI.
FROM public.ecr.aws/docker/library/python:3.12-slim AS runtime

# PYTHONUNBUFFERED makes log output reach CloudWatch immediately instead of
# sitting in a buffer.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencies first, application code second. Docker caches each step, so
# editing app/ does not reinstall the packages.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

# Structured sample data powers the /stats dashboard endpoint. DATA_DIR points
# main.py at it. Replace or mount real data in production as needed.
COPY sample-data/ ./sample-data/

# The built React assets, copied from the web stage into the path main.py
# serves (FRONTEND_DIST defaults to ../../frontend/dist relative to main.py,
# which resolves to /app/frontend/dist here).
COPY --from=web /web/dist ./frontend/dist

# Containers run as root by default. Dropping to an unprivileged user means a
# bug in the app cannot write anywhere important.
RUN useradd --create-home --uid 10001 appuser \
    && chown -R appuser:appuser /app
USER appuser

ENV PORT=8000 \
    DATA_DIR=/app/sample-data \
    FRONTEND_DIST=/app/frontend/dist
EXPOSE 8000

CMD ["sh", "-c", "exec uvicorn app.api.main:app --host 0.0.0.0 --port ${PORT}"]
