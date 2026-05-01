"""SENTRY — SharePoint auth + download proxy service.

Provides helpers to acquire a Graph API token (using the MSAL cache
created by build_var_index.py) and stream VAR report downloads.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

# ── MSAL config (matches build_var_index.py) ──────────────────────────

DRIVE_ID   = "b!bgUvaNCAfEeuMSCKK3JM9GhT0I88o-1FhrrsYbU8Qz892RK9Ec5FQKlkEzWYqpZ4"
TENANT_ID  = "3cbcc3d3-094d-4006-9849-0d11d61f484d"
CLIENT_ID  = "14d82eec-204b-4c2f-b7e8-296a70dab67e"
SCOPES     = [
    "https://graph.microsoft.com/Sites.Read.All",
    "https://graph.microsoft.com/Files.Read.All",
]
GRAPH_DOWNLOAD = (
    f"https://graph.microsoft.com/v1.0/drives/{DRIVE_ID}/items/{{item_id}}/content"
)

_CACHE_CANDIDATES = [
    Path.home() / ".code-puppy-venv" / "msal_token_cache.json",
    Path.home() / ".code-puppy"      / "msal_token_cache.json",
    Path.home() / ".code-puppy"      / "token_cache.json",
    Path.home() / ".msal_token_cache.json",
    Path.home() / ".msal_cache.json",
]


def _load_cache():
    """Load MSAL token cache from disk (whichever path exists)."""
    try:
        import msal
        cache = msal.SerializableTokenCache()
        for p in _CACHE_CANDIDATES:
            if p.exists():
                try:
                    cache.deserialize(p.read_text(encoding="utf-8"))
                    return cache
                except Exception:
                    pass
        return cache
    except ImportError:
        return None


def get_token() -> Optional[str]:
    """Try to get a Graph API access token silently from MSAL cache.

    Returns the token string or None if unavailable.
    """
    try:
        import msal
    except ImportError:
        return None

    cache = _load_cache()
    if cache is None:
        return None

    app = msal.PublicClientApplication(
        CLIENT_ID,
        authority=f"https://login.microsoftonline.com/{TENANT_ID}",
        token_cache=cache,
    )
    for acct in app.get_accounts():
        result = app.acquire_token_silent(SCOPES, account=acct)
        if result and "access_token" in result:
            return result["access_token"]
    return None


def download_url_for_item(item_id: str) -> str:
    """Return the Graph API content URL for a drive item."""
    return GRAPH_DOWNLOAD.format(item_id=item_id)
