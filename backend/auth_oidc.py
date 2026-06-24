"""OIDC/JWT validation helpers for SENTRY auth.

This module is intentionally small and provider-neutral.  It supports:
- standard OIDC bearer tokens for Walmart SSO / Entra / Google Identity setups;
- Google Cloud IAP JWT assertions when SENTRY is deployed behind IAP.

PyJWT is imported lazily so local header-auth development and existing tests do
not require the crypto dependency until an OIDC/IAP mode is enabled.
"""
from __future__ import annotations

from functools import lru_cache
from time import monotonic
from typing import Any

JWKS_CACHE_TTL_SECONDS = 3600


@lru_cache(maxsize=16)
def _jwks_client(jwks_url: str, ttl_bucket: int):
    _ = ttl_bucket
    try:
        from jwt import PyJWKClient
    except ImportError as exc:  # pragma: no cover - exercised only when misconfigured
        raise RuntimeError(
            "SENTRY_AUTH_MODE=oidc/iap requires PyJWT[crypto]. "
            "Install backend requirements before enabling production auth."
        ) from exc
    return PyJWKClient(jwks_url)


def validate_jwt_token(
    token: str,
    *,
    issuer: str,
    audience: str,
    jwks_url: str,
) -> dict[str, Any]:
    """Validate a JWT and return its claims.

    Raises ValueError with a sanitized message for auth failures. Detailed token
    contents are never logged or returned to callers.
    """
    if not token:
        raise ValueError("missing token")
    if not issuer:
        raise ValueError("missing OIDC issuer")
    if not audience:
        raise ValueError("missing OIDC audience")
    if not jwks_url:
        raise ValueError("missing OIDC JWKS URL")

    try:
        import jwt
        ttl_bucket = int(monotonic() // JWKS_CACHE_TTL_SECONDS)
        signing_key = _jwks_client(jwks_url, ttl_bucket).get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            audience=audience,
            issuer=issuer,
            options={
                "require": ["exp", "iat"],
            },
        )
    except Exception as exc:  # noqa: BLE001 - sanitize all JWT library details
        raise ValueError("invalid identity token") from exc

    if not isinstance(claims, dict):
        raise ValueError("invalid identity claims")
    return claims
