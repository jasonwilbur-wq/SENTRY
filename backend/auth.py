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
    SENTRY_AUTH_MODE       = "off" | "header"   (default: "off")
    SENTRY_ADMIN_USERS     = comma-separated list of admin user IDs
    SENTRY_ALLOWED_USERS   = comma-separated list of all allowed user IDs
                             (admins are automatically included)
"""
from __future__ import annotations

import os
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request


# ── Configuration ─────────────────────────────────────────────────────────────

def _parse_csv_env(key: str, default: str = "") -> set[str]:
    """Parse a comma-separated env var into a lowercase set, ignoring blanks."""
    raw = os.environ.get(key, default)
    return {v.strip().lower() for v in raw.split(",") if v.strip()}


AUTH_MODE: str = os.environ.get("SENTRY_AUTH_MODE", "off").lower()

ADMIN_USERS: set[str] = _parse_csv_env("SENTRY_ADMIN_USERS")
ALLOWED_USERS: set[str] = _parse_csv_env("SENTRY_ALLOWED_USERS") | ADMIN_USERS

# Header name for Phase 1 auth.
# ASSUMED: Phase 1 — upgrade to MSAL token validation in a future PR.
AUTH_HEADER = "X-Sentry-User"


# ── User model ────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class SentryUser:
    """Authenticated user identity. Immutable and hashable."""

    id: str
    role: str  # "admin" | "user"

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


# ── Anonymous fallback (AUTH_MODE=off) ────────────────────────────────────────

_ANONYMOUS_ADMIN = SentryUser(id="anonymous", role="admin")


# ── FastAPI dependencies ──────────────────────────────────────────────────────

def get_current_user(request: Request) -> SentryUser:
    """Extract and validate the calling user's identity.

    When AUTH_MODE is "off", returns an anonymous admin — this preserves
    backward compatibility for dev workflows where no auth header is sent.

    When AUTH_MODE is "header", validates X-Sentry-User against the allowlist
    and returns a typed SentryUser with the correct role.

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
