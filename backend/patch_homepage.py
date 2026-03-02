"""
patch_homepage.py
=================
Directly PATCHes and publishes the SENTRY SharePoint home page
using an interactive MSAL device-code flow (write scopes).

Usage:
    cd backend
    .venv\\Scripts\\python.exe patch_homepage.py
"""
from __future__ import annotations

import json
import sys

import msal
import requests

# ── Auth config ──────────────────────────────────────────────────────────
TENANT_ID = "3cbcc3d3-094d-4006-9849-0d11d61f484d"
CLIENT_ID = "14d82eec-204b-4c2f-b7e8-296a70dab67e"
SCOPES     = ["https://graph.microsoft.com/Sites.ReadWrite.All"]

# ── Page identifiers ─────────────────────────────────────────────────────
SITE_ID = (
    "teams.wal-mart.com,682f056e-80d0-477c-ae31-208a2b724cf4"
    ",8fd05368-a33c-45ed-86ba-ec61b53c433f"
)
PAGE_ID = "3baa052d-36de-49b1-a2d9-c42a1e940e8d"

BASE = f"https://graph.microsoft.com/beta/sites/{SITE_ID}/pages/{PAGE_ID}/microsoft.graph.sitePage"

# ── Page content ─────────────────────────────────────────────────────────
# Each capability tile uses a native fourColumns section so the gradient
# sits on the outermost div (survives SharePoint's HTML sanitiser).
# Metrics + resource grids use <table> layout (grid/gap are stripped).

HERO_HTML = (
    '<div style="padding:52px 48px 44px 48px;'
    'background:linear-gradient(135deg,#001040 0%,#0053e2 60%,#003080 100%);">'
    '<div style="display:inline-block;background-color:#FFC220;color:#000000;'
    'font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;'
    'padding:5px 14px;border-radius:20px;margin-bottom:18px;">'
    'ENTERPRISE SECURITY \u2014 ENTERPRISE TECHNOLOGY</div>'
    '<h1 style="color:#ffffff;font-size:44px;font-weight:900;line-height:1.12;'
    'margin:0 0 16px 0;">Securing Walmart\u2019s Future<br>'
    '<span style="color:#FFC220;">Through Emerging Technology</span></h1>'
    '<p style="color:rgba(255,255,255,0.80);font-size:16px;line-height:1.65;'
    'max-width:660px;margin:0 0 30px 0;">'
    'Rigorous evaluation, scoring, and deployment of cutting-edge security '
    'technologies across Walmart\u2019s global enterprise. From counter-UAS to '
    'agentic AI \u2014 we assess what matters, score it objectively, and pilot '
    'what protects.</p>'
    '<table border="0" cellspacing="0" cellpadding="0"><tr>'
    '<td style="padding-right:10px;">'
    '<a href="https://teams.wal-mart.com/sites/EmergingTechnologySecurity/Vault" '
    'style="background-color:#FFC220;color:#000000;padding:13px 22px;'
    'border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;'
    'display:inline-block;">\U0001f5c4\ufe0f Vault \u2014 Data Repository</a></td>'
    '<td style="padding-right:10px;">'
    '<a href="https://teams.wal-mart.com/sites/EmergingTechnologySecurity/Lists/Vendor%20Database%20v15" '
    'style="background-color:rgba(255,255,255,0.12);color:#ffffff;padding:13px 22px;'
    'border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;'
    'display:inline-block;border:1px solid rgba(255,255,255,0.35);">'
    '\U0001f3e2 Vendor Database</a></td>'
    '<td><a href="https://teams.wal-mart.com/sites/EmergingTechnologySecurity/Lists/Counter%20UAS%20Project%20Tracking" '
    'style="background-color:rgba(255,255,255,0.12);color:#ffffff;padding:13px 22px;'
    'border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;'
    'display:inline-block;border:1px solid rgba(255,255,255,0.35);">'
    '\U0001f681 Counter-UAS</a></td>'
    '</tr></table></div>'
)

MISSION_HTML = (
    '<div style="padding:32px 20px 32px 4px;">'
    '<div style="display:inline-block;background-color:#0053e2;color:#ffffff;'
    'font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;'
    'padding:3px 10px;border-radius:20px;margin-bottom:14px;">OUR MISSION</div>'
    '<h2 style="color:#0f172a;font-size:24px;font-weight:800;line-height:1.3;'
    'margin:0 0 14px 0;">Enterprise Security \u2014 Enterprise Technology</h2>'
    '<p style="color:#475569;font-size:15px;line-height:1.72;margin:0 0 14px 0;">'
    'The <strong>EST team</strong> serves as Walmart\u2019s dedicated emerging '
    'technology security evaluation function. We research, assess, score, and pilot '
    'the security technologies that protect our 1.6M associates, 10,500+ stores, '
    'and global digital infrastructure.</p>'
    '<p style="color:#475569;font-size:15px;line-height:1.72;margin:0 0 22px 0;">'
    'Our assessments span physical security, cyber-physical systems, AI/ML platforms, '
    'counter-UAS, robotics, biometrics, and agentic AI \u2014 evaluated against '
    'Walmart\u2019s compliance, risk, maturity, integration, and ROI framework.</p>'
    '<div style="border-left:3px solid #FFC220;padding-left:14px;">'
    '<p style="color:#0f172a;font-size:14px;font-style:italic;margin:0 0 6px 0;'
    'line-height:1.6;">\u201cEvaluating the technologies that defend the world\u2019s '
    'largest retailer \u2014 because the stakes demand rigor.\u201d</p>'
    '<p style="color:#94a3b8;font-size:12px;margin:0;">\u2014 Jason Wilbur, '
    'Sr. Security Manager &nbsp;\u00b7&nbsp; Richard Ivy, Group Director '
    '&nbsp;\u00b7&nbsp; Jerrad Crabtree, CSO</p>'
    '</div></div>'
)

METRICS_HTML = (
    '<div style="padding:32px 4px 32px 20px;">'
    '<div style="display:inline-block;background-color:#0053e2;color:#ffffff;'
    'font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;'
    'padding:3px 10px;border-radius:20px;margin-bottom:16px;">LIVE METRICS</div>'
    '<table border="0" cellspacing="8" cellpadding="0" width="100%">'
    '<tr>'
    '<td width="33%" style="vertical-align:top;">'
    '<div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;'
    'padding:16px 12px;text-align:center;">'
    '<div style="font-size:26px;font-weight:900;color:#0053e2;line-height:1;">1,931</div>'
    '<div style="font-size:11px;color:#475569;font-weight:600;margin-top:5px;">Vendors Assessed</div>'
    '</div></td>'
    '<td width="33%" style="vertical-align:top;">'
    '<div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;'
    'padding:16px 12px;text-align:center;">'
    '<div style="font-size:26px;font-weight:900;color:#2a8703;line-height:1;">900+</div>'
    '<div style="font-size:11px;color:#475569;font-weight:600;margin-top:5px;">VAR Reports</div>'
    '</div></td>'
    '<td width="33%" style="vertical-align:top;">'
    '<div style="background-color:#fff1f2;border:1px solid #fecdd3;border-radius:10px;'
    'padding:16px 12px;text-align:center;">'
    '<div style="font-size:26px;font-weight:900;color:#ea1100;line-height:1;">1,113</div>'
    '<div style="font-size:11px;color:#475569;font-weight:600;margin-top:5px;">Competitor Events</div>'
    '</div></td>'
    '</tr><tr>'
    '<td width="33%" style="vertical-align:top;padding-top:8px;">'
    '<div style="background-color:#fefce8;border:1px solid #fef08a;border-radius:10px;'
    'padding:16px 12px;text-align:center;">'
    '<div style="font-size:26px;font-weight:900;color:#d97706;line-height:1;">12</div>'
    '<div style="font-size:11px;color:#475569;font-weight:600;margin-top:5px;">Tech Categories</div>'
    '</div></td>'
    '<td width="33%" style="vertical-align:top;padding-top:8px;">'
    '<div style="background-color:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;'
    'padding:16px 12px;text-align:center;">'
    '<div style="font-size:26px;font-weight:900;color:#7c3aed;line-height:1;">135</div>'
    '<div style="font-size:11px;color:#475569;font-weight:600;margin-top:5px;">Competitors Tracked</div>'
    '</div></td>'
    '<td width="33%" style="vertical-align:top;padding-top:8px;">'
    '<div style="background-color:#ecfeff;border:1px solid #a5f3fc;border-radius:10px;'
    'padding:16px 12px;text-align:center;">'
    '<div style="font-size:26px;font-weight:900;color:#0891b2;line-height:1;">8</div>'
    '<div style="font-size:11px;color:#475569;font-weight:600;margin-top:5px;">Active Pilots</div>'
    '</div></td>'
    '</tr></table></div>'
)

CAPABILITIES_HEADER_HTML = (
    '<div style="padding:40px 0 20px 0;border-top:2px solid #e2e8f0;">'
    '<div style="display:inline-block;background-color:#0053e2;color:#ffffff;'
    'font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;'
    'padding:3px 10px;border-radius:20px;margin-bottom:12px;">CORE CAPABILITIES</div>'
    '<h2 style="color:#0f172a;font-size:28px;font-weight:800;margin:0 0 8px 0;">What We Do</h2>'
    '<p style="color:#64748b;font-size:15px;margin:0;">'
    'Four primary workstreams \u2014 each backed by data, rigorous methodology, '
    'and direct executive reporting.</p></div>'
)


def _tile(gradient: str, emoji: str, label: str, title: str, desc: str, href: str, link_text: str) -> str:
    return (
        f'<div style="background:linear-gradient({gradient});'
        'border-radius:12px;padding:28px 22px 24px 22px;min-height:220px;">'
        f'<div style="font-size:38px;margin-bottom:16px;">{emoji}</div>'
        f'<div style="color:#FFC220;font-size:10px;font-weight:700;'
        'letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">'
        f'{label}</div>'
        f'<div style="color:#ffffff;font-size:15px;font-weight:700;'
        f'line-height:1.4;margin-bottom:10px;">{title}</div>'
        f'<div style="color:rgba(255,255,255,0.78);font-size:13px;'
        f'line-height:1.6;margin-bottom:18px;">{desc}</div>'
        f'<a href="{href}" style="color:#FFC220;font-size:12px;'
        f'font-weight:700;text-decoration:none;">{link_text} &#8594;</a></div>'
    )


TILE_SENTRY = _tile(
    "150deg,#001a5e 0%,#0053e2 100%",
    "\U0001f6e1\ufe0f",
    "SENTRY PLATFORM",
    "Vendor Assessment Intelligence",
    "1,931 vendors assessed and scored. 900+ published VAR reports spanning "
    "physical security, AI, robotics, biometrics, and counter-UAS.",
    "https://teams.wal-mart.com/sites/EmergingTechnologySecurity/SitePages",
    "Browse Reports",
)

TILE_FORECAST = _tile(
    "150deg,#2d0070 0%,#7c3aed 100%",
    "\U0001f4ca",
    "Q1 2026 FORECAST",
    "Security Technology Forecast",
    "12-category emerging security tech assessment for Q1 2026. "
    "8 active MVPs, $7M+ pilot portfolio, and 12\u201324 month deployment roadmap.",
    "https://teams.wal-mart.com/sites/EmergingTechnologySecurity/Vault",
    "View Forecast",
)

TILE_CUAS = _tile(
    "150deg,#003d00 0%,#2a8703 100%",
    "\U0001f681",
    "COUNTER-UAS",
    "Drone Threat Assessment",
    "Active evaluation of counter-drone technologies and C-UAS deployment across "
    "Walmart\u2019s real estate footprint. FAA-aligned operational framework.",
    "https://teams.wal-mart.com/sites/EmergingTechnologySecurity/Lists/Counter%20UAS%20Project%20Tracking",
    "View Project Tracker",
)

TILE_REG = _tile(
    "150deg,#431407 0%,#c2410c 100%",
    "\u2696\ufe0f",
    "REGULATORY INTEL",
    "Law, Policy &amp; Compliance",
    "50-state + federal tracking of AI laws, biometric regulations, ALPR restrictions, "
    "and data privacy mandates affecting Walmart\u2019s security tech deployments.",
    "https://teams.wal-mart.com/sites/EmergingTechnologySecurity/Lists/Regulatory",
    "View Regulatory Tracker",
)

FOOTER_HTML = (
    '<div style="padding:36px 48px;'
    'background:linear-gradient(135deg,#001040 0%,#0053e2 100%);">'
    '<table border="0" cellspacing="0" cellpadding="0" width="100%"><tr>'
    '<td style="vertical-align:middle;">'
    '<div style="display:inline-block;background-color:#FFC220;color:#000000;'
    'font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;'
    'padding:3px 10px;border-radius:20px;margin-bottom:12px;">ENTERPRISE SECURITY</div>'
    '<h2 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 6px 0;">'
    'Connect With The Team</h2>'
    '<p style="color:rgba(255,255,255,0.72);font-size:14px;margin:0;">'
    'Jason Wilbur \u00b7 Sr. Security Manager \u2014 EST &nbsp;|&nbsp; '
    'Richard Ivy \u00b7 Group Director &nbsp;|&nbsp; Jerrad Crabtree \u00b7 CSO</p></td>'
    '<td style="vertical-align:middle;text-align:right;white-space:nowrap;">'
    '<a href="mailto:j0w16ja@walmart.com" '
    'style="background-color:#FFC220;color:#000000;padding:11px 22px;'
    'border-radius:8px;font-weight:700;font-size:13px;text-decoration:none;'
    'display:inline-block;margin-right:10px;">\U0001f4e7 Contact Jason</a>'
    '<a href="https://walmart.enterprise.slack.com/archives/C094Y1D24JY" '
    'style="background-color:rgba(255,255,255,0.12);color:#ffffff;padding:11px 22px;'
    'border-radius:8px;font-weight:700;font-size:13px;text-decoration:none;'
    'display:inline-block;border:1px solid rgba(255,255,255,0.30);">\U0001f4ac Slack Channel</a>'
    '</td></tr></table></div>'
)


def _res_card(href: str, emoji: str, title: str, subtitle: str, top_pad: bool = False) -> str:
    pad = ' style="vertical-align:top;padding-top:10px;"' if top_pad else ' style="vertical-align:top;"'
    return (
        f'<td width="33%"{pad}>'
        f'<a href="{href}" style="text-decoration:none;">'
        '<div style="background-color:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:18px;">'
        '<table border="0" cellspacing="0" cellpadding="0"><tr>'
        f'<td style="vertical-align:middle;padding-right:12px;font-size:26px;">{emoji}</td>'
        '<td style="vertical-align:middle;">'
        f'<div style="font-size:13px;font-weight:700;color:#0f172a;">{title}</div>'
        f'<div style="font-size:11px;color:#64748b;margin-top:2px;">{subtitle}</div>'
        '</td></tr></table></div></a></td>'
    )


# ── Must define RESOURCES_HTML after _res_card is available ──────────────
RESOURCES_HTML = (
    '<div style="padding:40px 0 32px 0;">'
    '<div style="display:inline-block;background-color:#0053e2;color:#ffffff;'
    'font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;'
    'padding:3px 10px;border-radius:20px;margin-bottom:12px;">QUICK ACCESS</div>'
    '<h2 style="color:#0f172a;font-size:28px;font-weight:800;margin:0 0 8px 0;">Key Resources</h2>'
    '<p style="color:#64748b;font-size:15px;margin:0 0 24px 0;">'
    'Direct links to the team\u2019s most active data sources, trackers, and tools.</p>'
    '<table border="0" cellspacing="10" cellpadding="0" width="100%">'
    '<tr>'
    + _res_card("https://teams.wal-mart.com/sites/EmergingTechnologySecurity/Vault",
                "\U0001f5c4\ufe0f", "Vault \u2014 Data Repository", "Emerging Tech Tracker, raw data, exports")
    + _res_card("https://teams.wal-mart.com/sites/EmergingTechnologySecurity/Lists/Vendor%20Database%20v15",
                "\U0001f3e2", "Vendor Database v1.5", "Primary vendor intelligence registry")
    + _res_card("https://teams.wal-mart.com/sites/EmergingTechnologySecurity/Lists/Counter%20UAS%20Project%20Tracking",
                "\U0001f681", "Counter UAS Tracking", "Active C-UAS project &amp; vendor tracking")
    + '</tr><tr>'
    + _res_card("https://teams.wal-mart.com/sites/EmergingTechnologySecurity/Lists/Regulatory",
                "\u2696\ufe0f", "Regulatory Tracker", "AI, biometrics, ALPR &amp; privacy law intel",
                top_pad=True)
    + _res_card("https://teams.wal-mart.com/sites/EmergingTechnologySecurity/Lists/Tech%20Watch%20%2020250001",
                "\U0001f52d", "Tech Watch", "Emerging technology signal monitoring",
                top_pad=True)
    + _res_card("https://teams.wal-mart.com/sites/EmergingTechnologySecurity/Lists/Quality%20Vendor%20Leads",
                "\u2705", "Quality Vendor Leads", "Vetted inbound &amp; sourced vendor leads",
                top_pad=True)
    + '</tr></table></div>'
)


def _wp(html: str) -> dict:
    """Shorthand: build a textWebPart dict."""
    return {"@odata.type": "#microsoft.graph.textWebPart", "innerHtml": html}


PAYLOAD: dict = {
    "title": "Home",
    "canvasLayout": {
        "horizontalSections": [
            # §1 Hero
            {
                "layout": "fullWidth", "id": "1", "emphasis": "strong",
                "columns": [{"id": "1", "width": 0, "webparts": [_wp(HERO_HTML)]}],
            },
            # §2 Mission + Metrics
            {
                "layout": "twoColumns", "id": "2", "emphasis": "neutral",
                "columns": [
                    {"id": "1", "width": 6, "webparts": [_wp(MISSION_HTML)]},
                    {"id": "2", "width": 6, "webparts": [_wp(METRICS_HTML)]},
                ],
            },
            # §3 Capabilities header
            {
                "layout": "fullWidth", "id": "3", "emphasis": "none",
                "columns": [{"id": "1", "width": 0, "webparts": [_wp(CAPABILITIES_HEADER_HTML)]}],
            },
            # §4 Four capability tiles — one per native column
            {
                "layout": "fourColumns", "id": "4", "emphasis": "none",
                "columns": [
                    {"id": "1", "width": 3, "webparts": [_wp(TILE_SENTRY)]},
                    {"id": "2", "width": 3, "webparts": [_wp(TILE_FORECAST)]},
                    {"id": "3", "width": 3, "webparts": [_wp(TILE_CUAS)]},
                    {"id": "4", "width": 3, "webparts": [_wp(TILE_REG)]},
                ],
            },
            # §5 Key Resources
            {
                "layout": "fullWidth", "id": "5", "emphasis": "neutral",
                "columns": [{"id": "1", "width": 0, "webparts": [_wp(RESOURCES_HTML)]}],
            },
            # §6 Footer
            {
                "layout": "fullWidth", "id": "6", "emphasis": "strong",
                "columns": [{"id": "1", "width": 0, "webparts": [_wp(FOOTER_HTML)]}],
            },
        ]
    },
}


def get_token() -> str:
    """Acquire a Graph API token with write scopes via device code flow."""
    app = msal.PublicClientApplication(
        CLIENT_ID,
        authority=f"https://login.microsoftonline.com/{TENANT_ID}",
    )
    # Try silent first (re-use any cached read token)
    for acct in app.get_accounts():
        result = app.acquire_token_silent(SCOPES, account=acct)
        if result and "access_token" in result:
            print("  [auth] Using cached token.")
            return result["access_token"]

    # Fall back to device code flow
    flow = app.initiate_device_flow(scopes=SCOPES)
    print("\n" + "=" * 60)
    print("  ACTION REQUIRED — open this URL and enter the code:")
    print(f"  URL:  {flow['verification_uri']}")
    print(f"  Code: {flow['user_code']}")
    print("=" * 60 + "\n")
    result = app.acquire_token_by_device_flow(flow)  # blocks until auth
    if "access_token" not in result:
        print("ERROR: auth failed:", result.get("error_description"))
        sys.exit(1)
    return result["access_token"]


def main() -> None:
    print("SENTRY — SharePoint Home Page Patcher")
    print(f"Target: {BASE}\n")

    token = get_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    # ── PATCH ──────────────────────────────────────────────────────────
    print("[1/2] PATCHing page content...")
    r = requests.patch(BASE, headers=headers, json=PAYLOAD, timeout=30)
    print(f"      HTTP {r.status_code}")
    if r.status_code not in (200, 204):
        print("      ERROR body:", r.text[:800])
        sys.exit(1)
    print("      Page updated \u2713")

    # ── PUBLISH ────────────────────────────────────────────────────────
    print("[2/2] Publishing page...")
    r2 = requests.post(f"{BASE}/publish", headers=headers, timeout=15)
    print(f"      HTTP {r2.status_code}")
    if r2.status_code in (200, 204):
        print("      Published \u2713")
        print("\n\u2705 Done! View your page:")
        url = (
            "https://teams.wal-mart.com/sites/EmergingTechnologySecurity"
            "/SitePages/Home.aspx"
        )
        print(f"   {url}")
    else:
        print("      Publish error:", r2.text[:400])


if __name__ == "__main__":
    main()
