"""Greenhouse ATS job board API client.

Greenhouse's "Job Board API" is publicly accessible — no API key needed to read jobs.
Companies using Greenhouse: Airbnb, Stripe, Dropbox, Instacart, etc.

Docs: https://developers.greenhouse.io/job-board.html
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from backend.app.services.job_board import ExternalJob

logger = logging.getLogger(__name__)

GREENHOUSE_BASE = "https://boards-api.greenhouse.io/v1/boards"


async def fetch_company_jobs(
    board_token: str,
    content: str = "true",
    limit: int = 100,
    page: int = 1,
) -> list[ExternalJob]:
    """Fetch jobs from a Greenhouse-powered company careers page.

    Args:
        board_token: Company's Greenhouse board token (e.g. "airbnb", "stripe")
        content: Include full job description? ("true" or "false")
        limit: Jobs per page (max 100)
        page: Page number
    """
    url = f"{GREENHOUSE_BASE}/{board_token}/jobs"
    params: dict[str, Any] = {
        "content": content,
        "per_page": min(limit, 100),
        "page": page,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        logger.warning("Greenhouse API error for board '%s': %s", board_token, exc)
        return []

    results = data.get("jobs", [])
    jobs: list[ExternalJob] = []
    for item in results:
        offices = item.get("offices", []) or []
        location = offices[0].get("name", "") if offices else ""
        metadata = item.get("metadata", []) or []

        desc = item.get("content", "") or ""
        skills: list[str] = []
        for skill in [
            "Python", "Java", "JavaScript", "TypeScript", "React", "Node.js",
            "Docker", "Kubernetes", "AWS", "SQL", "PostgreSQL", "MongoDB",
            "Machine Learning", "NLP", "Git", "Linux", "CI/CD", "Agile",
            "Go", "Rust", "GraphQL", "Redis", "Kafka",
        ]:
            if skill.lower() in desc.lower():
                skills.append(skill)

        # Extract department
        departments = item.get("departments", []) or []
        department_name = departments[0].get("name", "") if departments else ""

        # Get employment type from metadata
        employment_type = ""
        for m in metadata:
            if "type" in (m.get("name", "") or "").lower():
                employment_type = m.get("value", "") or ""
                break

        job = ExternalJob(
            source="greenhouse",
            source_id=str(item.get("id", "")),
            title=item.get("title", "") or "",
            company=item.get("company_name", board_token) or board_token,
            location=location,
            description=desc,
            url=item.get("absolute_url", "") or "",
            department=department_name,
            required_skills=skills,
            employment_type=employment_type or "full-time",
            posted_at=item.get("updated_at", "") or "",
            remote="remote" in desc.lower(),
            raw_data=item,
        )
        jobs.append(job)

    return jobs


async def import_company_jobs(
    board_tokens: list[str],
    max_per_company: int = 100,
) -> list[ExternalJob]:
    """Import jobs from multiple Greenhouse company boards."""
    all_jobs: list[ExternalJob] = []
    for token in board_tokens:
        jobs = await fetch_company_jobs(token, limit=max_per_company)
        logger.info("Greenhouse: imported %d jobs from %s", len(jobs), token)
        all_jobs.extend(jobs)
    return all_jobs
