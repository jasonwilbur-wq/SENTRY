# SENTRY — Vendor Assessment & Intelligence Platform — Master PRD (v0.9)

Prepared for: Jason Wilbur  
Date: 2026-02-22

## Where this file should live
- Repo: `docs/PRD/SENTRY_Master_PRD_v0.9.md` and `docs/PRD/SENTRY_Master_PRD_v0.9.docx`
- In-app (optional): Firebase Storage `tenants/{tenantId}/docs/SENTRY_Master_PRD_v0.9.docx` + a Firestore doc with metadata for listing/download.

---

## 0. PRD Metadata
- Owner: Jason Wilbur
- Target runtime: MVP Firebase; later GCP expansion/migration
- Audience: Internal Walmart Emerging Tech stakeholders + approved users
- Data: Internal/Confidential (may include vendor contact PII)
- Environments: dev/stage/prod + feature flags + safe mode kill switch
- Dependencies: Firebase Auth/Firestore/Storage/Functions; Gemini via server-side gateway (later Walmart Gemini); optional Phase 2+: Doc AI, Cloud Run/IAP, full-text/vector search

## 1. Executive Summary
- Mission: secure system-of-record for VARs, projects, intel, competitors.
- Users: Admin, Analysts, Viewers, Restricted Viewers.
- Modules in scope: Directory, Projects, VAR ingestion (Word→structured + review→publish), Intel, Competitors, Request Assessment persistence, AI assistant (server-side).
- Success defaults: p95 <2s non-AI / <10s AI; availability ≥99.5%; cost ≤$1k/mo initial.

## 2. Coverage Matrix
(See DOCX for formatted table.)

## 3. Personas & User Stories
(See DOCX.)

## 4–17
(See DOCX. This Markdown is a lightweight companion for version control.)
