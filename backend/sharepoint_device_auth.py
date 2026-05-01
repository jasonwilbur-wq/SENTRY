"""Interactive MSAL device-code auth for SharePoint Graph downloads.

Stores token cache at ~/.msal_token_cache.json so sharepoint_auth.get_token()
can acquire tokens silently for VAR score extraction jobs.
"""

from __future__ import annotations

from pathlib import Path

import msal

from sharepoint_auth import CLIENT_ID, SCOPES, TENANT_ID

CACHE_PATH = Path.home() / ".msal_token_cache.json"


def main() -> None:
    cache = msal.SerializableTokenCache()
    if CACHE_PATH.exists():
        cache.deserialize(CACHE_PATH.read_text(encoding="utf-8"))

    app = msal.PublicClientApplication(
        CLIENT_ID,
        authority=f"https://login.microsoftonline.com/{TENANT_ID}",
        token_cache=cache,
    )

    # Silent first
    for acct in app.get_accounts():
        result = app.acquire_token_silent(SCOPES, account=acct)
        if result and "access_token" in result:
            if cache.has_state_changed:
                CACHE_PATH.write_text(cache.serialize(), encoding="utf-8")
            print("Token already available. Cache refreshed.")
            return

    flow = app.initiate_device_flow(scopes=SCOPES)
    if "user_code" not in flow:
        raise RuntimeError(f"Device flow init failed: {flow}")

    print("\n=== SharePoint Device Login Required ===")
    print(f"Open: {flow['verification_uri']}")
    print(f"Code: {flow['user_code']}")
    print("After sign-in, return here and wait for completion...\n")

    result = app.acquire_token_by_device_flow(flow)
    if "access_token" not in result:
        raise RuntimeError(f"Auth failed: {result.get('error_description') or result}")

    CACHE_PATH.write_text(cache.serialize(), encoding="utf-8")
    print(f"Token cache saved: {CACHE_PATH}")


if __name__ == "__main__":
    main()
