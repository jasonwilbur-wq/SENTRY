"""SENTRY — SharePoint auth + download proxy helpers.

Provides Graph token acquisition from the existing MSAL cache used by
index/link scripts. No interactive auth is performed here.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

# ── MSAL config (matches build_var_index.py) ──────────────────────────

DRIVE_ID = "b!bgUvaNCAfEeuMSCKK3JM9GhT0I88o-1FhrrsYbU8Qz892RK9Ec5FQKlkEzWYqpZ4"
TENANT_ID = "3cbcc3d3-094d-4006-9849-0d11d61f484d"
CLIENT_ID = "14d82eec-204b-4c2f-b7e8-296a70dab67e"
SCOPES = [
    "https://graph.microsoft.com/Sites.Read.All",
    "https://graph.microsoft.com/Files.Read.All",
]
GRAPH_DOWNLOAD = (
    f"https://graph.microsoft.com/v1.0/drives/{DRIVE_ID}/items/{{item_id}}/content"
)

_CACHE_CANDIDATES = [
    Path.home() / ".code-puppy-venv" / "msal_token_cache.json",
    Path.home() / ".code-puppy" / "msal_token_cache.json",
    Path.home() / ".code-puppy" / "token_cache.json",
    Path.home() / ".msal_token_cache.json",
    Path.home() / ".msal_cache.json",
]


def _load_cache_with_diagnostics():
    """Load MSAL token cache and provide non-sensitive diagnostics.

    Returns:
        (cache_or_none, details)
    """
    details = {
        "cache_path": "",
        "cache_paths_checked": [str(p) for p in _CACHE_CANDIDATES],
        "reason_code": "",
        "reason": "",
    }
    try:
        import msal
    except ImportError:
        details["reason_code"] = "MSAL_MISSING"
        details["reason"] = "msal package is not installed"
        return None, details

    cache = msal.SerializableTokenCache()
    found_any = False
    unreadable = False

    for p in _CACHE_CANDIDATES:
        if not p.exists():
            continue
        found_any = True
        try:
            cache.deserialize(p.read_text(encoding="utf-8"))
            details["cache_path"] = str(p)
            return cache, details
        except Exception:
            unreadable = True

    if unreadable:
        details["reason_code"] = "CACHE_UNREADABLE"
        details["reason"] = "MSAL cache file exists but could not be read"
    elif not found_any:
        details["reason_code"] = "CACHE_NOT_FOUND"
        details["reason"] = "No MSAL cache file found in known locations"
    else:
        details["reason_code"] = "CACHE_EMPTY"
        details["reason"] = "MSAL cache exists but did not deserialize"

    return cache, details


def get_token_diagnostics() -> dict:
    """Acquire Graph token silently and return diagnostics.

    Security posture:
      - never logs/returns token in diagnostics fields beyond internal caller
      - does not attempt interactive/device auth
    """
    cache, details = _load_cache_with_diagnostics()
    if cache is None:
        return {
            "available": False,
            "token": None,
            "reason_code": details.get("reason_code", "AUTH_UNAVAILABLE"),
            "reason": details.get("reason", "MSAL unavailable"),
            "cache_path": details.get("cache_path", ""),
            "cache_paths_checked": details.get("cache_paths_checked", []),
        }

    try:
        import msal
        app = msal.PublicClientApplication(
            CLIENT_ID,
            authority=f"https://login.microsoftonline.com/{TENANT_ID}",
            token_cache=cache,
        )

        accounts = app.get_accounts()
        if not accounts:
            return {
                "available": False,
                "token": None,
                "reason_code": "NO_ACCOUNTS",
                "reason": "No signed-in MSAL accounts in token cache",
                "cache_path": details.get("cache_path", ""),
                "cache_paths_checked": details.get("cache_paths_checked", []),
            }

        acquire_errors: list[str] = []
        for acct in accounts:
            result = app.acquire_token_silent(SCOPES, account=acct)
            if result and "access_token" in result:
                return {
                    "available": True,
                    "token": result["access_token"],
                    "reason_code": "OK",
                    "reason": "Token acquired silently from cache",
                    "cache_path": details.get("cache_path", ""),
                    "cache_paths_checked": details.get("cache_paths_checked", []),
                }
            if isinstance(result, dict) and result.get("error"):
                err = str(result.get("error"))
                desc = str(result.get("error_description", "")).strip()
                acquire_errors.append(f"{err}: {desc}" if desc else err)

        return {
            "available": False,
            "token": None,
            "reason_code": "SILENT_ACQUIRE_FAILED",
            "reason": "; ".join(acquire_errors)[:240] or "No access_token returned by acquire_token_silent",
            "cache_path": details.get("cache_path", ""),
            "cache_paths_checked": details.get("cache_paths_checked", []),
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "available": False,
            "token": None,
            "reason_code": "AUTH_EXCEPTION",
            "reason": str(exc)[:240],
            "cache_path": details.get("cache_path", ""),
            "cache_paths_checked": details.get("cache_paths_checked", []),
        }


def get_token() -> Optional[str]:
    """Backward-compatible token helper."""
    diag = get_token_diagnostics()
    token = diag.get("token")
    return token if isinstance(token, str) and token else None


def download_url_for_item(item_id: str) -> str:
    """Return the Graph API content URL for a drive item."""
    return GRAPH_DOWNLOAD.format(item_id=item_id)
