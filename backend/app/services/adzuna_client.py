"""Adzuna API client for importing job listings.

Adzuna provides a free tier with 5000 API calls/month for developers.
Sign up: https://developer.adzuna.com/
"""
from __future__ import annotations

import logging
import os
from datetime import UTC, datetime
from typing import Any

import httpx

from backend.app.services.job_board import ExternalJob

logger = logging.getLogger(__name__)

ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID", "")
ADZUNA_API_KEY = os.getenv("ADZUNA_API_KEY", "")
ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs"


def is_configured() -> bool:
    return bool(ADZUNA_APP_ID and ADZUNA_API_KEY)


async def search_jobs(
    query: str = "",
    location: str = "",
    country: str = "us",
    results_per_page: int = 50,
    page: int = 1,
    max_days_old: int = 30,
) -> list[ExternalJob]:
    """Search jobs via Adzuna API and return normalized ExternalJob objects."""
    if not is_configured():
        logger.warning("Adzuna not configured — set ADZUNA_APP_ID and ADZUNA_API_KEY")
        return []

    params: dict[str, Any] = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_API_KEY,
        "results_per_page": min(results_per_page, 50),
        "page": page,
        "content-type": "application/json",
        "max_days_old": max_days_old,
    }
    if query:
        params["what"] = query
    if location:
        params["where"] = location

    url = f"{ADZUNA_BASE}/{country}/search/{page}"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        logger.error("Adzuna API error: %s", exc)
        return []

    results = data.get("results", [])
    jobs: list[ExternalJob] = []
    for item in results:
        salary_min = item.get("salary_min")
        salary_max = item.get("salary_max")
        company_data = item.get("company", {}) or {}

        skills = []
        desc = item.get("description", "") or ""
        # Extract skills from description keywords (Adzuna doesn't return structured skills)
        skill_keywords = [
            "Python", "Java", "JavaScript", "TypeScript", "React", "Node.js",
            "Docker", "Kubernetes", "AWS", "SQL", "PostgreSQL", "MongoDB",
            "Machine Learning", "NLP", "Git", "Linux", "CI/CD", "Agile",
        ]
        for skill in skill_keywords:
            if skill.lower() in desc.lower():
                skills.append(skill)

        job = ExternalJob(
            source="adzuna",
            source_id=str(item.get("id", "")),
            title=item.get("title", "") or "",
            company=company_data.get("display_name") if isinstance(company_data, dict) else str(company_data),
            location=item.get("location", {}).get("display_name") if isinstance(item.get("location"), dict) else str(item.get("location", "")),
            description=desc,
            url=item.get("redirect_url", "") or "",
            salary_min=float(salary_min) if salary_min else None,
            salary_max=float(salary_max) if salary_max else None,
            salary_currency="USD",
            salary_period="yearly",
            required_skills=skills,
            employment_type="full-time",
            posted_at=item.get("created", "") or "",
            remote="remote" in desc.lower(),
            raw_data=item,
        )
        jobs.append(job)

    return jobs


async def import_recent_jobs(
    query: str = "software engineer",
    location: str = "",
    country: str = "us",
    max_results: int = 100,
) -> list[ExternalJob]:
    """Import recent jobs from Adzuna, handling pagination."""
    all_jobs: list[ExternalJob] = []
    page = 1

    while len(all_jobs) < max_results:
        remaining = max_results - len(all_jobs)
        per_page = min(50, remaining)
        jobs = await search_jobs(
            query=query,
            location=location,
            country=country,
            results_per_page=per_page,
            page=page,
        )
        if not jobs:
            break
        all_jobs.extend(jobs)
        page += 1
        if len(jobs) < per_page:
            break

    logger.info("Adzuna: imported %d jobs for query=%s", len(all_jobs), query)
    return all_jobs
