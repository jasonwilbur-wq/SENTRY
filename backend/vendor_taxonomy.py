"""Canonical SENTRY vendor taxonomy helpers.

The source trackers contain dozens of near-duplicate labels. This module keeps
Vendor Directory category behavior stable and intentionally under 20 buckets.
"""
from __future__ import annotations

import re

CANONICAL_CATEGORIES: tuple[str, ...] = (
    "AI, Agents & Automation",
    "Cloud, Data & Infrastructure",
    "Communications & Collaboration",
    "Cybersecurity",
    "Drones, UAS & Counter-UAS",
    "Energy, Facilities & Environment",
    "Geospatial, Mapping & Situational Awareness",
    "Governance, Risk & Compliance",
    "Identity, Biometrics & Access",
    "Payments, Fraud & FinTech",
    "Perimeter, Alarm & Physical Security",
    "RFID, Inventory & Retail Operations",
    "Robotics & Autonomous Systems",
    "Sensors, Detection & IoT",
    "Supply Chain, Logistics & Asset Protection",
    "Video Analytics & Computer Vision",
    "Video Surveillance & VMS",
    "Other / Watchlist",
)

_CATEGORY_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("Drones, UAS & Counter-UAS", (
        "counter uas", "counter-uas", "cuas", "c-uas", "drone", "drones", "uas", "uav", "dfend", "dedrone", "skydio", "aerial", "airship",
    )),
    ("Robotics & Autonomous Systems", (
        "robot", "robotics", "amr", "ugv", "humanoid", "quadruped", "autonomous mobile", "warehouse automation",
    )),
    ("Identity, Biometrics & Access", (
        "biometric", "biometrics", "facial", "face", "iris", "identity", "idv", "access control", "pacs", "badge", "passkey", "authentication", "auth", "keyless", "egate", "credential",
    )),
    ("Cybersecurity", (
        "cyber", "security platform", "soc", "siem", "dlp", "threat", "vulnerability", "endpoint", "zero trust", "sase", "firewall", "malware", "phishing", "secrets", "cloud security", "bot protection", "secure access", "browser isolation", "ransomware",
    )),
    ("Video Analytics & Computer Vision", (
        "computer vision", "video analytics", "vision ai", "image recognition", "object detection", "yolo", "visual analytics", "theftspotter", "frt", "facial recognition cctv",
    )),
    ("Video Surveillance & VMS", (
        "vms", "nvr", "dvr", "camera", "cctv", "surveillance", "video management", "video insight", "thermal surveillance", "exacq", "milestone", "genetec", "hanwha", "axis",
    )),
    ("Sensors, Detection & IoT", (
        "sensor", "sensors", "iot", "radar", "lidar", "rf", "acoustic", "mmwave", "environmental", "detection", "imu", "edge device", "weapon detection", "gunshot", "sensor fusion",
    )),
    ("RFID, Inventory & Retail Operations", (
        "rfid", "inventory", "eas", "esl", "electronic shelf", "shelf", "loss prevention", "pos", "checkout", "cart", "retail workflow", "store ops", "store operations", "just walk out",
    )),
    ("Perimeter, Alarm & Physical Security", (
        "perimeter", "alarm", "intrusion", "gate", "bollard", "barrier", "entrance", "lock", "trailer", "guard", "fence", "pids", "turnstile",
    )),
    ("Payments, Fraud & FinTech", (
        "payment", "payments", "fraud", "fintech", "wallet", "bank", "gift card", "visa", "stripe", "clover", "financial",
    )),
    ("Supply Chain, Logistics & Asset Protection", (
        "supply chain", "logistics", "fleet", "delivery", "asset", "warehouse", "freight", "telematics", "return", "shipping", "cold chain",
    )),
    ("Cloud, Data & Infrastructure", (
        "cloud", "data", "database", "lake", "infrastructure", "network", "connectivity", "wifi", "wi-fi", "edge compute", "gpu", "server", "processor", "storage", "blackwell", "trainium",
    )),
    ("AI, Agents & Automation", (
        "agentic", "genai", "generative", "llm", "ai agent", "chatgpt", "gemini", "claude", "copilot", "automation", "autonomous ai", "ai assistant", "foundation model",
    )),
    ("Governance, Risk & Compliance", (
        "compliance", "governance", "grc", "privacy", "policy", "regulatory", "third-party risk", "third party risk", "vendor risk", "audit",
    )),
    ("Geospatial, Mapping & Situational Awareness", (
        "map", "mapping", "geospatial", "satellite", "gis", "situational", "location intelligence", "digital twin", "sar",
    )),
    ("Communications & Collaboration", (
        "communication", "radio", "voice", "intercom", "collaboration", "notification", "messaging",
    )),
    ("Energy, Facilities & Environment", (
        "energy", "facility", "facilities", "hvac", "waste", "green", "solar", "battery", "ebike", "building", "environment",
    )),
)

RAW_CATEGORY_OVERRIDES: dict[str, str] = {
    "alpr/lpr": "Video Analytics & Computer Vision",
    "alpr / lpr": "Video Analytics & Computer Vision",
    "audio analytics": "Sensors, Detection & IoT",
    "biometrics": "Identity, Biometrics & Access",
    "browser isolation / secure access": "Cybersecurity",
    "cloud security": "Cybersecurity",
    "command & control/psim": "Perimeter, Alarm & Physical Security",
    "command & control / psim": "Perimeter, Alarm & Physical Security",
    "counter-uas (c-uas/cuas)": "Drones, UAS & Counter-UAS",
    "cyber-physical": "Cybersecurity",
    "data privacy": "Governance, Risk & Compliance",
    "drones/uas/dfr": "Drones, UAS & Counter-UAS",
    "eas/rfid": "RFID, Inventory & Retail Operations",
    "edge ai/iot": "Sensors, Detection & IoT",
    "edge ai / iot": "Sensors, Detection & IoT",
    "identity/sso/zero trust": "Identity, Biometrics & Access",
    "identity / sso / zero trust": "Identity, Biometrics & Access",
    "network security": "Cybersecurity",
    "perimeter ids (pids)": "Perimeter, Alarm & Physical Security",
    "robotics/amrs": "Robotics & Autonomous Systems",
    "robotics / amrs": "Robotics & Autonomous Systems",
    "store ops tech": "RFID, Inventory & Retail Operations",
    "supply chain tech": "Supply Chain, Logistics & Asset Protection",
    "video analytics/ai": "Video Analytics & Computer Vision",
    "video analytics / ai": "Video Analytics & Computer Vision",
    "vms": "Video Surveillance & VMS",
    "weapon detection": "Sensors, Detection & IoT",
}


def normalize_vendor_key(value: str) -> str:
    """Normalize vendor names for durable matching across trackers and folders."""
    return re.sub(r"[^a-z0-9]+", "", (value or "").lower())


def searchable_text(*values: object) -> str:
    text = " ".join(str(v or "") for v in values).lower()
    text = re.sub(r"[_/\-]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def canonical_category(raw_category: str = "", *context: object) -> str:
    """Map tracker/report context to one of the canonical SENTRY categories."""
    raw_clean = searchable_text(raw_category)
    if raw_clean in RAW_CATEGORY_OVERRIDES:
        return RAW_CATEGORY_OVERRIDES[raw_clean]

    haystack = searchable_text(raw_category, *context)
    if not haystack:
        return "Other / Watchlist"

    for category, keywords in _CATEGORY_RULES:
        if any(keyword in haystack for keyword in keywords):
            return category
    return "Other / Watchlist"


def risk_from_rating(rating: float) -> str:
    if rating >= 4.0:
        return "Low"
    if rating >= 3.0:
        return "Medium"
    if rating >= 2.0:
        return "High"
    return "Critical"
