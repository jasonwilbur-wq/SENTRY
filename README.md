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

## GitHub → Cloud (Full CI/CD)

Every push to `master` does two things in sequence:
1. **Backend** (FastAPI + SQLite) → Google Cloud Run (`sentry-api`, `us-central1`)
2. **Frontend** (React) → Firebase Hosting (`sentry-b873a.web.app`)

Firebase Hosting's `/api/**` rewrite transparently proxies the frontend
to Cloud Run — no hardcoded URLs, no CORS issues, it just works.

Pull Requests only deploy a **frontend preview** — the production API is never touched.

---

## Setting Up GitHub Secrets (One-Time)

Every push to `master` auto-deploys to `https://sentry-b873a.web.app`.
Pull Requests get a unique preview URL posted as a PR comment.

You need **two GitHub secrets**. Add them at:
👉 https://github.com/sdi2015/SENTRY_v2/settings/secrets/actions

---

### Secret 1 of 2 — `FIREBASE_SERVICE_ACCOUNT_SENTRY_B873A`

This lets GitHub deploy to Firebase Hosting.

```
1. Go to: https://console.firebase.google.com/project/sentry-b873a/settings/serviceaccounts/adminsdk
2. Click "Generate new private key" → "Generate key"
3. A JSON file downloads — open it and copy ALL the text
4. GitHub: New secret → Name: FIREBASE_SERVICE_ACCOUNT_SENTRY_B873A → paste JSON
```

---

### Secret 2 of 2 — `GCP_SA_KEY`

This lets GitHub deploy the FastAPI backend to Cloud Run.

**Step A — Create a service account in GCP:**
```
1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=sentry-b873a
2. Click "+ Create Service Account"
3. Name: github-deploy
4. Description: GitHub Actions — Cloud Run deployments
5. Click "Create and Continue"
```

**Step B — Grant it these 5 roles:**
| Role | Why |
|---|---|
| Cloud Run Admin | Deploy/update Cloud Run services |
| Service Account User | Cloud Build runs as a service account |
| Cloud Build Service Account | Build the Docker image |
| Storage Admin | Cloud Build artifact bucket |
| Artifact Registry Administrator | Push Docker images |

```
6. Add all 5 roles above → Click "Continue" → Click "Done"
```

**Step C — Download the JSON key:**
```
7. Click the new "github-deploy" service account
8. Go to "Keys" tab → "Add Key" → "Create new key" → JSON
9. A JSON file downloads — copy ALL the text
10. GitHub: New secret → Name: GCP_SA_KEY → paste JSON
```

---

### That's it! Push anything to `master` to trigger the full deploy:

```bash
git push origin master
# → Cloud Run deploys backend (~3-4 min first time, ~1-2 min after)
# → Firebase Hosting deploys frontend (~1-2 min)
# → https://sentry-b873a.web.app is fully live
```

**Watch the progress:**
👉 https://github.com/sdi2015/SENTRY_v2/actions

---

### One-Time Setup: Add the Firebase Secret to GitHub

You only need to do this **once**. After that, every `git push` deploys automatically.

**Step 1 — Get the Firebase service account JSON:**
```
1. Go to: https://console.firebase.google.com/project/sentry-b873a/settings/serviceaccounts/adminsdk
2. Click "Generate new private key"
3. Click "Generate key" in the dialog
4. A JSON file downloads to your computer — keep it safe!
```

**Step 2 — Add it to GitHub:**
```
1. Go to: https://github.com/sdi2015/SENTRY_v2/settings/secrets/actions/new
2. Click "New repository secret"
3. Name:  FIREBASE_SERVICE_ACCOUNT_SENTRY_B873A
4. Value: paste the ENTIRE contents of the JSON file you downloaded
5. Click "Add secret"
```

**Step 3 — Push anything to trigger a deploy:**
```bash
git push origin master
# GitHub Actions runs: install → typecheck → build → deploy
# Live in ~2 minutes at https://sentry-b873a.web.app
```

**That's it.** The workflow file is already in `.github/workflows/firebase-deploy.yml`.

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
  --set-env-vars ALLOWED_ORIGINS=https://sentry-b873a.web.app,https://sentry-b873a.firebaseapp.com

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

- **Firebase project:** `sentry-b873a`
- **Hosting URL:** `https://sentry-b873a.web.app`
- **Alt URL:** `https://sentry-b873a.firebaseapp.com`
- **Team:** Emerging Technology Security
- **Slack:** #emerging-tech-security
