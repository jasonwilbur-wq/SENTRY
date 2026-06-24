"""SENTRY Backend — Authentication & Authorization.

Production goal: work cleanly on GCP while remaining Walmart SSO/OIDC-ready.

Supported modes:
    off             Development-only bypass; never allowed in production.
    header          Local/test mode. Requires X-Sentry-User allowlist header.
                    Refused in production by default because browser-supplied
                    identity headers are spoofable.
    trusted-header  For a trusted ingress/proxy that strips client identity
                    headers and injects a verified identity header. Production
                    requires a shared internal auth secret header as a second
                    guard unless the platform fully enforces private ingress.
    oidc            Standard Authorization: Bearer <JWT> validation via issuer,
                    audience, and JWKS URL. Suitable for Walmart SSO / Entra /
                    Google Identity style launches.
    iap             Google Cloud IAP JWT assertion validation from
                    X-Goog-IAP-JWT-Assertion. Suitable for Cloud Run behind IAP.

Never deploy with raw client-controlled X-Sentry-User as the production identity
boundary. Use oidc or iap when SENTRY moves to a shared hosted environment.
"""
from __future__ import annotations

import hmac
import logging
import os
import sys
from dataclasses import dataclass, field
from time import time
from typing import Any

from fastapi import Depends, HTTPException, Request


LOGGER = logging.getLogger("sentry.auth")
AUTH_FAILURE_MESSAGE = "Authentication failed. Contact your SENTRY administrator."
_AUTH_FAILURES: dict[str, list[float]] = {}


# ── Configuration ─────────────────────────────────────────────────────────────

def _parse_csv_env(key: str, default: str = "") -> set[str]:
    """Parse a comma-separated env var into a lowercase set, ignoring blanks."""
    raw = os.environ.get(key, default)
    return {v.strip().lower() for v in raw.split(",") if v.strip()}


def _csv_values(key: str, default: str = "") -> list[str]:
    raw = os.environ.get(key, default)
    return [v.strip() for v in raw.split(",") if v.strip()]


def _env_bool(key: str, default: bool = False) -> bool:
    raw = os.environ.get(key)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


AUTH_MODE: str = os.environ.get("SENTRY_AUTH_MODE", "header").lower()
APP_ENV: str = os.environ.get("SENTRY_ENV", os.environ.get("ENVIRONMENT", "development")).lower()

ADMIN_USERS: set[str] = _parse_csv_env("SENTRY_ADMIN_USERS")
ALLOWED_USERS: set[str] = _parse_csv_env("SENTRY_ALLOWED_USERS") | ADMIN_USERS
ADMIN_GROUPS: set[str] = _parse_csv_env("SENTRY_ADMIN_GROUPS")
ALLOWED_GROUPS: set[str] = _parse_csv_env("SENTRY_ALLOWED_GROUPS") | ADMIN_GROUPS

AUTH_HEADER = os.environ.get("SENTRY_AUTH_HEADER", "X-Sentry-User")
TRUSTED_HEADER_SECRET_HEADER = os.environ.get("SENTRY_TRUSTED_HEADER_SECRET_HEADER", "X-Sentry-Auth-Secret")
TRUSTED_HEADER_SECRET = os.environ.get("SENTRY_TRUSTED_HEADER_SECRET", "")
ALLOW_HEADER_AUTH_IN_PRODUCTION = _env_bool("SENTRY_ALLOW_HEADER_AUTH_IN_PRODUCTION", False)

OIDC_ISSUER = os.environ.get("SENTRY_OIDC_ISSUER", "")
OIDC_AUDIENCE = os.environ.get("SENTRY_OIDC_AUDIENCE", "")
OIDC_JWKS_URL = os.environ.get("SENTRY_OIDC_JWKS_URL", "")
OIDC_USER_CLAIMS = _csv_values("SENTRY_OIDC_USER_CLAIMS", "preferred_username,email,upn,sub")
OIDC_GROUPS_CLAIM = os.environ.get("SENTRY_OIDC_GROUPS_CLAIM", "groups")

IAP_JWT_HEADER = os.environ.get("SENTRY_IAP_JWT_HEADER", "X-Goog-IAP-JWT-Assertion")
IAP_ISSUER = os.environ.get("SENTRY_IAP_ISSUER", "https://cloud.google.com/iap")
IAP_AUDIENCE = os.environ.get("SENTRY_IAP_AUDIENCE", "")
IAP_JWKS_URL = os.environ.get("SENTRY_IAP_JWKS_URL", "https://www.gstatic.com/iap/verify/public_key-jwk")

AUTH_RATE_LIMIT_WINDOW_SECONDS = int(os.environ.get("SENTRY_AUTH_RATE_LIMIT_WINDOW_SECONDS", "300"))
AUTH_RATE_LIMIT_MAX_FAILURES = int(os.environ.get("SENTRY_AUTH_RATE_LIMIT_MAX_FAILURES", "30"))

SUPPORTED_AUTH_MODES = {"off", "header", "trusted-header", "oidc", "iap"}
PRODUCTION_ENVS = {"prod", "production"}


def _validate_production_config(
    app_env: str,
    auth_mode: str,
    allowed_users: set[str],
    admin_users: set[str],
    *,
    admin_groups: set[str] | None = None,
    oidc_issuer: str = "",
    oidc_audience: str = "",
    oidc_jwks_url: str = "",
    iap_audience: str = "",
    trusted_header_secret: str = "",
    allow_header_auth_in_production: bool = False,
) -> None:
    """Fail fast on production auth configurations that are unsafe or unusable."""
    if auth_mode not in SUPPORTED_AUTH_MODES:
        raise RuntimeError(f"Unsupported SENTRY_AUTH_MODE '{auth_mode}'.")

    if app_env not in PRODUCTION_ENVS:
        return

    admin_groups = admin_groups or set()
    has_admin_principal = bool(admin_users or admin_groups)

    if auth_mode == "off":
        raise RuntimeError("Refusing to start SENTRY in production with SENTRY_AUTH_MODE=off.")

    if auth_mode == "header" and not allow_header_auth_in_production:
        raise RuntimeError(
            "Refusing production SENTRY_AUTH_MODE=header because X-Sentry-User is client-spoofable. "
            "Use SENTRY_AUTH_MODE=oidc or iap for GCP/SSO deployments."
        )

    if auth_mode == "header":
        if not allowed_users:
            raise RuntimeError("Production header-auth requires SENTRY_ALLOWED_USERS or SENTRY_ADMIN_USERS.")
        if not admin_users:
            raise RuntimeError("Production header-auth requires at least one SENTRY_ADMIN_USERS entry.")

    if auth_mode == "trusted-header":
        if not trusted_header_secret:
            raise RuntimeError("Production trusted-header auth requires SENTRY_TRUSTED_HEADER_SECRET.")
        if not allowed_users and not admin_users:
            raise RuntimeError("Production trusted-header auth requires SENTRY_ALLOWED_USERS or SENTRY_ADMIN_USERS.")
        if not admin_users:
            raise RuntimeError("Production trusted-header auth requires at least one SENTRY_ADMIN_USERS entry.")

    if auth_mode == "oidc":
        if not (oidc_issuer and oidc_audience and oidc_jwks_url):
            raise RuntimeError(
                "Production OIDC auth requires SENTRY_OIDC_ISSUER, SENTRY_OIDC_AUDIENCE, "
                "and SENTRY_OIDC_JWKS_URL."
            )
        if not has_admin_principal:
            raise RuntimeError("Production OIDC auth requires SENTRY_ADMIN_USERS or SENTRY_ADMIN_GROUPS.")

    if auth_mode == "iap":
        if not iap_audience:
            raise RuntimeError("Production IAP auth requires SENTRY_IAP_AUDIENCE.")
        if not has_admin_principal:
            raise RuntimeError("Production IAP auth requires SENTRY_ADMIN_USERS or SENTRY_ADMIN_GROUPS.")


_validate_production_config(
    APP_ENV,
    AUTH_MODE,
    ALLOWED_USERS,
    ADMIN_USERS,
    admin_groups=ADMIN_GROUPS,
    oidc_issuer=OIDC_ISSUER,
    oidc_audience=OIDC_AUDIENCE,
    oidc_jwks_url=OIDC_JWKS_URL,
    iap_audience=IAP_AUDIENCE,
    trusted_header_secret=TRUSTED_HEADER_SECRET,
    allow_header_auth_in_production=ALLOW_HEADER_AUTH_IN_PRODUCTION,
)


# ── Startup warning for insecure mode ─────────────────────────────────────────

if AUTH_MODE == "off":
    _warn = (
        "\n"
        "  ╔══════════════════════════════════════════════════════════════╗\n"
        "  ║    SENTRY_AUTH_MODE=off — AUTHENTICATION IS DISABLED     ║\n"
        "  ║  All users are treated as anonymous admins.                 ║\n"
        "  ║  DO NOT use this setting in shared or production envs.      ║\n"
        "  ║  Set SENTRY_AUTH_MODE=oidc/iap for secured operation.       ║\n"
        "  ╚══════════════════════════════════════════════════════════════╝\n"
    )
    print(_warn, file=sys.stderr)

if APP_ENV in PRODUCTION_ENVS and AUTH_MODE == "header" and ALLOW_HEADER_AUTH_IN_PRODUCTION:
    print(
        "WARNING: SENTRY_ALLOW_HEADER_AUTH_IN_PRODUCTION is enabled. Only use this "
        "behind a trusted gateway that strips inbound identity headers.",
        file=sys.stderr,
    )


# ── User model ────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class SentryUser:
    """Authenticated user identity. Immutable and hashable."""

    id: str
    role: str  # "admin" | "user"
    email: str = ""
    groups: tuple[str, ...] = field(default_factory=tuple)
    auth_mode: str = AUTH_MODE

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


_ANONYMOUS_ADMIN = SentryUser(id="anonymous", role="admin", auth_mode="off")


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    return request.client.host if request.client else "unknown"


def _audit_auth_event(request: Request, event: str, *, user_id: str = "", role: str = "", reason: str = "") -> None:
    LOGGER.info(
        "sentry_auth_event",
        extra={
            "event": event,
            "auth_mode": AUTH_MODE,
            "user_id": user_id,
            "role": role,
            "path": request.url.path,
            "method": request.method,
            "client_ip": _client_ip(request),
            "reason": reason,
        },
    )


def _rate_limit_key(request: Request) -> str:
    return f"{_client_ip(request)}:{AUTH_MODE}:{request.url.path}"


def _enforce_auth_rate_limit(request: Request) -> None:
    if AUTH_RATE_LIMIT_MAX_FAILURES <= 0:
        return
    now = time()
    cutoff = now - AUTH_RATE_LIMIT_WINDOW_SECONDS
    key = _rate_limit_key(request)
    failures = [ts for ts in _AUTH_FAILURES.get(key, []) if ts >= cutoff]
    _AUTH_FAILURES[key] = failures
    if len(failures) >= AUTH_RATE_LIMIT_MAX_FAILURES:
        _audit_auth_event(request, "auth_rate_limited", reason="too_many_recent_failures")
        raise HTTPException(status_code=429, detail="Too many authentication attempts. Try again later.")


def _record_auth_failure(request: Request, reason: str) -> None:
    now = time()
    key = _rate_limit_key(request)
    _AUTH_FAILURES.setdefault(key, []).append(now)
    _audit_auth_event(request, "auth_failed", reason=reason)


def _record_auth_success(request: Request, user: SentryUser) -> None:
    _AUTH_FAILURES.pop(_rate_limit_key(request), None)
    _audit_auth_event(request, "auth_succeeded", user_id=user.id, role=user.role)


def _role_for(user_id: str, groups: set[str] | None = None) -> str:
    group_set = {g.lower() for g in (groups or set())}
    if user_id.lower() in ADMIN_USERS or group_set.intersection(ADMIN_GROUPS):
        return "admin"
    return "user"


def _enforce_allowlist(user_id: str, groups: set[str] | None = None) -> None:
    group_set = {g.lower() for g in (groups or set())}
    if ALLOWED_USERS and user_id.lower() not in ALLOWED_USERS:
        # If group allowlists are configured, group membership can also permit access.
        if not (ALLOWED_GROUPS and group_set.intersection(ALLOWED_GROUPS)):
            raise HTTPException(status_code=403, detail=AUTH_FAILURE_MESSAGE)
    if ALLOWED_GROUPS and not group_set.intersection(ALLOWED_GROUPS) and user_id.lower() not in ALLOWED_USERS:
        raise HTTPException(status_code=403, detail=AUTH_FAILURE_MESSAGE)


def _user_from_id(user_id: str, *, email: str = "", groups: set[str] | None = None, auth_mode: str = AUTH_MODE) -> SentryUser:
    normalized = user_id.strip().lower()
    if not normalized:
        raise HTTPException(status_code=401, detail="Authentication required.")
    groups = {g.strip().lower() for g in (groups or set()) if g.strip()}
    _enforce_allowlist(normalized, groups)
    return SentryUser(
        id=normalized,
        role=_role_for(normalized, groups),
        email=email.strip().lower(),
        groups=tuple(sorted(groups)),
        auth_mode=auth_mode,
    )


def _header_user(request: Request) -> SentryUser:
    user_id = (request.headers.get(AUTH_HEADER) or "").strip().lower()
    if not user_id:
        raise HTTPException(status_code=401, detail=f"Authentication required. Send {AUTH_HEADER} header.")
    return _user_from_id(user_id, auth_mode="header")


def _trusted_header_user(request: Request) -> SentryUser:
    if TRUSTED_HEADER_SECRET:
        presented = request.headers.get(TRUSTED_HEADER_SECRET_HEADER, "")
        if not hmac.compare_digest(presented, TRUSTED_HEADER_SECRET):
            raise HTTPException(status_code=401, detail="Trusted identity assertion missing or invalid.")
    user_id = (request.headers.get(AUTH_HEADER) or "").strip().lower()
    if not user_id:
        raise HTTPException(status_code=401, detail=f"Trusted identity header {AUTH_HEADER} is missing.")
    return _user_from_id(user_id, auth_mode="trusted-header")


def _bearer_token(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    scheme, _, token = auth.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Authentication required. Send Authorization: Bearer token.")
    return token.strip()


def _claims_to_user(claims: dict[str, Any], *, auth_mode: str) -> SentryUser:
    groups_raw = claims.get(OIDC_GROUPS_CLAIM) or []
    if isinstance(groups_raw, str):
        groups = {groups_raw}
    elif isinstance(groups_raw, list | tuple | set):
        groups = {g for g in groups_raw if isinstance(g, str)}
    else:
        groups = set()

    user_id = ""
    for claim in OIDC_USER_CLAIMS:
        value = claims.get(claim)
        if value:
            user_id = str(value)
            break
    if not user_id:
        raise HTTPException(status_code=401, detail="Identity token did not include a usable user claim.")

    email = str(claims.get("email") or user_id)
    return _user_from_id(user_id, email=email, groups=groups, auth_mode=auth_mode)


def _oidc_user(request: Request) -> SentryUser:
    from auth_oidc import validate_jwt_token

    try:
        claims = validate_jwt_token(
            _bearer_token(request),
            issuer=OIDC_ISSUER,
            audience=OIDC_AUDIENCE,
            jwks_url=OIDC_JWKS_URL,
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    return _claims_to_user(claims, auth_mode="oidc")


def _iap_user(request: Request) -> SentryUser:
    from auth_oidc import validate_jwt_token

    token = (request.headers.get(IAP_JWT_HEADER) or "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Google IAP identity assertion is missing.")
    try:
        claims = validate_jwt_token(
            token,
            issuer=IAP_ISSUER,
            audience=IAP_AUDIENCE,
            jwks_url=IAP_JWKS_URL,
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    return _claims_to_user(claims, auth_mode="iap")


# ── FastAPI dependencies ──────────────────────────────────────────────────────

def get_current_user(request: Request) -> SentryUser:
    """Extract and validate the caller identity for the active auth mode."""
    _enforce_auth_rate_limit(request)
    try:
        if AUTH_MODE == "off":
            user = _ANONYMOUS_ADMIN
        elif AUTH_MODE == "header":
            user = _header_user(request)
        elif AUTH_MODE == "trusted-header":
            user = _trusted_header_user(request)
        elif AUTH_MODE == "oidc":
            user = _oidc_user(request)
        elif AUTH_MODE == "iap":
            user = _iap_user(request)
        else:
            raise HTTPException(status_code=500, detail="SENTRY auth is misconfigured.")
    except HTTPException as exc:
        _record_auth_failure(request, str(exc.status_code))
        raise

    _record_auth_success(request, user)
    return user


def require_admin(user: SentryUser = Depends(get_current_user)) -> SentryUser:
    """Dependency that enforces admin role."""
    if not user.is_admin:
        LOGGER.warning(
            "sentry_admin_access_denied",
            extra={"user_id": user.id, "role": user.role, "auth_mode": user.auth_mode},
        )
        raise HTTPException(status_code=403, detail="Admin privileges required for this operation.")
    return user


def protected_read_dependencies() -> list[Depends]:
    """Router dependencies for data-read APIs.

    Local header mode intentionally preserves existing localhost ergonomics.
    Hosted/prod-ready modes protect read APIs automatically so GCP/IAP/OIDC
    launches do not expose vendor/intel data as anonymous public endpoints.
    """
    if AUTH_MODE in {"oidc", "iap", "trusted-header"} or APP_ENV in PRODUCTION_ENVS:
        return [Depends(get_current_user)]
    return []


def get_auth_status() -> dict[str, object]:
    """Return current auth posture for /api/health and frontend banner."""
    warning = None
    if AUTH_MODE == "off":
        warning = (
            " Authentication is DISABLED (SENTRY_AUTH_MODE=off). "
            "All users have anonymous admin access. This environment is NOT safe for shared or production use."
        )
    elif AUTH_MODE == "header":
        warning = (
            "Header-auth is for local development/testing only. Production must use OIDC, IAP, or a trusted gateway."
            if APP_ENV in PRODUCTION_ENVS or ALLOW_HEADER_AUTH_IN_PRODUCTION
            else None
        )

    return {
        "auth_mode": AUTH_MODE,
        "auth_enabled": AUTH_MODE != "off",
        "auth_warning": warning,
        "auth_user_header": AUTH_HEADER if AUTH_MODE in {"header", "trusted-header"} else None,
        "auth_provider": "google-iap" if AUTH_MODE == "iap" else ("oidc" if AUTH_MODE == "oidc" else AUTH_MODE),
    }
