"""Download and extract the Q1 2026 Forecast DOCX via pre-auth SharePoint URL."""
import io
import zipfile
from xml.etree import ElementTree as ET

import requests

DOWNLOAD_URL = (
    "https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/download.aspx"
    "?UniqueId=3a1e1f1c-6faa-4cf5-b30e-6961948f2072&Translate=false"
    "&tempauth=v1.eyJzaXRlaWQiOiI2ODJmMDU2ZS04MGQwLTQ3N2MtYWUzMS0yMDhhMmI3MjRjZjQiLCJhcHBfZGlzcGxheW5hbWUiOiJHcmFwaCBFeHBsb3JlciIsImFwcGlkIjoiZGU4YmM4YjUtZDlmOS00OGIxLWE4YWQtYjc0OGRhNzI1MDY0IiwiYXVkIjoiMDAwMDAwMDMtMDAwMC0wZmYxLWNlMDAtMDAwMDAwMDAwMDAwL3RlYW1zLndhbC1tYXJ0LmNvbUAzY2JjYzNkMy0wOTRkLTQwMDYtOTg0OS0wZDExZDYxZjQ4NGQiLCJleHAiOiIxNzcyMjAxNDg4In0.CkAKDGVudHJhX2NsYWltcxIwQ0orc2hzMEdFQUFhRmxsSVFrOXRlVzg1ZWpCVFZUZHlYMGt5ZW1kd1FVRXFBQT09CjIKCmFjdG9yYXBwaWQSJDAwMDAwMDAzLTAwMDAtMDAwMC1jMDAwLTAwMDAwMDAwMDAwMAoKCgRzbmlkEgI2NBILCI7d3oP4gvs-EAUaCzQwLjEyNi44LjQwKixOa2JORTJ1eUZGeGhBMXNBQlZmM2ZxSFBxZlhBbkxKbUc4eE9HayttazdBPTCTATgBQhCh-xZpolAAsPjsxK4SdeKZShBoYXNoZWRwcm9vZnRva2VuUghbImttc2kiXWokMDAxMjMwNWEtZjlhZS1jZGMwLTYxYzAtNmFkYTFmMTdmYTgycikwaC5mfG1lbWJlcnNoaXB8MTAwMzIwMDRiMDBjMTZkYUBsaXZlLmNvbXoBMoIBEgnTw7w8TQkGQBGYSQ0R1h9ITZIBBUphc29umgEGV2lsYnVyogEfajB3MTZqYUBob21lb2ZmaWNlLndhbC1tYXJ0LmNvbaoBEDEwMDMyMDA0QjAwQzE2REGyAa0BbXlmaWxlcy5yZWFkIGFsbGZpbGVzLnJlYWQgbXlmaWxlcy53cml0ZSBhbGxmaWxlcy53cml0ZSBncm91cC5yZWFkIGdyb3VwLndyaXRlIGFsbHNpdGVzLnJlYWQgYWxsc2l0ZXMud3JpdGUgc2VsZWN0ZWRzaXRlcyBhbGxwcm9maWxlcy5yZWFkIGFsbHByb2ZpbGVzLnJlYWQgYWxscHJvZmlsZXMud3JpdGXIAQHiARZZSEJPbXlvOXowU1U3cl9JMnpncEFB.ZRXuhL2ObgqxojscrxrcZSiJ0r1f5fYRZ7EcDBqjgUw"
    "&ApiVersion=2.0"
)

NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def extract_xml(xml_bytes: bytes) -> str:
    """Extract all paragraph text from a Word XML blob."""
    root = ET.fromstring(xml_bytes)
    lines: list[str] = []
    for para in root.iter(f"{{{NS}}}p"):
        parts = [t.text for t in para.iter(f"{{{NS}}}t") if t.text]
        if parts:
            lines.append("".join(parts))
        else:
            lines.append("")
    return "\n".join(lines)


def main() -> None:
    print("Downloading DOCX...")
    r = requests.get(DOWNLOAD_URL, allow_redirects=True, timeout=180)
    print(f"HTTP {r.status_code} — {len(r.content) / 1_000_000:.1f} MB")
    r.raise_for_status()

    docx_zip = zipfile.ZipFile(io.BytesIO(r.content))
    body = extract_xml(docx_zip.read("word/document.xml"))

    # Also grab tables explicitly (they're inside document.xml but iterate better)
    extras: list[str] = []
    for name in docx_zip.namelist():
        if name.startswith("word/header") or name.startswith("word/footer"):
            extras.append(extract_xml(docx_zip.read(name)))

    full = body
    if extras:
        full += "\n\n--- HEADERS/FOOTERS ---\n" + "\n".join(extras)

    out = "forecast_extracted.txt"
    with open(out, "w", encoding="utf-8") as f:
        f.write(full)

    print(f"Extracted {len(full):,} chars -> {out}")
    print("\n--- FIRST 3000 CHARS ---")
    print(full[:3000])


if __name__ == "__main__":
    main()