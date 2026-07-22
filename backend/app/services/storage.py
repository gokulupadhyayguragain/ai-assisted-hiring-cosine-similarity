from __future__ import annotations

import json
import os
import re
import uuid
from datetime import UTC, datetime
from pathlib import Path

from backend.app.models import AnalysisSession, to_plain


class SessionStore:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)
        self.jobs_root = self.root / "jobs"
        self.jobs_root.mkdir(parents=True, exist_ok=True)
        self.database_url = os.getenv("DATABASE_URL", "")
        self.redis_url = os.getenv("REDIS_URL", "")

    # ------------------------------------------------------------------
    # Candidate resume library/history (user-scoped JSON persistence)
    # ------------------------------------------------------------------

    def _resume_user_root(self, user_id: str) -> Path:
        safe_user = re.sub(r"[^a-zA-Z0-9_-]", "_", str(user_id))[:120] or "anonymous"
        root = self.root / "resumes" / safe_user
        root.mkdir(parents=True, exist_ok=True)
        return root

    def save_resume(self, user_id: str, filename: str, text: str, file_type: str) -> dict:
        resume_id = uuid.uuid4().hex[:12]
        now = datetime.now(UTC).isoformat()
        record = {
            "resume_id": resume_id,
            "user_id": str(user_id),
            "filename": filename or "resume",
            "file_type": file_type or "txt",
            "created_at": now,
            "updated_at": now,
            "text": text,
            "analyses": [],
        }
        (self._resume_user_root(user_id) / f"{resume_id}.json").write_text(
            json.dumps(record, indent=2), encoding="utf-8"
        )
        return record

    def list_resumes(self, user_id: str, limit: int = 50) -> list[dict]:
        records: list[dict] = []
        for path in sorted(self._resume_user_root(user_id).glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
            try:
                record = json.loads(path.read_text(encoding="utf-8"))
                record.pop("text", None)
                records.append(record)
            except (OSError, json.JSONDecodeError):
                continue
        return records[:max(1, min(limit, 100))]

    def load_resume(self, user_id: str, resume_id: str) -> dict | None:
        if not re.fullmatch(r"[a-fA-F0-9]{12}", resume_id):
            return None
        path = self._resume_user_root(user_id) / f"{resume_id}.json"
        if not path.exists():
            return None
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None
        return record if record.get("user_id") == str(user_id) else None

    def delete_resume(self, user_id: str, resume_id: str) -> bool:
        path = self._resume_user_root(user_id) / f"{resume_id}.json"
        if not path.exists():
            return False
        path.unlink()
        return True

    def save_resume_analysis(self, user_id: str, resume_id: str, analysis: dict) -> dict | None:
        record = self.load_resume(user_id, resume_id)
        if record is None:
            return None
        record.setdefault("analyses", []).insert(0, analysis)
        record["updated_at"] = datetime.now(UTC).isoformat()
        path = self._resume_user_root(user_id) / f"{resume_id}.json"
        path.write_text(json.dumps(record, indent=2), encoding="utf-8")
        record.pop("text", None)
        return record

    def save(self, session: AnalysisSession) -> None:
        plain = to_plain(session)
        target = self.root / f"{session.session_id}.json"
        target.write_text(json.dumps(plain, indent=2), encoding="utf-8")
        self._save_postgres(plain)
        self._save_redis(plain)

    def load(self, session_id: str) -> dict | None:
        cached = self._load_redis(session_id)
        if cached is not None:
            return cached

        persisted = self._load_postgres(session_id)
        if persisted is not None:
            self._save_redis(persisted)
            return persisted

        target = self.root / f"{session_id}.json"
        if not target.exists():
            return None
        return json.loads(target.read_text(encoding="utf-8"))

    def list_sessions(self, limit: int = 20) -> list[dict]:
        """List recent screening sessions."""
        persisted = self._list_sessions_postgres(limit=limit)
        if persisted:
            return persisted

        sessions: list[dict] = []
        for path in sorted(self.root.glob("*.json"), reverse=True):
            try:
                sessions.append(json.loads(path.read_text(encoding="utf-8")))
            except Exception:
                continue
        return sessions[:limit]

    def _list_sessions_postgres(self, limit: int = 20) -> list[dict]:
        if not self.database_url:
            return []
        try:
            import psycopg
        except Exception:
            return []

        try:
            with psycopg.connect(self.database_url, connect_timeout=2) as connection:
                self._ensure_postgres_schema(connection)
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT id, created_at, role, job_skills, bias_audit, candidates, engine, processing_ms
                        FROM screening_sessions
                        ORDER BY created_at DESC
                        LIMIT %s
                        """,
                        (limit,),
                    )
                    rows = cursor.fetchall()
        except Exception:
            return []

        sessions: list[dict] = []
        for row in rows:
            sessions.append(
                {
                    "session_id": row[0],
                    "created_at": row[1].isoformat() if hasattr(row[1], "isoformat") else str(row[1]),
                    "role": row[2],
                    "job_skills": row[3],
                    "bias_audit": row[4],
                    "candidates": row[5],
                    "engine": row[6],
                    "processing_ms": row[7],
                }
            )
        return sessions

    def save_job(self, job: dict) -> None:
        target = self.jobs_root / f"{job['job_id']}.json"
        target.write_text(json.dumps(job, indent=2), encoding="utf-8")
        self._save_job_postgres(job)

    def load_job(self, job_id: str) -> dict | None:
        persisted = self._load_job_postgres(job_id)
        if persisted is not None:
            return persisted

        target = self.jobs_root / f"{job_id}.json"
        if not target.exists():
            return None
        return json.loads(target.read_text(encoding="utf-8"))

    def list_jobs(self, limit: int = 50) -> list[dict]:
        persisted = self._list_jobs_postgres(limit=limit)
        if persisted:
            return persisted

        jobs: list[dict] = []
        for path in sorted(self.jobs_root.glob("*.json"), reverse=True):
            try:
                jobs.append(json.loads(path.read_text(encoding="utf-8")))
            except Exception:
                continue
        return jobs[:limit]

    def _save_postgres(self, session: dict) -> None:
        if not self.database_url:
            return
        try:
            import psycopg
        except Exception:
            return
        try:
            with psycopg.connect(self.database_url, connect_timeout=2) as connection:
                self._ensure_postgres_schema(connection)
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO screening_sessions (
                            id, created_at, role, job_skills, bias_audit, candidates, engine, processing_ms
                        )
                        VALUES (%s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            role = EXCLUDED.role,
                            job_skills = EXCLUDED.job_skills,
                            bias_audit = EXCLUDED.bias_audit,
                            candidates = EXCLUDED.candidates,
                            engine = EXCLUDED.engine,
                            processing_ms = EXCLUDED.processing_ms
                        """,
                        (
                            session["session_id"],
                            session["created_at"],
                            session["role"],
                            json.dumps(session["job_skills"]),
                            json.dumps(session["bias_audit"]),
                            json.dumps(session["candidates"]),
                            json.dumps(session["engine"]),
                            session["processing_ms"],
                        ),
                    )
        except Exception:
            return

    def _load_postgres(self, session_id: str) -> dict | None:
        if not self.database_url:
            return None
        try:
            import psycopg
        except Exception:
            return None
        try:
            with psycopg.connect(self.database_url, connect_timeout=2) as connection:
                self._ensure_postgres_schema(connection)
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT id, created_at, role, job_skills, bias_audit, candidates, engine, processing_ms
                        FROM screening_sessions
                        WHERE id = %s
                        """,
                        (session_id,),
                    )
                    row = cursor.fetchone()
        except Exception:
            return None
        if row is None:
            return None
        return {
            "session_id": row[0],
            "created_at": row[1].isoformat() if hasattr(row[1], "isoformat") else str(row[1]),
            "role": row[2],
            "job_skills": row[3],
            "bias_audit": row[4],
            "candidates": row[5],
            "engine": row[6],
            "processing_ms": row[7],
        }

    def _save_job_postgres(self, job: dict) -> None:
        if not self.database_url:
            return
        try:
            import psycopg
        except Exception:
            return

        try:
            with psycopg.connect(self.database_url, connect_timeout=2) as connection:
                self._ensure_postgres_schema(connection)
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO job_postings (
                            id, created_at, updated_at, title, department, experience, location, salary,
                            required_skills, description, created_by
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            updated_at = EXCLUDED.updated_at,
                            title = EXCLUDED.title,
                            department = EXCLUDED.department,
                            experience = EXCLUDED.experience,
                            location = EXCLUDED.location,
                            salary = EXCLUDED.salary,
                            required_skills = EXCLUDED.required_skills,
                            description = EXCLUDED.description,
                            created_by = EXCLUDED.created_by
                        """,
                        (
                            job["job_id"],
                            job["created_at"],
                            job["updated_at"],
                            job["title"],
                            job["department"],
                            job["experience"],
                            job["location"],
                            job["salary"],
                            json.dumps(job["required_skills"]),
                            job["description"],
                            job["created_by"],
                        ),
                    )
        except Exception:
            return

    def _load_job_postgres(self, job_id: str) -> dict | None:
        if not self.database_url:
            return None
        try:
            import psycopg
        except Exception:
            return None

        try:
            with psycopg.connect(self.database_url, connect_timeout=2) as connection:
                self._ensure_postgres_schema(connection)
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT id, created_at, updated_at, title, department, experience, location, salary,
                               required_skills, description, created_by
                        FROM job_postings
                        WHERE id = %s
                        """,
                        (job_id,),
                    )
                    row = cursor.fetchone()
        except Exception:
            return None

        if row is None:
            return None

        return {
            "job_id": row[0],
            "created_at": row[1].isoformat() if hasattr(row[1], "isoformat") else str(row[1]),
            "updated_at": row[2].isoformat() if hasattr(row[2], "isoformat") else str(row[2]),
            "title": row[3],
            "department": row[4],
            "experience": row[5],
            "location": row[6],
            "salary": row[7],
            "required_skills": row[8],
            "description": row[9],
            "created_by": row[10],
        }

    def _list_jobs_postgres(self, limit: int = 50) -> list[dict]:
        if not self.database_url:
            return []
        try:
            import psycopg
        except Exception:
            return []

        try:
            with psycopg.connect(self.database_url, connect_timeout=2) as connection:
                self._ensure_postgres_schema(connection)
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT id, created_at, updated_at, title, department, experience, location, salary,
                               required_skills, description, created_by
                        FROM job_postings
                        ORDER BY created_at DESC
                        LIMIT %s
                        """,
                        (limit,),
                    )
                    rows = cursor.fetchall()
        except Exception:
            return []

        jobs: list[dict] = []
        for row in rows:
            jobs.append(
                {
                    "job_id": row[0],
                    "created_at": row[1].isoformat() if hasattr(row[1], "isoformat") else str(row[1]),
                    "updated_at": row[2].isoformat() if hasattr(row[2], "isoformat") else str(row[2]),
                    "title": row[3],
                    "department": row[4],
                    "experience": row[5],
                    "location": row[6],
                    "salary": row[7],
                    "required_skills": row[8],
                    "description": row[9],
                    "created_by": row[10],
                }
            )
        return jobs

    def delete_job(self, job_id: str) -> None:
        # remove file
        target = self.jobs_root / f"{job_id}.json"
        try:
            if target.exists():
                target.unlink()
        except Exception:
            pass
        # remove from postgres
        self._delete_job_postgres(job_id)

    def _delete_job_postgres(self, job_id: str) -> None:
        if not self.database_url:
            return
        try:
            import psycopg
        except Exception:
            return

        try:
            with psycopg.connect(self.database_url, connect_timeout=2) as connection:
                self._ensure_postgres_schema(connection)
                with connection.cursor() as cursor:
                    cursor.execute("DELETE FROM job_postings WHERE id = %s", (job_id,))
        except Exception:
            return

    def _ensure_postgres_schema(self, connection: object) -> None:
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS screening_sessions (
                        id TEXT PRIMARY KEY,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        role TEXT NOT NULL,
                        job_skills JSONB NOT NULL,
                        bias_audit JSONB NOT NULL,
                        candidates JSONB NOT NULL,
                        engine JSONB NOT NULL,
                        processing_ms INTEGER NOT NULL
                    )
                    """
                )
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS job_postings (
                        id TEXT PRIMARY KEY,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        title TEXT NOT NULL,
                        department TEXT NOT NULL,
                        experience TEXT NOT NULL,
                        location TEXT NOT NULL,
                        salary TEXT NOT NULL,
                        required_skills JSONB NOT NULL,
                        description TEXT NOT NULL,
                        created_by TEXT NOT NULL DEFAULT 'recruiter'
                    )
                    """
                )
        except Exception:
            return

    def _save_redis(self, session: dict) -> None:
        if not self.redis_url:
            return
        try:
            import redis

            client = redis.Redis.from_url(self.redis_url, socket_connect_timeout=1, socket_timeout=1)
            client.setex(f"screening:{session['session_id']}", 60 * 60 * 24, json.dumps(session))
        except Exception:
            return

    def _load_redis(self, session_id: str) -> dict | None:
        if not self.redis_url:
            return None
        try:
            import redis

            client = redis.Redis.from_url(self.redis_url, socket_connect_timeout=1, socket_timeout=1)
            raw = client.get(f"screening:{session_id}")
            if raw is None:
                return None
            return json.loads(raw)
        except Exception:
            return None
