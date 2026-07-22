"""Tests for the authentication system."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_signup_creates_user(client: TestClient) -> None:
    resp = client.post(
        "/api/auth/signup",
        json={"email": "new@test.com", "password": "test1234", "name": "Test User", "role": "candidate"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "new@test.com"
    assert data["name"] == "Test User"
    assert data["role"] == "candidate"
    assert "token" in data
    assert "user_id" in data


def test_signup_rejects_duplicate_email(client: TestClient) -> None:
    client.post(
        "/api/auth/signup",
        json={"email": "dupe@test.com", "password": "test1234", "name": "First", "role": "candidate"},
    )
    resp = client.post(
        "/api/auth/signup",
        json={"email": "dupe@test.com", "password": "test1234", "name": "Second", "role": "candidate"},
    )
    assert resp.status_code == 409
    assert "already" in resp.json()["detail"].lower()


def test_signup_validates_role(client: TestClient) -> None:
    resp = client.post(
        "/api/auth/signup",
        json={"email": "badrole@test.com", "password": "test1234", "name": "Bad", "role": "superadmin"},
    )
    assert resp.status_code == 422  # Validation error


def test_login_success(client: TestClient) -> None:
    client.post(
        "/api/auth/signup",
        json={"email": "login@test.com", "password": "mypassword", "name": "Login User", "role": "recruiter"},
    )
    resp = client.post(
        "/api/auth/login",
        json={"email": "login@test.com", "password": "mypassword"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "login@test.com"
    assert data["role"] == "recruiter"
    assert "token" in data


def test_login_wrong_password(client: TestClient) -> None:
    client.post(
        "/api/auth/signup",
        json={"email": "wrongpw@test.com", "password": "correctpw", "name": "Wrong PW", "role": "candidate"},
    )
    resp = client.post(
        "/api/auth/login",
        json={"email": "wrongpw@test.com", "password": "wrongpw"},
    )
    assert resp.status_code == 401


def test_login_nonexistent_email(client: TestClient) -> None:
    resp = client.post(
        "/api/auth/login",
        json={"email": "nobody@test.com", "password": "anything"},
    )
    assert resp.status_code == 401


def test_me_endpoint_returns_user(client: TestClient) -> None:
    client.post(
        "/api/auth/signup",
        json={"email": "me@test.com", "password": "test1234", "name": "Me User", "role": "admin"},
    )
    login_resp = client.post("/api/auth/login", json={"email": "me@test.com", "password": "test1234"})
    token = login_resp.json()["token"]

    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "me@test.com"


def test_me_without_token(client: TestClient) -> None:
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_with_invalid_token(client: TestClient) -> None:
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer invalidtoken"})
    assert resp.status_code == 401


def test_update_profile(client: TestClient) -> None:
    client.post(
        "/api/auth/signup",
        json={"email": "update@test.com", "password": "test1234", "name": "Old Name", "role": "candidate"},
    )
    login_resp = client.post("/api/auth/login", json={"email": "update@test.com", "password": "test1234"})
    token = login_resp.json()["token"]

    resp = client.put(
        "/api/auth/profile",
        json={"name": "New Name"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


def test_logout_returns_success(client: TestClient) -> None:
    client.post(
        "/api/auth/signup",
        json={"email": "logout@test.com", "password": "test1234", "name": "Logout", "role": "candidate"},
    )
    login_resp = client.post("/api/auth/login", json={"email": "logout@test.com", "password": "test1234"})
    token = login_resp.json()["token"]

    resp = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
