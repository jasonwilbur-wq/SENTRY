"""SENTRY — Automated morning report: generate + email via Outlook.

This script is called by the Windows Scheduled Task at 0500 daily.
It generates the HTML report from SQLite, then sends it to JRW
using the local Outlook COM object (no external API keys needed).
"""
import sys
from pathlib import Path

# Ensure backend modules are importable
sys.path.insert(0, str(Path(__file__).parent))

try:
    import win32com.client  # type: ignore[import-untyped]
except ImportError:
    print("ERROR: pywin32 not installed. Run: uv pip install pywin32")
    sys.exit(1)

from generate_report import generate

RECIPIENT = "Jason.Wilbur@walmart.com"
SUBJECT_PREFIX = "SENTRY Morning Report"


def send_outlook_email(html_path: str) -> None:
    """Send the generated HTML report as an inline email via Outlook COM."""
    from datetime import datetime

    html_content = Path(html_path).read_text(encoding="utf-8")
    today = datetime.now().strftime("%b %d, %Y")
    subject = f"{SUBJECT_PREFIX} \u2014 {today} | Emerging Technology Vendor Intelligence"

    outlook = win32com.client.Dispatch("Outlook.Application")
    mail = outlook.CreateItem(0)  # 0 = olMailItem
    mail.To = RECIPIENT
    mail.Subject = subject
    mail.HTMLBody = html_content
    mail.Importance = 2  # 2 = olImportanceHigh
    mail.Send()
    print(f"\u2709  Email sent to {RECIPIENT}")
    print(f"   Subject: {subject}")


def main() -> None:
    print("=" * 60)
    print("SENTRY Morning Report — Automated Run")
    print("=" * 60)

    # Step 1: Generate HTML report
    report_path = generate()

    # Step 2: Send via Outlook
    send_outlook_email(report_path)

    print("\n\u2705 Morning report complete.")


if __name__ == "__main__":
    main()
