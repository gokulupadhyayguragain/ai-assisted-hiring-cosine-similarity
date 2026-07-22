"""Pytest fixtures for backend tests."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Set test environment variables before importing the app
import os

os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("ENABLE_SBERT", "0")

from backend.app.main import app  # noqa: E402
from backend.app.services.auth_handler import create_user, _create_token  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    """Provide a FastAPI TestClient for endpoint testing."""
    return TestClient(app)


@pytest.fixture
def demo_user_token() -> str:
    """Create a demo user and return an auth token."""
    try:
        user = create_user(
            email="testuser@test.com",
            password="test1234",
            name="Test User",
            role="recruiter",
        )
    except ValueError:
        # Already exists
        from backend.app.services.auth_handler import get_user_by_id
        user = get_user_by_id("testuser")
        if user is None:
            # Find the user
            from backend.app.services.auth_handler import USERS_DIR
            import json
            for p in USERS_DIR.glob("*.json"):
                data = json.loads(p.read_text())
                if data.get("email") == "testuser@test.com":
                    user = data
                    break

    token = _create_token(user["user_id"], user["role"])
    return token


@pytest.fixture
def auth_headers(demo_user_token: str) -> dict[str, str]:
    """Provide Authorization headers for authenticated requests."""
    return {"Authorization": f"Bearer {demo_user_token}"}
