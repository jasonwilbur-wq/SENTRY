# Brainstorm: Getting a finalized scout bundle into the live exec-intel feed

Date: 2026-05-29
Owner: JRW
Status: Decision Made
Facilitator: Atlas 🐶

> Note: framing questions were sent but the prompt timed out, so the framing
> below is Atlas's best-judgment default. JRW can redirect and we re-run cheaply.

## Problem Statement
We promoted competitor CSO/CISO profiles to a SQLite-backed feed with a governed
write endpoint (`POST /api/exec-intel/import`, finalized-only, user-gated). Today
the only way to actually call that endpoint is a hand-typed `curl`. We need to
decide how an analyst moves a finalized Executive Signal Scout bundle into the
live feed — safely, repeatably, and with an audit trail.

## Good Outcome
An analyst who has finalized a bundle can land it in the live feed in one
obvious, low-error step, with provenance + who/when recorded, and a way to see
what changed before it goes live.

## Failure Mode (most expensive)
A wrong or unverified bundle silently overwrites/contaminates the live feed that
a CSO reads as fact — OR — the path is so manual/fragile that analysts bypass
governance (paste JSON into the DB, edit the seed file, etc.). Governance theatre
that people route around is worse than no governance.

## Constraints
| Constraint | Status |
|---|---|
| Write path must stay governed: finalized-only, identified actor | CONFIRMED |
| Scout stays human-in-the-loop (no auto-scheduled collection) | CONFIRMED (prior decision) |
| No new outbound/external system; all local | CONFIRMED |
| Must not store credentials/secrets | CONFIRMED |
| Reuse existing patterns over inventing new ones (DRY) | CONFIRMED |
| Frontend changes must meet WCAG 2.2 AA | CONFIRMED |
| Analysts are not all comfortable with curl/CLI | ASSUMED |
| Volume is low (handful of profiles, periodic updates) | ASSUMED |
| Admin auth/role gating already exists in app | CONFIRMED (admin routes + is_admin) |

## Options Considered

### Option 1: Do nothing — document the curl/CLI one-liner
- What: Ship a README snippet; analysts POST the bundle with curl + `X-Sentry-User`.
- Why right: Zero new code. YAGNI. Endpoint already works and is tested.
- Why wrong: curl is error-prone, no diff preview, easy to fat-finger; the
  ASSUMED "analysts dislike curl" constraint makes bypass likely.
- Risk: Analysts edit the seed/DB directly to avoid curl → governance bypass.
- Reversibility: High (it's nothing).

### Option 2: CLI `--push` subcommand
- What: Extend `executive_intel/cli.py handoff` with `--push` that POSTs the
  built the import endpoint directly.
- Why right: Tiny, lives next to the bundle builder, keeps one tool for the
  whole analyst flow (build → finalize → push). Very DRY.
- Why wrong: Still terminal-only; non-technical analysts unserved; no visual diff.
- Risk: Pushes without a preview; the actor must pass identity correctly.
- Reversibility: High (additive flag).

### Option 3:n button — upload bundle JSON
- What: VAR Admin panel gets an "Import scout bundle" file picker that POSTs the
  selected bundle JSON to the endpoint; shows the result summary.
- Why right: Serves non-curl analysts; uses existing admin gating + API client;
  closes the loop with minimal UI.
- Why wrong: Upload-then-commit with no review step = same blind-trust risk as
  curl, just prettier. No "see what changes before it's live."
- Risk: One click contaminates the live feed; hard to undo without DB surgery.
- Reversibility: Medium (need a rollback path).

### Option 4: Staged import review queue (mirror VAR review queue)
- What: Importing lands the bundle in a PENDING state. Admin sees a diff
  (new/changed findings per profile), then Approve commits or Reject discard Reuses the existing VAR extraction review-queue pattern.
- Why right: Directly kills the top failure mode — nothing goes live unseen.
  Strong audit trail (who reviewed, who approved, what changed). Matches a
  pattern already in the codebase, so it's idiomatic not novel.
- Why wrong: Most build effort (pending table, diff view, approve/reject routes
  + UI). Could be overbuilding if volume is genuinely tiny (YAGNI tension).
- Risk: Scope creep into a mini workflow engine.
- Reversibility: Medium (it's a feature, but additive).

### Option 5: Auto-import on finalize (no separate step)
- What: When the scout finalizes a bundle, it writes straight to the live DB.
- Why right: Fewest human steps; "it just appears."
- Why wrong: Violates the CONFIRMED human-in-the-loop + governed-write
  constraints. Removes the deliberate seam we built on purpose.
- Risk: Unreviewed data goes live; collapses the governance boundary.
- Reversibility: High to revert code, but Low to undo bad data already published.

## Stress-Test Notes
- **Failure-mode lens:** Options 1, 3, 5 all share the blind-commit risk — data
  goes live without anyone seeing the delta. Only Option 4 (and a variant of
  Option 2, if `--push` printed a diff) defends the most expensive failure.
- **Bypass lens:** Option 1 most likely to be routed around. The more friction
  without payoff, the more likely a tired analyst edits the DB directly.
- **DRY lens:** Option 4 reuses an existing review-queue pattern; Option 2 reuses
  the existing CLI. Both score well. Option 3 invents a one-off widget.
- **YAGNI lens:** If volume is truly ~5 profiles updated monthly, Option 4 may be
  heavier than the problem deserves *today*. Option 2 is the minimum that's both
  safe-ish and ergonomic.
- **Six-months-later lens:** Whoever inherits this will thank us for a visible
  diff + audit trail (Option 4) and curse a curl-only path (Option 1).
- **New option surfg stress-test → Option 2b:** CLI `--push --dry-run`
  that fetches current state and prints the diff WITHOUT committing, then a
  second `--push` to commit. Gets ~80% of Option 4's safety at ~20% of the cost,
  no frontend. This is the load-bearing insight from stress-testing.

## Decision
**Chosen:** Option 2b — CLI `--push` with a `--dry-run` diff preview, now;
Option 4 (staged review queue) deferred as the upgrade path if/when volume or
non-technical analyst demand justifies it.

**Rationale:** It defends the most expensive failure mode (blind commit) by
making the change reviewable before it lands, keeps the entire analyst workflow
in one already-existing tool (DRY), adds no frontend surface to maintain, and
respects the human-in-the-loop + governed-write constraints. It's the simplest
option that is actually *safe*, not merely *convenient*. We explicitly keep the
door open to Option 4 by treating the diff logic as reusable — if we later build
the review-queue UI, it consumes the same diff function.

**Rejected options:**
- **Option 1 (curl only):** Fails the bypass + ergonomics test; invites
  direct-DB governance bypass.
- **Option 3 (upload button):** Prettier curl; doesn't solve blind-commit, adds a
  one-off UI widget, weaker than 2b on safety for more cost.
- **Option 5 (auto-import):** Violates two CONFIRMED constraints outright.
- **Option 4 (review queue):** Right shape, wrong time — deferred on YAGNI until
  volume/audience justifies the build. Kept as the documented upgrade path.

## Open Questions
| ID | Question | Owner | Blocking? |
|---|---|---|---|
| Q1 | Is "analysts dislike curl" real, or are the 1-2 analysts fine in a terminal? | JRW | Soft — flips us toward Option 3/4 if false-assumed |
| Q2 | Real update volume/cadence? (drives Option 4 timing) | JRW | No |
| Q3 | Should `--push` require a `--finalized-by` match against `X-Sentry-User`? | JRW | No (safe default: yes) |
| Q4 | Do we need a one-shot rollback (revert last import) before any push path? | JRW | Soft — cheap insurance |

## Next Step
- If JRW confirms framing → implement Option 2b (`--push` + `--dry-run` diff),
  with tests, reusing the existing import endpoint. Diff logic written as a
  standalone function so a future Option 4 UI can reuse it.
- If framing is wrong or Q1 flips → re-run convergence toward Option 3/4.
- If requirements need deeper extraction first → `/grill-me`.
