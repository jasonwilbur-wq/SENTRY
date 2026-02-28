# ────────────────────────────────────────────────────────────────────
# SENTRY API — Cloud Run Dockerfile
#
# Production:
#   gcloud run deploy sentry-api --source ./backend --region us-central1
#   Cloud Run injects PORT=8080 at runtime (overrides the 8080 default below).
#
# Local Docker test:
#   docker build -t sentry-api ./backend
#   docker run -p 8082:8080 -e ALLOWED_ORIGINS=http://localhost:3000 sentry-api
#   → app runs inside container on :8080, mapped to host :8082
#
# Local dev without Docker:
#   Run backend/start_backend.bat  (uses uvicorn directly on :8082)
# ────────────────────────────────────────────────────────────────────

FROM python:3.12-slim

# PORT: Cloud Run always overrides this with its own value (8080 by default).
# We set 8080 here so local Docker runs also use the same port.
ENV PORT=8080
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install Python dependencies first — separate layer for Docker cache efficiency.
# Note: uses standard PyPI (no Walmart proxy) for Cloud Build compatibility.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy FastAPI application source files
COPY *.py ./

# Bundle the SQLite database into the image.
# ~30 MB, read-only at runtime. Redeploy to update data.
# Future: replace with Cloud SQL for mutable production data.
COPY data/ ./data/

# Run as non-root for security (required by many enterprise policies)
RUN adduser --disabled-password --gecos '' appuser \
    && chown -R appuser /app
USER appuser

EXPOSE 8080

# Shell-form CMD so $PORT is expanded at container runtime (not build time).
# Cloud Run injects PORT=8080; this will use whatever value is set.
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
