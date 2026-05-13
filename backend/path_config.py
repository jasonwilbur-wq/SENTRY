"""Centralized local path resolution for the Desktop SENTRY workspace.

Priority order:
1. Explicit env var overrides for each domain root.
2. SENTRY_DATA_ROOT for the shared Desktop SENTRY workspace.
3. Sensible local default under OneDrive Desktop\SENTRY.
"""

from __future__ import annotations

import os
from pathlib import Path

DEFAULT_ONEDRIVE_ROOT = Path(
    os.environ.get("ONEDRIVE", r"C:\Users\j0w16ja\OneDrive - Walmart Inc")
)
DEFAULT_SENTRY_ROOT = DEFAULT_ONEDRIVE_ROOT / "Desktop" / "SENTRY"

SENTRY_DATA_ROOT = Path(
    os.environ.get("SENTRY_DATA_ROOT", str(DEFAULT_SENTRY_ROOT))
)
VENDOR_ASSESSMENTS_ROOT = Path(
    os.environ.get(
        "SENTRY_VENDOR_ASSESSMENTS_ROOT",
        str(SENTRY_DATA_ROOT / "Vendor Assessments"),
    )
)
REGULATORY_ROOT = Path(
    os.environ.get(
        "SENTRY_REGULATORY_ROOT",
        str(SENTRY_DATA_ROOT / "Regulatory"),
    )
)
INCIDENTS_ROOT = Path(
    os.environ.get(
        "SENTRY_INCIDENT_DIR",
        str(SENTRY_DATA_ROOT / "Incidents"),
    )
)
PROJECTS_ROOT = Path(
    os.environ.get(
        "SENTRY_PROJECTS_ROOT",
        str(SENTRY_DATA_ROOT / "Projects"),
    )
)
SHARED_DATA_ROOT = Path(
    os.environ.get(
        "SENTRY_SHARED_DATA_ROOT",
        str(SENTRY_DATA_ROOT / "Data"),
    )
)

VENDOR_SYSTEM_ROOT = VENDOR_ASSESSMENTS_ROOT / "00_System"
VENDOR_REPORTS_ROOT = VENDOR_ASSESSMENTS_ROOT / "Vendor Assessment Reports"
VENDOR_TRACKERS_ROOT = VENDOR_ASSESSMENTS_ROOT / "Emerging Tech Trackers"
VENDOR_INCOMING_ROOT = VENDOR_ASSESSMENTS_ROOT / "01_Incoming_To_Organize"
VENDOR_EXECUTIVE_VIEWS_ROOT = VENDOR_SYSTEM_ROOT / "executive_views"
VENDOR_PROFILES_CSV = VENDOR_SYSTEM_ROOT / "vendor_assessment_vendor_profiles.csv"
INCIDENT_WORKBOOK_GLOB = os.environ.get(
    "SENTRY_INCIDENT_WORKBOOK_GLOB",
    str(SENTRY_DATA_ROOT / "Incident Tracker*.xlsx"),
)


def workspace_snapshot() -> dict[str, str]:
    return {
        "sentry_data_root": str(SENTRY_DATA_ROOT),
        "vendor_assessments_root": str(VENDOR_ASSESSMENTS_ROOT),
        "vendor_system_root": str(VENDOR_SYSTEM_ROOT),
        "vendor_reports_root": str(VENDOR_REPORTS_ROOT),
        "vendor_trackers_root": str(VENDOR_TRACKERS_ROOT),
        "regulatory_root": str(REGULATORY_ROOT),
        "incidents_root": str(INCIDENTS_ROOT),
        "projects_root": str(PROJECTS_ROOT),
        "shared_data_root": str(SHARED_DATA_ROOT),
    }
