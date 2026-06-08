"""Tests grouped vendor endpoints use company scope, not only a single vendor row."""

from fastapi.testclient import TestClient
import pytest


@pytest.fixture(autouse=True)
def _temp_db(tmp_path, monkeypatch):
    db_path = tmp_path / "test_sentry.db"
    monkeypatch.setattr("database.DB_PATH", db_path)
    from database import init_db

    init_db()
    yield db_path


@pytest.fixture()
def client():
    from main import app

    return TestClient(app)


def _seed_grouped_vendor_data():
    from database import get_connection

    conn = get_connection()
    conn.execute(
        "INSERT INTO vendors (id, company_name, category, technology_product, overall_rating, risk_level, last_assessed) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ("vendor-a", "Acme Systems", "Video Analytics & Computer Vision", "Alpha Vision", 4.4, "Medium", "2026-03-01"),
    )
    conn.execute(
        "INSERT INTO vendors (id, company_name, category, technology_product, overall_rating, risk_level, last_assessed) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ("vendor-b", "Acme Systems", "Video Analytics & Computer Vision", "Beta Sensor", 3.9, "High", "2026-03-15"),
    )
    conn.execute(
        "INSERT INTO var_reports (id, vendor_id, filename, report_date, overall_score, decision_band, compliance_score, risk_score, maturity_score, integration_score, roi_score, viability_score, differentiation_score, cloud_dep_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ("var-b-1", "vendor-b", "acme-var.docx", "2026-03-20", 4.1, "Advance", 4.2, 3.8, 4.0, 4.1, 3.9, 4.0, 3.7, 3.5),
    )
    conn.execute(
        "INSERT INTO vendor_highlights (id, vendor_id, source_file, assessment_date, product_name, pre_assessment_score, pre_assessment_decision, maturity_level, initial_assessment, technical_assessment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ("hl-b-1", "vendor-b", "202603_tracker.csv", "2026-03-18", "Beta Sensor", 4.0, "Pass", "Growth", "Pass", "Yes"),
    )
    conn.commit()
    conn.close()


def test_var_reports_endpoint_aggregates_company_rows(client):
    _seed_grouped_vendor_data()

    resp = client.get("/api/vendors/vendor-a/var-reports")
    assert resp.status_code == 200
    body = resp.json()

    assert body["total"] == 1
    assert body["reports"][0]["vendor_id"] == "vendor-b"
    assert body["reports"][0]["id"] == "var-b-1"


def test_highlights_endpoint_aggregates_company_rows(client):
    _seed_grouped_vendor_data()

    resp = client.get("/api/vendors/vendor-a/highlights")
    assert resp.status_code == 200
    body = resp.json()

    assert body["total"] == 1
    assert body["highlights"][0]["vendor_id"] == "vendor-b"
    assert body["highlights"][0]["product_name"] == "Beta Sensor"


def test_tech_pipeline_endpoint_aggregates_company_rows(client):
    _seed_grouped_vendor_data()

    resp = client.get("/api/vendors/vendor-a/tech-pipeline")
    assert resp.status_code == 200
    body = resp.json()

    assert body["vendor_id"] == "vendor-a"
    assert body["has_pipeline_data"] is True
    assert body["has_var"] is True
    assert body["has_var_scored"] is True
    assert body["summary"]["total_products"] == 1
    assert body["products"][0]["product_name"] == "Beta Sensor"
    assert body["products"][0]["has_var_scored"] is True
    assert body["products"][0]["pipeline_stage"] == 4


def _seed_unscored_var_data():
    from database import get_connection

    conn = get_connection()
    conn.execute(
        "INSERT INTO vendors (id, company_name, category, technology_product, overall_rating, risk_level, last_assessed) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ("vendor-c", "Delta Vision", "Video Analytics & Computer Vision", "Delta Sensor", 3.8, "Medium", "2026-04-01"),
    )
    conn.execute(
        "INSERT INTO vendors (id, company_name, category, technology_product, overall_rating, risk_level, last_assessed) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ("vendor-d", "Delta Vision", "Video Analytics & Computer Vision", "Delta Sensor v2", 3.6, "Medium", "2026-04-02"),
    )
    conn.execute(
        "INSERT INTO var_reports (id, vendor_id, filename, report_date, overall_score, decision_band, compliance_score, risk_score, maturity_score, integration_score, roi_score, viability_score, differentiation_score, cloud_dep_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ("var-d-1", "vendor-d", "delta-var.docx", "2026-04-04", None, "", None, None, None, None, None, None, None, None),
    )
    conn.execute(
        "INSERT INTO vendor_highlights (id, vendor_id, source_file, assessment_date, product_name, pre_assessment_score, pre_assessment_decision, maturity_level, initial_assessment, technical_assessment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ("hl-d-1", "vendor-d", "202604_tracker.csv", "2026-04-03", "Delta Sensor v2", 3.7, "Pass", "Growth", "Pass", "Yes"),
    )
    conn.commit()
    conn.close()


def test_tech_pipeline_marks_unscored_var_as_linked_not_complete(client):
    _seed_unscored_var_data()

    resp = client.get("/api/vendors/vendor-c/tech-pipeline")
    assert resp.status_code == 200
    body = resp.json()

    assert body["has_var"] is True
    assert body["has_var_scored"] is False
    assert body["summary"]["max_pipeline_stage"] == 3
    assert body["products"][0]["has_var_scored"] is False
    assert body["products"][0]["pipeline_stage"] == 3


def test_vendor_list_exposes_company_level_var_scores(client):
    _seed_grouped_vendor_data()

    resp = client.get("/api/vendors?search=Acme&page_size=10")
    assert resp.status_code == 200
    body = resp.json()

    assert body["total"] == 1
    vendor = body["vendors"][0]
    assert vendor["company_name"] == "Acme Systems"
    assert vendor["has_var"] is True
    assert vendor["latest_var_id"] == "var-b-1"
    assert vendor["var_weight_score"] == 4.1
    assert vendor["var_decision_band"] == "Advance"
    assert vendor["var_scores"]["Risk"] == 3.8
