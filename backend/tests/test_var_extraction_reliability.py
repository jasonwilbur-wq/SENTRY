"""VAR extraction reliability tests.

Covers status classification, auth/token failure visibility,
batch reporting, and overwrite protection behavior.
"""
from __future__ import annotations

import os
import json
from typing import Any

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def _temp_db(tmp_path, monkeypatch):
    db_path = tmp_path / "test_sentry.db"
    monkeypatch.setattr("database.DB_PATH", db_path)
    from database import init_db
    init_db()
    yield db_path


@pytest.fixture()
def client_off():
    os.environ["SENTRY_AUTH_MODE"] = "off"
    import auth
    auth.AUTH_MODE = "off"
    from main import app
    return TestClient(app)


def _seed_vendor_var(var_id: str, item_id: str = "", scored: bool = False):
    from database import get_connection

    conn = get_connection()
    conn.execute(
        "INSERT OR IGNORE INTO vendors (id, company_name) VALUES (?, ?)",
        ("v-test", "Test Vendor"),
    )
    conn.execute(
        "INSERT INTO var_reports (id, vendor_id, filename, item_id, overall_score, decision_band) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (
            var_id,
            "v-test",
            f"{var_id}.docx",
            item_id,
            3.3 if scored else None,
            "Research Further" if scored else "",
        ),
    )
    conn.commit()
    conn.close()


class _FakeResp:
    def __init__(self, status_code: int, content: bytes = b""):
        self.status_code = status_code
        self.content = content


class _FakeClient:
    def __init__(self, status_code: int = 200, content: bytes = b"docx"):
        self._status_code = status_code
        self._content = content

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def get(self, *_args, **_kwargs):
        return _FakeResp(self._status_code, self._content)


def _read_var_review_state(var_id: str) -> dict[str, Any]:
    from database import get_connection

    conn = get_connection()
    row = conn.execute(
        "SELECT extraction_review_status, extraction_last_status, "
        "extraction_reviewed_by, extraction_reviewed_at, extraction_review_note "
        "FROM var_reports WHERE id = ?",
        (var_id,),
    ).fetchone()
    conn.close()
    return dict(row)


class TestVarExtractionReliability:
    def test_extract_success_path(self, client_off, monkeypatch):
        _seed_vendor_var("var-success", item_id="sp-item-1")

        import admin_routes
        monkeypatch.setattr(admin_routes, "get_token_diagnostics", lambda: {
            "available": True,
            "token": "fake-token",
            "reason_code": "OK",
            "reason": "ok",
        })
        monkeypatch.setattr(
            admin_routes.httpx,
            "AsyncClient",
            lambda **_kwargs: _FakeClient(status_code=200, content=b"docx"),
        )
        monkeypatch.setattr(admin_routes, "extract_scores", lambda _p: {
            "overall_score": 4.1,
            "decision_band": "Advance",
            "compliance_score": 4.5,
            "risk_score": 4.2,
        })

        resp = client_off.post("/api/admin/vars/var-success/extract-scores")
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["status"] == "SUCCESS"
        assert body["overall_score"] == 4.1
        assert body["requires_review"] is True
        assert body["confidence"] is not None

        review_state = _read_var_review_state("var-success")
        assert review_state["extraction_review_status"] == "EXTRACTED_PENDING_REVIEW"
        assert review_state["extraction_last_status"] == "SUCCESS"

    def test_extract_missing_item_id(self, client_off):
        _seed_vendor_var("var-no-item", item_id="")

        resp = client_off.post("/api/admin/vars/var-no-item/extract-scores")
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is False
        assert body["status"] == "MISSING_ITEM_ID"

    def test_extract_auth_unavailable(self, client_off, monkeypatch):
        _seed_vendor_var("var-auth", item_id="sp-item-2")

        import admin_routes
        monkeypatch.setattr(admin_routes, "get_token_diagnostics", lambda: {
            "available": False,
            "token": None,
            "reason_code": "CACHE_NOT_FOUND",
            "reason": "No MSAL cache",
        })

        resp = client_off.post("/api/admin/vars/var-auth/extract-scores")
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is False
        assert body["status"] == "AUTH_UNAVAILABLE"
        assert "CACHE_NOT_FOUND" in body["error"]

        review_state = _read_var_review_state("var-auth")
        assert review_state["extraction_last_status"] == "AUTH_UNAVAILABLE"

    def test_extract_parse_failure(self, client_off, monkeypatch):
        _seed_vendor_var("var-parse", item_id="sp-item-3")

        import admin_routes
        monkeypatch.setattr(admin_routes, "get_token_diagnostics", lambda: {
            "available": True,
            "token": "fake-token",
            "reason_code": "OK",
            "reason": "ok",
        })
        monkeypatch.setattr(
            admin_routes.httpx,
            "AsyncClient",
            lambda **_kwargs: _FakeClient(status_code=200, content=b"docx"),
        )
        monkeypatch.setattr(admin_routes, "extract_scores", lambda _p: {"_error": "bad doc"})

        resp = client_off.post("/api/admin/vars/var-parse/extract-scores")
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is False
        assert body["status"] == "PARSE_FAILED"

    def test_batch_reports_status_counts(self, client_off, monkeypatch):
        _seed_vendor_var("var-batch-no-item", item_id="")
        _seed_vendor_var("var-batch-auth", item_id="sp-item-auth")

        import admin_routes

        async def fake_download_and_extract(var_id: str) -> Any:
            if var_id == "var-batch-no-item":
                return admin_routes.ExtractResult(
                    var_id=var_id,
                    filename=f"{var_id}.docx",
                    success=False,
                    status="MISSING_ITEM_ID",
                    error="No SharePoint item_id",
                )
            return admin_routes.ExtractResult(
                var_id=var_id,
                filename=f"{var_id}.docx",
                success=False,
                status="AUTH_UNAVAILABLE",
                error="No token",
            )

        monkeypatch.setattr(admin_routes, "_download_and_extract", fake_download_and_extract)

        resp = client_off.post("/api/admin/vars/extract-batch?limit=10")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 2
        assert body["status_counts"]["MISSING_ITEM_ID"] == 1
        assert body["status_counts"]["AUTH_UNAVAILABLE"] == 1
        assert body["skipped"] == 2

    def test_review_queue_and_review_action_audited(self, client_off, monkeypatch):
        _seed_vendor_var("var-review", item_id="sp-item-review")

        import admin_routes
        monkeypatch.setattr(admin_routes, "get_token_diagnostics", lambda: {
            "available": True,
            "token": "fake-token",
            "reason_code": "OK",
            "reason": "ok",
        })
        monkeypatch.setattr(
            admin_routes.httpx,
            "AsyncClient",
            lambda **_kwargs: _FakeClient(status_code=200, content=b"docx"),
        )
        monkeypatch.setattr(admin_routes, "extract_scores", lambda _p: {
            "overall_score": 4.0,
            "decision_band": "Advance",
        })

        extract_resp = client_off.post("/api/admin/vars/var-review/extract-scores")
        assert extract_resp.status_code == 200

        queue_resp = client_off.get("/api/admin/vars/review-queue")
        assert queue_resp.status_code == 200
        items = queue_resp.json()["items"]
        assert any(i["id"] == "var-review" for i in items)

        review_resp = client_off.patch(
            "/api/admin/vars/var-review/review",
            json={"action": "ACCEPT", "note": "looks structurally correct"},
        )
        assert review_resp.status_code == 200
        reviewed = review_resp.json()
        assert reviewed["extraction_review_status"] == "REVIEWED_ACCEPTED"
        assert reviewed["extraction_reviewed_by"] == "anonymous"
        assert reviewed["extraction_review_note"] == "looks structurally correct"

        from database import get_connection
        conn = get_connection()
        audit_row = conn.execute(
            "SELECT action, new_value FROM audit_log WHERE entity_type='var_report' "
            "AND entity_id='var-review' ORDER BY id DESC LIMIT 1"
        ).fetchone()
        conn.close()

        assert audit_row["action"] == "review_extraction"
        payload = json.loads(audit_row["new_value"])
        assert payload["extraction_review_status"] == "REVIEWED_ACCEPTED"

    def test_batch_overwrite_protection_still_enforced(self, client_off):
        _seed_vendor_var("var-scored", item_id="sp-item-scored", scored=True)

        resp = client_off.post("/api/admin/vars/extract-batch?limit=10&overwrite=true")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1
        assert body["status_counts"]["WRITE_BLOCKED"] == 1
        assert body["results"][0]["status"] == "WRITE_BLOCKED"
        assert "DRY RUN" in body["results"][0]["error"]
