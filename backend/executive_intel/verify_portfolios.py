"""Quick read-only verification of all executive-intel portfolios.

Prints a one-line summary per portfolio via the repository loader. No writes.
"""
from __future__ import annotations

from executive_intel.repository import ExecutiveIntelRepository


def main() -> int:
    repo = ExecutiveIntelRepository()
    listing = repo.list_portfolios()
    rows = sorted(listing["portfolios"], key=lambda p: p["organization"])
    print(f"{'EXEC':<24}{'ORG':<18}{'SRC':>4}{'SIG':>4}{'VALID':>6}{'INVAL':>6}{'CSO_RDY':>8}{'READY':>7}")
    print("-" * 77)
    for p in rows:
        s = p["stats"]
        print(
            f"{p['full_name']:<24}{p['organization']:<18}"
            f"{s['source_count']:>4}{s['signal_count']:>4}"
            f"{s['valid_signal_count']:>6}{s['invalid_signal_count']:>6}"
            f"{s['cso_ready_signal_count']:>8}{str(s['portfolio_ready_for_review']):>7}"
        )
    print(f"\nTotal portfolios: {listing['total']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
