"""Download the live 2026 regulatory workbook from SharePoint.

Uses the existing MSAL cache via sharepoint_auth.py and stores the workbook
under backend/data/source/ so the regulatory report builder can consume it
without depending on a personal OneDrive path.
"""
from __future__ import annotations

import sys
from pathlib import Path

import httpx

from sharepoint_auth import get_token

DRIVE_ID = "b!bgUvaNCAfEeuMSCKK3JM9GhT0I88o-1FhrrsYbU8Qz892RK9Ec5FQKlkEzWYqpZ4"
ITEM_ID = "01DJMQBMUXSMGQLL25NJELOZYGYPCOSTSJ"
OUTPUT_PATH = Path("data/source/Regulatory Data - 2026.xlsx")


def main() -> int:
    token = get_token()
    if not token:
        print("ERROR: No Graph token available from MSAL cache.", file=sys.stderr)
        return 1

    url = f"https://graph.microsoft.com/v1.0/drives/{DRIVE_ID}/items/{ITEM_ID}/content"
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with httpx.Client(follow_redirects=True, timeout=120) as client:
        response = client.get(url, headers={"Authorization": f"Bearer {token}"})

    if response.status_code != 200:
        print(f"ERROR: Download failed with HTTP {response.status_code}", file=sys.stderr)
        print(response.text[:500], file=sys.stderr)
        return 1

    OUTPUT_PATH.write_bytes(response.content)
    print(f"Downloaded workbook -> {OUTPUT_PATH} ({len(response.content):,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
