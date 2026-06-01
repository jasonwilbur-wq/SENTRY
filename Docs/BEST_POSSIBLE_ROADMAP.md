# SENTRY Best-Possible Roadmap

This is the practical path from current strong prototype to enterprise-grade platform.

## Completed guardrails

- Secure-by-default backend auth with production fail-fast checks.
- Frontend auth gate and session identity bridge.
- Admin-only UI hiding and access guards.
- CI quality gate for frontend build/typecheck and backend tests.
- Database startup validation and health diagnostics.
- Configurable runtime SQLite path with seed-copy bridge.
- E2E auth/RBAC smoke coverage.
- Improved Vite vendor chunking.

## Next 30 days

1. **Enterprise identity**
   - Replace temporary `X-Sentry-User` header auth with OIDC/IAP/Firebase Auth/MSAL token validation.
   - Backend must validate signed tokens, issuer, audience, expiry, and group/admin claims.
   - Frontend should have explicit sign-in/sign-out and no build-time identity.

2. **Persistent production database**
   - Move mutable tables to Cloud SQL Postgres.
   - Add SQLAlchemy/SQLModel repositories.
   - Add Alembic migrations.
   - Keep SQLite only as local/demo seed data.

3. **Observability**
   - Add request IDs, structured JSON logs, route latency, and auth/audit correlation.
   - Add Cloud Monitoring alerts for 5xx rate, DB warnings, auth failures, and failed deploys.

4. **Frontend E2E coverage**
   - Add Playwright tests for request submission, admin triage, vendor directory, and command palette.
   - Keep backend-dependent tests skippable when backend is intentionally offline.

## Next 60 days

1. **Performance budget**
   - Define max initial JS budget and max route chunk budget.
   - Use bundle analysis in CI.
   - Lazy-load 3D canvases only after viewport/interaction.

2. **Data quality governance**
   - Add import validation reports.
   - Add duplicate detection CI fixtures.
   - Add source lineage columns for critical intelligence records.

3. **Access model**
   - Define roles: viewer, analyst, admin, executive.
   - Move route and API permissions to a single policy matrix.

## Enterprise finish line

SENTRY becomes production-grade when:

- Auth is token-based and centrally managed.
- Production data is durable, backed up, and restorable.
- Every mutation has audit history and actor identity.
- Every deploy passes tests, typecheck, build, smoke tests, and migration checks.
- Health endpoints report degraded state before users discover breakage.
- Operators have a runbook for incident response and rollback.
