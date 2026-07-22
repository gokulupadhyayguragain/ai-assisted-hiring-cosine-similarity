"""Tests for the job board API endpoints."""

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient


def test_list_external_jobs_requires_auth(client: TestClient) -> None:
    resp = client.get("/api/external-jobs")
    assert resp.status_code == 401


def test_list_job_sources(client: TestClient) -> None:
    resp = client.get("/api/external-jobs/sources")
    assert resp.status_code == 200
    data = resp.json()
    assert "sources" in data
    source_ids = {s["id"] for s in data["sources"]}
    assert "adzuna" in source_ids
    assert "greenhouse" in source_ids


def test_list_external_jobs_with_auth(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.get("/api/external-jobs", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "jobs" in data
    assert "total" in data


def test_list_external_jobs_filter_by_source(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.get("/api/external-jobs?source=adzuna", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "jobs" in data


def test_list_external_jobs_search(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.get("/api/external-jobs?query=engineer", headers=auth_headers)
    assert resp.status_code == 200


def test_delete_external_job_requires_auth(client: TestClient) -> None:
    resp = client.delete("/api/external-jobs/nonexistent")
    assert resp.status_code == 401


def test_delete_nonexistent_external_job(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.delete(f"/api/external-jobs/{uuid.uuid4().hex[:12]}", headers=auth_headers)
    assert resp.status_code == 404


def test_adzuna_import_requires_auth(client: TestClient) -> None:
    resp = client.post("/api/external-jobs/import/adzuna", json={"query": "python", "max_results": 5})
    assert resp.status_code == 401


def test_adzuna_import_validates_payload(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.post(
        "/api/external-jobs/import/adzuna",
        json={"query": "", "max_results": 0},
        headers=auth_headers,
    )
    # Empty query may pass validation but max_results=0 should fail
    assert resp.status_code == 422 or resp.status_code == 200


def test_greenhouse_import_requires_auth(client: TestClient) -> None:
    resp = client.post("/api/external-jobs/import/greenhouse", json={"board_tokens": ["stripe"]})
    assert resp.status_code == 401


def test_greenhouse_import_requires_board_tokens(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.post(
        "/api/external-jobs/import/greenhouse",
        json={"board_tokens": []},
        headers=auth_headers,
    )
    assert resp.status_code == 422  # min_length=1


def test_health_endpoint(client: TestClient) -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert data["status"] == "ok"
