# SENTRY Database Reliability Plan

## Current state

SENTRY currently uses SQLite for application data. The default database is bundled at:

```text
backend/data/sentry.db
```

That is acceptable for local development, demos, and read-mostly deployments. It is not a durable production mutation store on Cloud Run because writes to a container filesystem are instance-local and can disappear on redeploy, scale-down, or instance replacement.

## Implemented guardrails

- `SENTRY_DB_PATH` can point runtime SQLite to an external location.
- If `SENTRY_DB_PATH` points to a new non-bundled file, SENTRY copies the bundled DB once as a seed before migrations run.
- Startup now validates required tables and columns after schema initialization.
- SQLite foreign-key enforcement is now available behind `SENTRY_SQLITE_FOREIGN_KEYS=1`; it remains opt-in until legacy empty-string FK rows/routes are cleaned up.
- `/api/health` reports database readiness and warnings.
- `SENTRY_HEALTH_DETAILS=1` exposes extended DB metadata and write-surface summary for trusted operator diagnostics.

## Runtime mutable tables

These tables are written by runtime routes or operational scripts and therefore require durable storage in production:

- `audit_log`
- `competitor_events`
- `cso_briefs`
- `cso_brief_items`
- `cso_brief_audit_log`
- `project_vendors`
- `projects`
- `service_requests`
- `ui_events`
- `var_reports`
- `vendors`

## Recommended target architecture

### Short-term bridge

Use `SENTRY_DB_PATH` to put SQLite on persistent storage where available. This is a bridge, not the final architecture.

### Production target

Move mutable production data to Cloud SQL Postgres:

1. Add SQLAlchemy or SQLModel data-access layer.
2. Introduce Alembic migrations.
3. Export SQLite tables to migration fixtures.
4. Import to Cloud SQL Postgres.
5. Keep bundled SQLite only as local/demo seed data.
6. Add backups, point-in-time recovery, and restore drills.

## Deployment policy

- Local/dev: bundled SQLite is acceptable.
- Preview: bundled or ephemeral SQLite is acceptable if no production data is mutated.
- Production: bundled SQLite should be treated as degraded until persistent storage or Cloud SQL is configured.

## Operator checks

Basic health:

```bash
curl https://<host>/api/health
```

Trusted diagnostic health:

```bash
SENTRY_HEALTH_DETAILS=1
curl https://<host>/api/health
```

Look for:

- `database_ready: true`
- empty `database_warnings`
- `database_path_configured: true` for production
