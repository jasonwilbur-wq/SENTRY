# SENTRY Executive Intelligence

This folder defines the **SENTRY Executive Signal Scout** workflow for public-source executive competitor intelligence.

## Purpose

Collect, verify, normalize, and review public information about competitor executives so it can support Walmart CSO awareness inside SENTRY.

This is **not** a private-person tracker. It is a governed OSINT workflow for business-relevant public signals.

## Files

| File | Purpose |
|---|---|
| `EXECUTIVE_SIGNAL_SCOUT.md` | Agent role, operating model, tools, and outputs |
| `SOURCE_POLICY.md` | Allowed/prohibited sources and verification rules |
| `DATA_CONTRACT.md` | Uniform data model for profiles, sources, signals, and runs |
| `RUNBOOK.md` | Manual, weekly, monthly, and future scheduler workflow |
| `WEB_ACCESS.md` | Code Puppy web-access routing, tools, and boundaries |

## Related Config

| Path | Purpose |
|---|---|
| `agents/exec-signal-scout.agent.json` | Standalone Code Puppy-style agent manifest |
| `C:\\Users\\j0w16ja\\.code_puppy\\agents\\exec-signal-scout.json` | Installed local Code Puppy agent manifest |
| `config/executive_intel_sources.example.json` | Source policy config template |
| `config/executive_intel_watchlist.example.json` | Watchlist template |
| `data/executive-intel/` | Local data workspace, ignored by git by default |

## Default Cadence

- Daily lightweight delta watch
- Weekly analyst review and SENTRY-ready synthesis
- Monthly deep refresh per tracked executive

## Approval Reminder

No outbound report, scheduled job, external write, schema change, or production integration happens without explicit approval.
