"""Google SSO (OAuth 2.0 web-server / authorization-code flow) + Resend email verification.

Flow:
1. Frontend sends the user to GET /api/v1/auth/google/login (optionally ?role=&mode=).
2. Backend redirects the browser to Google's consent screen.
3. Google redirects back to GET /api/v1/auth/google/callback?code=...&state=...
4. Backend exchanges the code for tokens, fetches the user's profile,
   creates/updates the user (role chosen at signup), mints a JWT, and
   redirects the browser back to the frontend with the token.

No email-domain role inference: every user picks their own role at signup.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import secrets
import time
import uuid
from typing import Any
from urllib.parse import urlencode

import httpx

from backend.app.services.auth_handler import (
    SELF_SERVICE_ROLES,
    create_user,
    get_user_by_email,
    issue_token,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/auth/google/callback"
)
APP_URL = os.getenv("APP_URL", "http://localhost:3000")

GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo"

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM = os.getenv("RESEND_FROM", "AIHire <onboarding@resend.dev>")


def google_configured() -> bool:
    return bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)


# ---------------------------------------------------------------------------
# OAuth state (signed, stateless) — carries role + mode + CSRF nonce
# ---------------------------------------------------------------------------

from backend.app.services.auth_handler import SECRET_KEY  # noqa: E402
import hashlib  # noqa: E402


def build_state(role: str, mode: str) -> str:
    payload = {
        "role": role if role in SELF_SERVICE_ROLES else "candidate",
        "mode": mode if mode in ("signup", "login") else "login",
        "nonce": secrets.token_urlsafe(8),
        "ts": int(time.time()),
    }
    raw = json.dumps(payload, separators=(",", ":"))
    sig = hashlib.sha256((raw + SECRET_KEY).encode()).hexdigest()[:16]
    blob = base64.urlsafe_b64encode(f"{raw}.{sig}".encode()).decode()
    return blob


def parse_state(state: str) -> dict[str, Any]:
    try:
        decoded = base64.urlsafe_b64decode(state.encode()).decode()
        raw, sig = decoded.rsplit(".", 1)
        expected = hashlib.sha256((raw + SECRET_KEY).encode()).hexdigest()[:16]
        if not secrets.compare_digest(sig, expected):
            return {"role": "candidate", "mode": "login"}
        data = json.loads(raw)
        # Reject states older than 10 minutes.
        if int(time.time()) - int(data.get("ts", 0)) > 600:
            return {"role": "candidate", "mode": "login"}
        return data
    except Exception:
        return {"role": "candidate", "mode": "login"}


def build_google_auth_url(role: str = "candidate", mode: str = "login") -> str:
    """Build the Google OAuth consent-screen URL to redirect the browser to."""
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "select_account",
        "state": build_state(role, mode),
    }
    return f"{GOOGLE_AUTH_ENDPOINT}?{urlencode(params)}"


# ---------------------------------------------------------------------------
# Token exchange + profile fetch
# ---------------------------------------------------------------------------


async def _exchange_code(code: str) -> dict[str, Any] | None:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                GOOGLE_TOKEN_ENDPOINT,
                data={
                    "code": code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if resp.status_code != 200:
                logger.error("Google token exchange failed: %s — %s", resp.status_code, resp.text)
                return None
            return resp.json()
    except Exception as exc:
        logger.error("Google token exchange error: %s", exc)
        return None


async def _fetch_userinfo(access_token: str) -> dict[str, Any] | None:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                GOOGLE_USERINFO_ENDPOINT,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code != 200:
                logger.error("Google userinfo failed: %s — %s", resp.status_code, resp.text)
                return None
            return resp.json()
    except Exception as exc:
        logger.error("Google userinfo error: %s", exc)
        return None


async def google_oauth_callback(code: str, state: str) -> dict[str, Any] | None:
    """Complete the Google OAuth code flow.

    Returns a dict with: token, user_id, email, name, role, provider, email_verified, is_new.
    Returns None on failure.
    """
    if not google_configured():
        logger.error("Google OAuth is not configured (missing client id/secret)")
        return None

    tokens = await _exchange_code(code)
    if not tokens or "access_token" not in tokens:
        return None

    info = await _fetch_userinfo(tokens["access_token"])
    if not info or not info.get("email"):
        return None

    email = info["email"].lower().strip()
    name = (info.get("name") or email.split("@")[0]).strip()
    # Google asserts whether the email is verified on its side.
    google_verified = bool(info.get("email_verified", True))

    st = parse_state(state)
    chosen_role = st.get("role", "candidate")
    if chosen_role not in SELF_SERVICE_ROLES:
        chosen_role = "candidate"

    existing = get_user_by_email(email)
    is_new = existing is None

    if existing is None:
        # New Google user — role comes from the signup selection (state).
        random_password = secrets.token_urlsafe(24)
        user_data = create_user(
            email=email,
            password=random_password,
            name=name,
            role=chosen_role,
            email_verified=google_verified,
        )
    else:
        user_data = existing

    token = issue_token(user_data["user_id"], user_data["role"])
    return {
        **user_data,
        "token": token,
        "provider": "google",
        "is_new": is_new,
    }


# ---------------------------------------------------------------------------
# Resend verification email (code + link)
# ---------------------------------------------------------------------------


def _verification_html(name: str, code: str, link: str) -> str:
    return f"""
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="text-align: center; padding: 24px 0;">
        <h1 style="color: #003893; font-size: 24px; margin: 0;">AIHire</h1>
      </div>
      <div style="background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; padding: 32px;">
        <h2 style="color: #18181b; font-size: 18px; margin: 0 0 8px;">Welcome, {name}!</h2>
        <p style="color: #71717a; font-size: 14px; line-height: 1.6;">
          Confirm your email to finish setting up your AIHire account. Enter this verification code:
        </p>
        <div style="text-align:center; margin: 20px 0;">
          <span style="display:inline-block; font-size: 30px; letter-spacing: 8px; font-weight: 700;
                       color:#003893; background:#f4f6fb; border:1px solid #e4e4e7; border-radius:12px;
                       padding: 14px 24px;">{code}</span>
        </div>
        <p style="color: #71717a; font-size: 14px; line-height: 1.6; text-align:center;">
          …or just click the button below:
        </p>
        <div style="text-align: center; margin: 16px 0 8px;">
          <a href="{link}"
             style="display: inline-block; background: #003893; color: #ffffff;
                    padding: 12px 32px; border-radius: 100px; text-decoration: none;
                    font-size: 14px; font-weight: 600;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #a1a1aa; font-size: 12px; text-align:center;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    </div>
    """


async def send_verification_email(email: str, name: str, code: str, token: str) -> bool:
    """Send a real verification email (code + link) via Resend.

    Returns True if Resend accepted the message.
    """
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured — verification email not sent to %s", email)
        return False

    verify_link = f"{APP_URL}/verify?token={token}&email={email}"
    html = _verification_html(name, code, verify_link)

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": RESEND_FROM,
                    "to": [email],
                    "subject": "Verify your AIHire account",
                    "html": html,
                    "text": (
                        f"Welcome to AIHire, {name}!\n\n"
                        f"Your verification code is: {code}\n\n"
                        f"Or verify via this link: {verify_link}\n\n"
                        "If you didn't create an account, you can ignore this email."
                    ),
                },
            )
            if resp.status_code in (200, 201):
                logger.info("Verification email sent to %s", email)
                return True
            logger.error("Resend API error: %s — %s", resp.status_code, resp.text)
            return False
    except Exception as exc:
        logger.error("Failed to send verification email to %s: %s", email, exc)
        return False
