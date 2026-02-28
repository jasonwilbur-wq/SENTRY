"""One-off script: download + extract the Q1 Forecast DOCX from SharePoint."""
import io
import sys
import zipfile
from xml.etree import ElementTree as ET

import requests
from sharepoint_auth import get_token

DRIVE_ID = "b!bgUvaNCAfEeuMSCKK3JM9GhT0I88o-1FhrrsYbU8Qz892RK9Ec5FQKlkEzWYqpZ4"
ITEM_ID  = "01DJMQBMQ4D4PDVKTP6VGLGDTJMGKI6IDS"

def main() -> None:
    token = get_token()
    if not token:
        print("ERROR: No MSAL token — check SharePoint auth config", file=sys.stderr)
        sys.exit(1)
    print(f"Token OK (len={len(token)})")

    url = (
        f"https://graph.microsoft.com/v1.0/drives/{DRIVE_ID}/items/{ITEM_ID}/content"
    )
    print(f"Downloading from: {url}")
    r = requests.get(
        url,
        headers={"Authorization": f"Bearer {token}"},
        allow_redirects=True,
        timeout=120,
    )
    print(f"HTTP {r.status_code} — bytes={len(r.content):,}")

    if r.status_code != 200:
        print("FAILED:", r.text[:500], file=sys.stderr)
        sys.exit(1)

    docx_zip = zipfile.ZipFile(io.BytesIO(r.content))
    xml_bytes = docx_zip.read("word/document.xml")
    tree = ET.fromstring(xml_bytes)

    ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    lines: list[str] = []
    for para in tree.iter(f"{ns}p"):
        text = "".join(t.text or "" for t in para.iter(f"{ns}t"))
        if text.strip():
            lines.append(text.strip())

    content = "\n".join(lines)
    out_path = "forecast_extracted.txt"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"Extracted {len(lines)} paragraphs ({len(content):,} chars) -> {out_path}")
    # Preview first 2000 chars
    print("\n--- PREVIEW (first 2000 chars) ---")
    print(content[:2000])


if __name__ == "__main__":
    main()