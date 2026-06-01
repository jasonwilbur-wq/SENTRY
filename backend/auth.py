"""SENTRY Backend — Authentication & Authorization.

Phase 1: Header-based identity with allowlists.
Phase 2 (future PR): Upgrade to MSAL token validation.

Usage:
    from auth import get_current_user, require_admin, SentryUser

    @router.get("/protected")
    def my_route(user: SentryUser = Depends(get_current_user)):
        ...

    @router.delete("/admin-only")
    def admin_route(user: SentryUser = Depends(require_admin)):
        ...

Environment variables:
    SENTRY_AUTH_MODE       = "header" | "off"   (default: "header")
    SENTRY_ADMIN_USERS     = comma-separated list of admin user IDs
    SENTRY_ALLOWED_USERS   = comma-separated list of all allowed user IDs
                             (admins are automatically included)

Security posture:
    Default is SECURE (header auth enforced).  Setting SENTRY_AUTH_MODE=off
    is a deliberate dev-only bypass that logs a loud warning on startup.
    Never deploy with AUTH_MODE=off in shared or production environments.
"""
from __future__ import annotations

import os
import sys
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request


# ── Configuration ─────────────────────────────────────────────────────────────

def _parse_csv_env(key: str, default: str = "") -> set[str]:
    """Parse a comma-separated env var into a lowercase set, ignoring blanks."""
    raw = os.environ.get(key, default)
    return {v.strip().lower() for v in raw.split(",") if v.strip()}


# SECURITY: default is "header" — auth is ON unless explicitly overridden.
AUTH_MODE: str = os.environ.get("SENTRY_AUTH_MODE", "header").lower()
APP_ENV: str = os.environ.get("SENTRY_ENV", os.environ.get("ENVIRONMENT", "development")).lower()

ADMIN_USERS: set[str] = _parse_csv_env("SENTRY_ADMIN_USERS")
ALLOWED_USERS: set[str] = _parse_csv_env("SENTRY_ALLOWED_USERS") | ADMIN_USERS


def _validate_production_config(
    app_env: str,
    auth_mode: str,
    allowed_users: set[str],
    admin_users: set[str],
) -> None:
    """Fail fast on production auth configurations that are unsafe or unusable."""
    if app_env not in {"prod", "production"}:
        return
    if auth_mode == "off":
        raise RuntimeError("Refusing to start SENTRY in production with SENTRY_AUTH_MODE=off.")
    if auth_mode == "header" and not allowed_users:
        raise RuntimeError("Production header-auth requires SENTRY_ALLOWED_USERS or SENTRY_ADMIN_USERS.")
    if auth_mode == "header" and not admin_users:
        raise RuntimeError("Production header-auth requires at least one SENTRY_ADMIN_USERS entry.")


_validate_production_config(APP_ENV, AUTH_MODE, ALLOWED_USERS, ADMIN_USERS)

# Header name for Phase 1 auth.
AUTH_HEADER = "X-Sentry-User"

# ── Startup warning for insecure mode ─────────────────────────────────────────

if AUTH_MODE == "off":
    _warn = (
        "\n"
        "  ╔══════════════════════════════════════════════════════════════╗\n"
        "  ║  ⚠️  SENTRY_AUTH_MODE=off — AUTHENTICATION IS DISABLED     ║\n"
        "  ║  All users are treated as anonymous admins.                 ║\n"
        "  ║  DO NOT use this setting in shared or production envs.      ║\n"
        "  ║  Set SENTRY_AUTH_MODE=header for secured operation.         ║\n"
        "  ╚══════════════════════════════════════════════════════════════╝\n"
    )
    print(_warn, file=sys.stderr)


# ── User model ────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class SentryUser:
    """Authenticated user identity. Immutable and hashable."""

    id: str
    role: str  # "admin" | "user"

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


# ── Anonymous fallback (AUTH_MODE=off only) ───────────────────────────────────
# This grants full admin access — intentionally loud and scary.

_ANONYMOUS_ADMIN = SentryUser(id="anonymous", role="admin")


# ── FastAPI dependencies ──────────────────────────────────────────────────────

def get_current_user(request: Request) -> SentryUser:
    """Extract and validate the calling user's identity.

    When AUTH_MODE is "off" (explicit dev bypass), returns an anonymous admin.
    This requires setting SENTRY_AUTH_MODE=off deliberately.

    When AUTH_MODE is "header" (the default), validates X-Sentry-User against
    the allowlist and returns a typed SentryUser with the correct role.

    Raises:
        HTTPException 401: if auth is required but no identity is provided.
        HTTPException 403: if the user is not in the allowlist.
    """
    if AUTH_MODE == "off":
        return _ANONYMOUS_ADMIN

    user_id = (request.headers.get(AUTH_HEADER) or "").strip().lower()

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Send X-Sentry-User header.",
        )

    if ALLOWED_USERS and user_id not in ALLOWED_USERS:
        raise HTTPException(
            status_code=403,
            detail=f"User '{user_id}' is not authorized to access SENTRY.",
        )

    role = "admin" if user_id in ADMIN_USERS else "user"
    return SentryUser(id=user_id, role=role)


def require_admin(user: SentryUser = Depends(get_current_user)) -> SentryUser:
    """Dependency that enforces admin role.

    Use on admin-only endpoints like batch extraction, deletes, etc.

    Raises:
        HTTPException 403: if the authenticated user is not an admin.
    """
    if not user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin privileges required for this operation.",
        )
    return user


def get_auth_status() -> dict:
    """Return current auth posture for /api/health and frontend banner."""
    return {
        "auth_mode": AUTH_MODE,
        "auth_enabled": AUTH_MODE != "off",
        "auth_warning": (
            "⚠️ Authentication is DISABLED (SENTRY_AUTH_MODE=off). "
            "All users have anonymous admin access. "
            "This environment is NOT safe for shared or production use."
        ) if AUTH_MODE == "off" else None,
    }
