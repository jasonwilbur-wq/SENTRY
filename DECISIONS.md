# DECISIONS

## 2026-04-30 — Vendor Directory Risk & Scores data source hardening
- Context: Risk and score presentation in Vendor Directory was not reliably surfacing Vendor Assessment Report (VAR) data at both the card layer and the modal detail layer.
- Decision: Prefer latest available scored VAR metadata for Vendor Directory display when present.
- Implementation choice:
  - Enrich grouped vendor list payloads with latest VAR score, decision band, and component metrics.
  - In `VendorDetailModal`, fetch vendor detail plus linked VAR reports and derive fallback Risk & Scores directly from the latest scored VAR when the base payload is incomplete.
  - Surface a clearer Risk & Scores summary in the modal so key VAR metrics are visible above the fold.
- Rationale: This keeps Vendor Directory aligned with the source-of-record assessment artifact instead of relying only on product-row `overall_rating` fields.
- Status: Implemented, pending runtime validation.
- Follow-up hardening: Surface the pending state in two places so it is harder to miss:
  - inline under the modal header metadata
  - at the top of the Risk & Scores panel before summary cards

## 2026-04-30 — Distinguish linked VAR artifacts from extracted VAR scores
- Context: Backstreet Surveillance rendered the Risk & Scores UI successfully, but the vendor still showed no weighted score while being labeled `VAR Assessed`.
- Decision: Use more precise status language in Vendor Directory surfaces.
- Implementation choice:
  - Show `VAR Scored` when weighted score / structured VAR score data exists.
  - Show `VAR Linked` when a VAR artifact exists but score extraction is still pending.
  - Add an amber pending-state explanation inside the Risk & Scores tab when score extraction has not completed.
- Rationale: This avoids overstating evidence quality and improves trust when a vendor has a linked assessment document but no extracted score payload yet.
- Status: Implemented, pending runtime validation.
