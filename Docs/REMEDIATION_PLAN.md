# SENTRY v2 — Remediation Plan & PR Roadmap

**Created:** 2026-04-04
**Source of truth:** `Docs/SENTRY_CODE_REVIEW.md`
**Lead:** Atlas (Code Puppy)

---

## 1. Ranked Remediation Matrix (Top 12)

Priority order: security/auth → approval gates → audit trail → LLM guardrails
→ data correctness → reliability → UX → cleanup.

| # | Title | Sev | User/Business Risk | Affected Files | Code Changes | Tests | Docs | Blockers |
|---|---|---|---|---|---|---|---|---|
| R01 | Auth middleware for all endpoints | CRIT | Any network-adjacent user can delete data, overwrite scores, mutate compliance records | `auth.py` (new), `main.py`, `admin_routes.py`, `project_routes.py`, `incident_routes.py`, `regulatory_routes.py` | New `get_current_user` / `require_admin` FastAPI deps; apply `Depends()` to every route | Auth unit tests, 401/403 integration tests | Update README, QUICK_START | None |
| R02 | Audit trail for all write ops | CRIT | Zero forensic capability — no one knows who changed what | `audit.py` (new), `database.py`, all route modules with writes | New `audit_log` table + `log_mutation()` helper; retrofit every UPDATE/DELETE/INSERT on mutable data | Audit log unit tests, verify log rows after mutations | Audit schema docs | R01 (needs user identity) |
| R03 | Approval gates on destructive ops | CRIT | Batch overwrite silently replaces human-reviewed scores; hard deletes are permanent | `admin_routes.py`, `project_routes.py` | `confirm=true` param on batch extract + deletes; dry-run preview mode; soft-delete for competitor events | Confirm-required tests, dry-run response shape tests | Admin panel usage guide | R02 (audit captures the gate decision) |
| R04 | Harden LLM system prompt | HIGH | LLM presents drafts as final decisions; no citation; hallucination risk | `main.py` (chat section) | Add 7 mandatory constraint rules + draft footer + citation tags + UNKNOWN instruction | Prompt regression tests (input→expected constraint present) | LLM guardrails doc | None |
| R05 | Cap chat history + sanitize errors | HIGH | Context overflow → API failure; raw exceptions leak internals | `main.py` (chat section) | Cap to 20 msgs, validate msg length, sanitize exception to generic error | History cap unit test, oversized-msg test | None | None |
| R06 | Remove duplicate competitor routes | HIGH | Route shadowing → unpredictable API behavior; dead code | `main.py`, `admin_routes.py` | Delete inline competitor routes from `main.py` (~180 lines) | Verify all frontend competitor calls still work | None | None |
| R07 | Connection safety (try/finally) | HIGH | Connection leaks on exceptions exhaust WAL readers | `admin_routes.py`, `main.py`, `incident_routes.py`, `regulatory_routes.py` | Replace bare `conn.close()` with `with get_connection() as conn:` or `try/finally` | Error-path tests that verify connection closure | None | None |
| R08 | Per-query chat context retrieval | MED | Chat only sees aggregates → hallucinated vendor-specific answers | `main.py` (chat section) | Add keyword extraction → per-vendor/incident/competitor DB queries → inject into prompt | Context retrieval tests with vendor name queries | None | R04, R06 |
| R09 | Persist form submissions | MED | Analysts submit forms that vanish — false confidence | `main.py`, `database.py`, `models.py` | New tables, Pydantic models, real persistence + status tracking | Form CRUD tests | None | R01, R02 |
| R10 | Fix N+1 competitor queries | MED | 30-100 queries per request → latency | `main.py` or new `competitor_routes.py` | Replace loops with GROUP BY aggregate queries | Before/after perf comparison | None | R06 |
| R11 | URL-based routing | MED | Browser refresh loses analyst's place; no deep links | `App.tsx`, new router setup, all view components | Add `react-router-dom`, map ViewState → URL paths | Navigation E2E tests | None | None |
| R12 | Repo cleanup | LOW | Clutter, confusing artifacts, Word temp files with usernames | `.gitignore`, root directory | Delete `~$*`, `sentry.db` (0-byte), move docs/scripts | Verify build still works | Updated .gitignore | None |

---

## 2. PR Sequence (Dependency Order)

```
PR-01  feat/security-foundation        ← YOU ARE HERE
│      (auth + audit + approval gates)
│
├─ PR-02  fix/duplicate-competitor-routes  (no deps — parallel safe)
├─ PR-03  fix/connection-safety            (no deps — parallel safe)
├─ PR-04  chore/repo-cleanup               (no deps — parallel safe)
│
├─ PR-05  feat/llm-guardrails              (no deps — parallel safe)
│         (prompt hardening + history cap + error sanitization)
│
├─ PR-06  refactor/split-main-py           (after PR-01, PR-02, PR-03)
│         (extract vendor_routes, chat_routes, competitor_routes)
│
├─ PR-07  perf/competitor-queries          (after PR-02 or PR-06)
│
├─ PR-08  feat/contextual-chat             (after PR-05, PR-06)
│
├─ PR-09  feat/persist-forms               (after PR-01)
│
├─ PR-10  feat/url-routing                 (no deps — parallel safe)
│
├─ PR-11  feat/admin-confirm-dialogs       (frontend, after PR-01)
│
└─ PR-12  feat/morning-brief-export        (no deps — low priority)
```

---

## 3. PR-01 Detailed Plan: `feat/security-foundation`

### 3.1 Objective

Establish the three foundational security layers that every subsequent PR
depends on: **authentication**, **audit logging**, and **approval protection**
for destructive operations. After this PR lands, every write endpoint will:
1. Know *who* is making the request
2. Log *what* changed (before + after)
3. Require explicit *confirmation* for destructive/batch operations

### 3.2 Risks Addressed

| Review Ref | Risk | Severity |
|---|---|---|
| S1, P1, §3.1 | No auth on any endpoint | CRITICAL |
| S10, §3.2 | No audit trail on any write | CRITICAL |
| S2 | Batch VAR overwrite without confirmation | CRITICAL |
| S3 | Hard delete competitor events | HIGH |
| S4 | Unprotected compliance field mutations | CRITICAL |
| S5 | VAR unlink without confirmation | HIGH |

### 3.3 Files to Create

| File | Purpose | Lines (est.) |
|---|---|---|
| `backend/auth.py` | `get_current_user`, `require_admin` FastAPI deps | ~120 |
| `backend/audit.py` | `audit_log` table, `log_mutation()` helper | ~100 |
| `backend/tests/test_auth.py` | Auth middleware tests | ~150 |
| `backend/tests/test_audit.py` | Audit log tests | ~120 |

### 3.4 Files to Modify

| File | Changes |
|---|---|
| `backend/database.py` | Add `CREATE_AUDIT_LOG` table; call in `init_db()` |
| `backend/admin_routes.py` | Add `Depends(require_admin)` to all routes; add `log_mutation()` to all writes; add `confirm` param to batch extract + deletes; soft-delete for competitor events |
| `backend/project_routes.py` | Add `Depends(get_current_user)` to write routes; add `log_mutation()` to project + vendor mutations |
| `backend/main.py` | Add `Depends(get_current_user)` to chat + form stubs; add global exception handler |
| `backend/.env.example` | Add `SENTRY_AUTH_MODE`, `SENTRY_ADMIN_USERS`, `SENTRY_ALLOWED_USERS` |

### 3.5 Auth Design

**Phase 1 approach (this PR):** Header-based identity with allowlists.

```
┌─────────────────────────────────────────────────────┐
│  Request arrives with X-Sentry-User header          │
│                                                      │
│  get_current_user():                                 │
│    if AUTH_MODE == "off":                             │
│        return SentryUser(id="anonymous", role="admin")│
│    if header missing/empty → 401                     │
│    if header not in ALLOWED_USERS → 403              │
│    return SentryUser(id=header, role=...)             │
│                                                      │
│  require_admin():                                    │
│    user = get_current_user()                         │
│    if user.role != "admin" → 403                     │
│    return user                                       │
└─────────────────────────────────────────────────────┘
```

- **ASSUMED:** Phase 1 uses `X-Sentry-User` header. Phase 2 (separate PR)
  upgrades to MSAL token validation. This is safe because the app is behind
  Walmart VPN and not internet-facing.
- **ASSUMED:** `AUTH_MODE=off` in development (backward-compatible — existing
  dev workflows don't break). `AUTH_MODE=header` in production.
- Auth mode `off` returns a user with `admin` role so all tests pass without
  setting up auth.

### 3.6 Audit Design

```sql
CREATE TABLE IF NOT EXISTS audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp   TEXT    NOT NULL DEFAULT (datetime('now')),
    user_id     TEXT    NOT NULL,
    action      TEXT    NOT NULL,   -- 'create' | 'update' | 'delete' | 'batch_extract' | 'link' | 'unlink'
    entity_type TEXT    NOT NULL,   -- 'var_report' | 'competitor_event' | 'project' | 'project_vendor'
    entity_id   TEXT    NOT NULL,
    old_value   TEXT    DEFAULT NULL,  -- JSON snapshot before mutation
    new_value   TEXT    DEFAULT NULL,  -- JSON snapshot after mutation
    metadata    TEXT    DEFAULT NULL   -- Extra context (e.g., confirm=true, dry_run=true)
);
```

`log_mutation(conn, user, action, entity_type, entity_id, old=None, new=None, meta=None)`
- Inserts one row per mutation
- `old_value` / `new_value` are JSON strings of the relevant fields
- Called inside the same transaction as the write

### 3.7 Approval Gate Design

| Endpoint | Current Behavior | New Behavior |
|---|---|---|
| `POST /api/admin/vars/extract-batch?overwrite=true` | Silently overwrites all scored VARs | Requires `confirm=true` param. Without it, returns a dry-run preview showing which VARs would be affected + their current scores. |
| `DELETE /api/admin/competitor-events/{id}` | Hard delete | Soft-delete (`deleted_at` timestamp). Hard-delete only with `permanent=true` param (admin only). |
| `DELETE /api/admin/vars/{var_id}/link` | Immediate unlink | Requires `confirm=true` param. Without it, returns a preview of the VAR + vendor that would be unlinked. |
| `DELETE /api/projects/{id}` | Hard delete + CASCADE | Requires `confirm=true` param. Returns project name + vendor count for confirmation. |
| `DELETE /api/projects/{id}/vendors/{entry_id}` | Hard delete | Requires `confirm=true` param. |

### 3.8 Tests

| Test | What It Verifies |
|---|---|
| `test_auth_off_mode` | AUTH_MODE=off returns anonymous admin user |
| `test_auth_missing_header` | 401 when AUTH_MODE=header and no header sent |
| `test_auth_unknown_user` | 403 when user not in allowlist |
| `test_auth_valid_user` | 200 when valid user in allowlist |
| `test_auth_admin_required` | 403 when non-admin user hits admin route |
| `test_audit_log_created` | Mutation creates audit_log row with correct fields |
| `test_audit_old_new_values` | Before/after JSON snapshots are accurate |
| `test_batch_extract_requires_confirm` | 400 without confirm=true when overwrite=true |
| `test_batch_extract_dry_run` | Returns preview without mutating when confirm absent |
| `test_delete_competitor_soft` | Sets deleted_at instead of removing row |
| `test_delete_project_requires_confirm` | 400 without confirm=true |
| `test_unlink_var_requires_confirm` | 400 without confirm=true |

### 3.9 Migration Impact

- **New table:** `audit_log` — added via `init_db()`, safe for existing DBs.
- **Schema change:** `competitor_events` gains `deleted_at TEXT DEFAULT NULL` column — added via safe `ALTER TABLE ADD COLUMN` migration in `init_db()`.
- **No data loss.** All changes are additive.
- **No frontend changes required** in this PR — auth header will be added in a follow-up frontend PR. With `AUTH_MODE=off`, the frontend works unchanged.

### 3.10 Rollback Plan

1. Revert the Git commit (single PR, single commit group).
2. The `audit_log` table and `deleted_at` column stay in the DB (harmless).
3. No data was deleted or migrated — only new columns/tables added.
4. Set `SENTRY_AUTH_MODE=off` as immediate rollback without code revert.

### 3.11 Blocking Questions

None. I've made two safe assumptions:

1. **ASSUMED:** Phase 1 auth uses `X-Sentry-User` header, not MSAL tokens.
   Rationale: app is VPN-only; MSAL integration is a separate concern.
   Marked in code with `# ASSUMED: Phase 1 — upgrade to MSAL in PR-07`.

2. **ASSUMED:** `AUTH_MODE=off` is the default, preserving backward compat
   for existing dev workflows. Production must set `AUTH_MODE=header`.

---

## 4. Implementation Status

PR-01 implementation begins below this line. Files will be created/modified
in the `backend/` directory.

**Commit plan:**
1. `backend/auth.py` — auth module
2. `backend/audit.py` — audit module
3. `backend/database.py` — schema additions
4. `backend/admin_routes.py` — retrofit auth + audit + approval gates
5. `backend/project_routes.py` — retrofit auth + audit + approval gates
6. `backend/main.py` — retrofit auth on write endpoints
7. `backend/tests/test_auth.py` + `backend/tests/test_audit.py`
8. `.env.example` updates
