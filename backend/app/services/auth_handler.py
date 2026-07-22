"""Authentication service: user model, JWT tokens, password hashing, email verification.

Users are persisted as JSON files under runtime/users/. Each record carries an
`email_verified` flag plus a transient verification code + token used by the
email-verification flow (sent via Resend).
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("JWT_SECRET", "aihire-dev-secret-change-in-production")
TOKEN_EXPIRY_HOURS = 24
USERS_DIR = Path(__file__).resolve().parents[2] / "runtime" / "users"

# Roles a user may self-assign at signup. "admin" is intentionally excluded.
SELF_SERVICE_ROLES = {"recruiter", "candidate"}


@dataclass(slots=True)
class User:
    user_id: str
    email: str
    password_hash: str
    name: str
    role: str  # "admin", "recruiter", "candidate"
    email_verified: bool
    created_at: str
    updated_at: str


def _hash_password(password: str) -> str:
    """Hash a password with SHA-256 + salt."""
    salt = uuid.uuid4().hex[:16]
    return f"{salt}:{hashlib.sha256((salt + password).encode()).hexdigest()}"


def _verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    try:
        salt, h = password_hash.split(":", 1)
        return h == hashlib.sha256((salt + password).encode()).hexdigest()
    except (ValueError, AttributeError):
        return False


def _create_token(user_id: str, role: str) -> str:
    """Create a simple signed JWT-like token."""
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": (datetime.now(UTC) + timedelta(hours=TOKEN_EXPIRY_HOURS)).isoformat(),
        "iat": datetime.now(UTC).isoformat(),
    }
    encoded = json.dumps(payload, sort_keys=True)
    signature = hashlib.sha256((encoded + SECRET_KEY).encode()).hexdigest()[:16]
    return f"{encoded}.{signature}"


def _decode_token(token: str) -> dict[str, Any] | None:
    """Decode and verify a token. Returns payload dict or None."""
    try:
        if "." not in token:
            return None
        encoded, signature = token.rsplit(".", 1)
        expected = hashlib.sha256((encoded + SECRET_KEY).encode()).hexdigest()[:16]
        if signature != expected:
            return None
        payload = json.loads(encoded)
        exp = datetime.fromisoformat(payload["exp"])
        if exp < datetime.now(UTC):
            return None
        return payload
    except (ValueError, KeyError, json.JSONDecodeError):
        return None


def _ensure_dir() -> Path:
    USERS_DIR.mkdir(parents=True, exist_ok=True)
    return USERS_DIR


def _user_path(user_id: str) -> Path:
    return _ensure_dir() / f"{user_id}.json"


def _public(data: dict[str, Any]) -> dict[str, Any]:
    """Strip secret fields before returning a user record to callers."""
    hidden = {"password_hash", "verification_code", "verification_token"}
    return {k: v for k, v in data.items() if k not in hidden}


def _read_all() -> list[dict[str, Any]]:
    _ensure_dir()
    users: list[dict[str, Any]] = []
    for p in USERS_DIR.glob("*.json"):
        try:
            users.append(json.loads(p.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, OSError):
            continue
    return users


def _find_raw_by_email(email: str) -> dict[str, Any] | None:
    email = email.lower().strip()
    for data in _read_all():
        if data.get("email", "").lower() == email:
            return data
    return None


def get_user_by_email(email: str) -> dict[str, Any] | None:
    """Public lookup by email (without secrets). Returns None if not found."""
    data = _find_raw_by_email(email)
    return _public(data) if data else None


def create_user(
    email: str,
    password: str,
    name: str,
    role: str = "candidate",
    email_verified: bool = False,
) -> dict[str, Any]:
    """Create a new user. Returns the public user record. Raises ValueError on duplicate email."""
    _ensure_dir()
    if _find_raw_by_email(email) is not None:
        raise ValueError("Email already registered")

    now = datetime.now(UTC).isoformat()
    user = {
        "user_id": uuid.uuid4().hex[:12],
        "email": email.lower().strip(),
        "password_hash": _hash_password(password),
        "name": name.strip() or email.split("@")[0],
        "role": role if role in SELF_SERVICE_ROLES or role == "admin" else "candidate",
        "email_verified": bool(email_verified),
        "verification_code": None,
        "verification_token": None,
        "created_at": now,
        "updated_at": now,
    }
    path = _user_path(user["user_id"])
    try:
        path.write_text(json.dumps(user, indent=2), encoding="utf-8")
    except Exception as exc:
        raise RuntimeError(f"Failed to save user: {exc}") from exc

    return _public(user)


def authenticate(email: str, password: str) -> dict[str, Any] | None:
    """Authenticate a user. Returns public user data + token, or None on failure."""
    data = _find_raw_by_email(email)
    if data is None:
        return None
    if not _verify_password(password, data.get("password_hash", "")):
        return None
    token = _create_token(data["user_id"], data["role"])
    user_data = _public(data)
    user_data["token"] = token
    return user_data


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    """Look up a user by ID. Returns public user data, or None."""
    path = _user_path(user_id)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return _public(data)
    except (json.JSONDecodeError, OSError):
        return None


def get_user_from_token(token: str) -> dict[str, Any] | None:
    """Validate a token and return the user. Returns None if invalid."""
    payload = _decode_token(token)
    if payload is None:
        return None
    return get_user_by_id(payload["user_id"])


def issue_token(user_id: str, role: str) -> str:
    """Public helper to mint a JWT for an existing user (used by SSO)."""
    return _create_token(user_id, role)


def update_user(user_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    """Update user fields. Returns updated public user data or None if not found."""
    path = _user_path(user_id)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None

    for key in ("name", "role", "email"):
        if key in updates and updates[key]:
            data[key] = updates[key]

    if "email_verified" in updates:
        data["email_verified"] = bool(updates["email_verified"])

    if "password" in updates and updates["password"]:
        data["password_hash"] = _hash_password(updates["password"])

    data["updated_at"] = datetime.now(UTC).isoformat()
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return _public(data)


# ---------------------------------------------------------------------------
# Email verification (code + token)
# ---------------------------------------------------------------------------


def generate_verification(email: str) -> tuple[str, str] | None:
    """Generate and persist a verification code (6 digits) + token for a user.

    Returns (code, token) or None if the user does not exist.
    """
    data = _find_raw_by_email(email)
    if data is None:
        return None
    code = f"{secrets.randbelow(1_000_000):06d}"
    token = secrets.token_urlsafe(32)
    data["verification_code"] = code
    data["verification_token"] = token
    data["verification_sent_at"] = datetime.now(UTC).isoformat()
    data["email_verified"] = False
    data["updated_at"] = datetime.now(UTC).isoformat()
    _user_path(data["user_id"]).write_text(json.dumps(data, indent=2), encoding="utf-8")
    return code, token


def verify_email(email: str, *, token: str | None = None, code: str | None = None) -> dict[str, Any] | None:
    """Verify a user's email using either the link token or the 6-digit code.

    Returns the public user record on success, or None on failure.
    """
    data = _find_raw_by_email(email)
    if data is None:
        return None

    # Already verified — treat as success (idempotent).
    if data.get("email_verified"):
        return _public(data)

    stored_token = data.get("verification_token")
    stored_code = data.get("verification_code")

    ok = False
    if token and stored_token and secrets.compare_digest(str(token), str(stored_token)):
        ok = True
    elif code and stored_code and secrets.compare_digest(str(code).strip(), str(stored_code)):
        ok = True

    if not ok:
        return None

    data["email_verified"] = True
    data["verification_code"] = None
    data["verification_token"] = None
    data["updated_at"] = datetime.now(UTC).isoformat()
    _user_path(data["user_id"]).write_text(json.dumps(data, indent=2), encoding="utf-8")
    return _public(data)
