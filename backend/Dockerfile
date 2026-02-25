# ────────────────────────────────────────────────────────────────────
# SENTRY API — Cloud Run Dockerfile
#
# Build:  docker build -t sentry-api ./backend
# Run:    docker run -p 8082:8082 -e ALLOWED_ORIGINS=http://localhost:3000 sentry-api
# Deploy: gcloud run deploy sentry-api --source ./backend --region us-central1
# ────────────────────────────────────────────────────────────────────

FROM python:3.12-slim

# Cloud Run provides PORT env var (default 8080)
ENV PORT=8082
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first (layer cache friendly)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (excludes data/ — see .dockerignore)
COPY *.py ./

# Data directory — Cloud Run mounts a volume here in production.
# For local dev the SQLite db is included in the image.
COPY data/ ./data/

# Non-root user for security
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser

EXPOSE $PORT

CMD uvicorn main:app --host 0.0.0.0 --port $PORT
