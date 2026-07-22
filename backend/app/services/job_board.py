"""Unified job board schema and storage for imported jobs.

Normalizes job listings from multiple sources (Adzuna, Jooble, Greenhouse, Lever)
into a single schema for AI matching and frontend display.
"""
from __future__ import annotations

import json
import logging
import os
import uuid
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "")

# ---------------------------------------------------------------------------
# Unified job listing schema
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class ExternalJob:
    job_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    source: str = ""  # "adzuna", "jooble", "greenhouse", "lever"
    source_id: str = ""  # original ID from the source
    title: str = ""
    company: str = ""
    location: str = ""
    description: str = ""
    url: str = ""
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str = "USD"
    salary_period: str = "yearly"  # yearly, monthly, hourly
    required_skills: list[str] = field(default_factory=list)
    department: str = ""
    experience: str = ""
    employment_type: str = ""  # full-time, part-time, contract
    posted_at: str = ""
    expires_at: str = ""
    remote: bool = False
    imported_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    raw_data: dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Job store (file-based + PostgreSQL)
# ---------------------------------------------------------------------------


class JobBoardStore:
    def __init__(self, root: Path) -> None:
        self.root = root / "external_jobs"
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, job: ExternalJob) -> None:
        target = self.root / f"{job.job_id}.json"
        target.write_text(json.dumps(asdict(job), indent=2), encoding="utf-8")
        self._save_postgres(job)

    def load(self, job_id: str) -> dict | None:
        persisted = self._load_postgres(job_id)
        if persisted is not None:
            return persisted
        target = self.root / f"{job_id}.json"
        if not target.exists():
            return None
        return json.loads(target.read_text(encoding="utf-8"))

    def list_jobs(
        self,
        limit: int = 50,
        source: str | None = None,
        skills: list[str] | None = None,
        query: str = "",
    ) -> list[dict]:
        persisted = self._list_postgres(limit=limit, source=source)
        if persisted:
            return self._filter_jobs(persisted, skills, query)

        jobs: list[dict] = []
        for path in sorted(self.root.glob("*.json"), reverse=True):
            try:
                job = json.loads(path.read_text(encoding="utf-8"))
                if source and job.get("source") != source:
                    continue
                jobs.append(job)
            except Exception:
                continue
        return self._filter_jobs(jobs[:limit], skills, query)

    def delete(self, job_id: str) -> None:
        target = self.root / f"{job_id}.json"
        try:
            if target.exists():
                target.unlink()
        except Exception:
            pass
        self._delete_postgres(job_id)

    def _filter_jobs(
        self, jobs: list[dict], skills: list[str] | None, query: str
    ) -> list[dict]:
        if not skills and not query:
            return jobs
        filtered = []
        for job in jobs:
            if query and query.lower() not in job.get("title", "").lower():
                continue
            if skills:
                job_skills = set(s.lower() for s in job.get("required_skills", []))
                if not job_skills.intersection(s.lower() for s in skills):
                    continue
            filtered.append(job)
        return filtered

    # ---- PostgreSQL persistence (optional) ----
    def _save_postgres(self, job: ExternalJob) -> None:
        if not DATABASE_URL:
            return
        try:
            import psycopg

            with psycopg.connect(DATABASE_URL, connect_timeout=2) as conn:
                self._ensure_schema(conn)
                with conn.cursor() as cur:
                    data = asdict(job)
                    cur.execute(
                        """INSERT INTO external_jobs (
                            job_id, source, source_id, title, company, location,
                            description, url, salary_min, salary_max, salary_currency,
                            salary_period, required_skills, department, experience,
                            employment_type, posted_at, expires_at, remote, imported_at, raw_data
                        ) VALUES (
                            %(job_id)s, %(source)s, %(source_id)s, %(title)s, %(company)s,
                            %(location)s, %(description)s, %(url)s, %(salary_min)s,
                            %(salary_max)s, %(salary_currency)s, %(salary_period)s,
                            %(required_skills)s::jsonb, %(department)s, %(experience)s,
                            %(employment_type)s, %(posted_at)s, %(expires_at)s,
                            %(remote)s, %(imported_at)s, %(raw_data)s::jsonb
                        ) ON CONFLICT (source, source_id) DO UPDATE SET
                            title = EXCLUDED.title, updated_at = NOW()
                        """,
                        data,
                    )
        except Exception as exc:
            logger.warning("Postgres save failed: %s", exc)

    def _load_postgres(self, job_id: str) -> dict | None:
        if not DATABASE_URL:
            return None
        try:
            import psycopg

            with psycopg.connect(DATABASE_URL, connect_timeout=2) as conn:
                self._ensure_schema(conn)
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT data FROM external_jobs WHERE job_id = %s", (job_id,)
                    )
                    row = cur.fetchone()
                    return row[0] if row else None
        except Exception:
            return None

    def _list_postgres(self, limit: int = 50, source: str | None = None) -> list[dict]:
        if not DATABASE_URL:
            return []
        try:
            import psycopg

            with psycopg.connect(DATABASE_URL, connect_timeout=2) as conn:
                self._ensure_schema(conn)
                with conn.cursor() as cur:
                    if source:
                        cur.execute(
                            "SELECT data FROM external_jobs WHERE source = %s ORDER BY imported_at DESC LIMIT %s",
                            (source, limit),
                        )
                    else:
                        cur.execute(
                            "SELECT data FROM external_jobs ORDER BY imported_at DESC LIMIT %s",
                            (limit,),
                        )
                    return [row[0] for row in cur.fetchall()]
        except Exception:
            return []

    def _delete_postgres(self, job_id: str) -> None:
        if not DATABASE_URL:
            return
        try:
            import psycopg

            with psycopg.connect(DATABASE_URL, connect_timeout=2) as conn:
                self._ensure_schema(conn)
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM external_jobs WHERE job_id = %s", (job_id,))
        except Exception:
            pass

    def _ensure_schema(self, conn) -> None:
        with conn.cursor() as cur:
            cur.execute(
                """CREATE TABLE IF NOT EXISTS external_jobs (
                    job_id TEXT PRIMARY KEY,
                    source TEXT NOT NULL,
                    source_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    company TEXT,
                    location TEXT,
                    description TEXT,
                    url TEXT,
                    salary_min REAL,
                    salary_max REAL,
                    salary_currency TEXT DEFAULT 'USD',
                    salary_period TEXT DEFAULT 'yearly',
                    required_skills JSONB DEFAULT '[]',
                    department TEXT,
                    experience TEXT,
                    employment_type TEXT,
                    posted_at TEXT,
                    expires_at TEXT,
                    remote BOOLEAN DEFAULT FALSE,
                    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    raw_data JSONB DEFAULT '{}',
                    UNIQUE(source, source_id)
                )"""
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_external_jobs_source ON external_jobs(source)"
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_external_jobs_title ON external_jobs(title)"
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_external_jobs_imported_at ON external_jobs(imported_at DESC)"
            )
