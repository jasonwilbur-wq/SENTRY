# 🛡️ SENTRY v2 — Emerging Technology Vendor Intelligence Platform

> **Walmart Global Security, Aviation & Investigations • Enterprise Security**  
> Internal use only.

---

## Overview

SENTRY is a React + FastAPI application that provides a centralized vendor intelligence
directory for Emerging Technology security assessments. It surfaces VAR (Vendor Assessment
Report) documents from SharePoint, assessment pipeline data, and risk scoring — all in a
Walmart-branded dark UI.

```
Frontend  ── React 19 + Vite + TypeScript + Tailwind v4
Backend   ── FastAPI + SQLite (Cloud Run in production)
Auth      ── MSAL (Microsoft Graph API for SharePoint downloads)
Hosting   ── Firebase Hosting (frontend) + Google Cloud Run (backend)
```

---

## Local Development

```bash
# 1. Frontend (port 3000)
npm install
npm run dev

# 2. Backend (port 8082) — new terminal
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn main:app --port 8082 --reload
```

The Vite dev server automatically proxies `/api/*` to `http://127.0.0.1:8082`.
No environment variables are needed locally.

---

## Project Structure

```
sentry-v2-main/
├── components/
│   ├── vendor/                 ← Extracted tab sub-components
│   │   ├── shared.tsx          ← TabButton, RatingBar, bandStyle, VAR_DIMENSIONS
│   │   ├── OverviewTab.tsx     ← Vendor profile overview
│   │   ├── HistoryTab.tsx      ← Monthly assessment highlights
│   │   └── VarTab.tsx          ← VAR reports + radar chart + download
│   ├── VendorDashboard.tsx     ← Grid of vendor cards
│   ├── VendorDetailModal.tsx   ← Slide-over panel (slim shell)
│   ├── TechAssessmentTab.tsx   ← Pipeline stepper
│   └── ...
├── services/
│   └── api.ts                  ← All API calls + getDownloadUrl()
├── context/
│   └── VendorContext.tsx        ← Global vendor state
├── backend/
│   ├── main.py                 ← FastAPI application
│   ├── models.py               ← Pydantic response models
│   ├── database.py             ← SQLite connection + schema
│   ├── sharepoint_auth.py      ← MSAL Graph API token helper
│   ├── requirements.txt        ← Pinned Python deps
│   └── Dockerfile              ← Cloud Run container
├── firebase.json               ← Hosting + Cloud Run rewrite
├── .firebaserc                 ← Firebase project config
├── .env.development            ← Dev env (safe to commit)
├── .env.example                ← Template (safe to commit)
└── .env.production             ← NEVER COMMIT — in .gitignore
```

---

## Firebase + Cloud Run Deployment

### Prerequisites

1. Firebase CLI: `npm install -g firebase-tools`
2. gcloud CLI: https://cloud.google.com/sdk/docs/install
3. Docker (for local backend testing)

### Step 1 — Set your Firebase project

```bash
firebase login
firebase use --add    # pick your project
# or edit .firebaserc manually
```

### Step 2 — Deploy the backend to Cloud Run

```bash
gcloud run deploy sentry-api \
  --source ./backend \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ALLOWED_ORIGINS=https://YOUR_PROJECT.web.app

# Note the Cloud Run URL: https://sentry-api-HASH-uc.a.run.app
```

### Step 3 — Set the production API URL

Edit `.env.production`:

```
VITE_API_URL=https://sentry-api-HASH-uc.a.run.app
```

> Note: With the Cloud Run rewrite in `firebase.json`, `VITE_API_URL` can also
> be left empty and Firebase will proxy `/api/**` to Cloud Run automatically.

### Step 4 — Build + deploy the frontend

```bash
npm run deploy
# This runs: vite build && firebase deploy --only hosting
```

### Step 5 — Preview before going live

```bash
npm run deploy:preview
# Opens a temporary preview channel URL
```

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_API_URL` | Frontend (Vite) | Backend base URL. Empty = relative (dev proxy or Firebase rewrite). |
| `ALLOWED_ORIGINS` | Backend (Cloud Run) | Comma-separated allowed CORS origins. |

---

## Database

SQLite (`backend/data/sentry.db`) is the current System of Record.
The DB is excluded from git. For production Cloud Run, mount a persistent
disk or migrate to **Cloud SQL** (AlloyDB recommended per SENTRY PRD Phase I).

| Table | Rows | Purpose |
|---|---|---|
| `vendors` | ~1,930 | Master vendor list |
| `var_reports` | ~988 | Linked SharePoint VAR documents |
| `vendor_highlights` | ~1,943 | Monthly CSV assessment highlights |

---

## SENTRY Phase Roadmap

| Phase | Status | Description |
|---|---|---|
| Phase 1 | ✅ | Vendor DB, schema, import pipeline |
| Phase 2 | ✅ | SharePoint VAR Vault indexing, 4-pass matching, download proxy |
| Phase 3 | 🚧 | Admin UI for manual VAR linking, bulk score extraction |
| Phase 4 | 🚧 | Cloud SQL migration, IAP zero-trust, Cloud Build CI/CD |

---

## Contact

- **Owner:** Jason Wilbur (j0w16ja)
- **Team:** Emerging Technology Security
- **Slack:** #emerging-tech-security
