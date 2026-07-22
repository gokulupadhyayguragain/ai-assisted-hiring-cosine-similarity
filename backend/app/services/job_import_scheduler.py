"""Job import scheduler — periodically fetches jobs from Adzuna and Greenhouse.

Designed to run as a standalone background worker or integrated into the FastAPI
lifespan with asyncio.create_task.

Usage as standalone:
    python -m backend.app.services.job_import_scheduler --interval 3600

Usage with database:
    DATABASE_URL=postgresql://... python -m backend.app.services.job_import_scheduler
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
from datetime import UTC, datetime
from pathlib import Path

logger = logging.getLogger(__name__)

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.app.services.job_board import JobBoardStore  # noqa: E402

try:
    from backend.app.services.adzuna_client import import_recent_jobs as adzuna_import  # noqa: E402
except ImportError:
    adzuna_import = None

try:
    from backend.app.services.greenhouse_client import import_company_jobs as greenhouse_import  # noqa: E402
except ImportError:
    greenhouse_import = None

# Default Greenhouse board tokens to import
DEFAULT_GREENHOUSE_TOKENS = [
    "airbnb",
    "stripe",
    "dropbox",
    "instacart",
    "shopify",
]

# Default Adzuna search queries
DEFAULT_ADZUNA_QUERIES = [
    "software engineer",
    "data scientist",
    "product manager",
    "devops engineer",
    "machine learning engineer",
]


async def run_adzuna_import(store: JobBoardStore, query: str, country: str = "us") -> int:
    """Import jobs from Adzuna and save them to the store."""
    if adzuna_import is None:
        logger.warning("Adzuna client not available — skipping")
        return 0

    try:
        jobs = await adzuna_import(query=query, country=country, max_results=50)
        count = 0
        for job in jobs:
            try:
                store.save(job)
                count += 1
            except Exception as exc:
                logger.warning("Failed to save Adzuna job: %s", exc)
        logger.info("Adzuna [%s]: imported %d / %d jobs", query, count, len(jobs))
        return count
    except Exception as exc:
        logger.error("Adzuna import failed for query '%s': %s", query, exc)
        return 0


async def run_greenhouse_import(store: JobBoardStore, tokens: list[str]) -> int:
    """Import jobs from Greenhouse company boards and save them to the store."""
    if greenhouse_import is None:
        logger.warning("Greenhouse client not available — skipping")
        return 0

    try:
        jobs = await greenhouse_import(board_tokens=tokens, max_per_company=50)
        count = 0
        for job in jobs:
            try:
                store.save(job)
                count += 1
            except Exception as exc:
                logger.warning("Failed to save Greenhouse job: %s", exc)
        logger.info("Greenhouse: imported %d / %d jobs from %d boards", count, len(jobs), len(tokens))
        return count
    except Exception as exc:
        logger.error("Greenhouse import failed: %s", exc)
        return 0


async def run_all_imports(store: JobBoardStore) -> dict[str, int]:
    """Run all configured imports and return counts."""
    results: dict[str, int] = {}

    # Adzuna imports
    queries = os.getenv("ADZUNA_QUERIES", ",".join(DEFAULT_ADZUNA_QUERIES)).split(",")
    country = os.getenv("ADZUNA_COUNTRY", "us")
    adzuna_total = 0
    for query in queries:
        query = query.strip()
        if query:
            count = await run_adzuna_import(store, query, country)
            adzuna_total += count
    results["adzuna"] = adzuna_total

    # Greenhouse imports
    tokens_env = os.getenv("GREENHOUSE_TOKENS", "")
    tokens = [t.strip() for t in tokens_env.split(",") if t.strip()] if tokens_env else DEFAULT_GREENHOUSE_TOKENS
    gh_total = await run_greenhouse_import(store, tokens)
    results["greenhouse"] = gh_total

    return results


async def run_once(store_path: str | Path | None = None) -> dict[str, int]:
    """Run a single import cycle (useful for cron/one-off)."""
    root = Path(store_path) if store_path else Path(__file__).resolve().parents[2] / "runtime"
    store = JobBoardStore(root)
    logger.info("Starting job import cycle at %s", datetime.now(UTC).isoformat())
    results = await run_all_imports(store)
    total = sum(results.values())
    logger.info("Import cycle complete: %d total jobs imported (%s)", total, results)
    return results


async def run_forever(interval_seconds: int = 3600, store_path: str | Path | None = None) -> None:
    """Run import cycles forever at the given interval."""
    logger.info("Job import scheduler started (interval=%ds)", interval_seconds)
    while True:
        try:
            await run_once(store_path)
        except Exception as exc:
            logger.error("Import cycle failed: %s", exc)
        await asyncio.sleep(interval_seconds)


def main() -> None:
    parser = argparse.ArgumentParser(description="Job import scheduler")
    parser.add_argument(
        "--interval", type=int, default=3600,
        help="Seconds between import cycles (default: 3600 = 1 hour)",
    )
    parser.add_argument(
        "--once", action="store_true",
        help="Run a single import cycle and exit",
    )
    parser.add_argument(
        "--store-path", type=str, default=None,
        help="Path to the runtime directory for storing jobs",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    if args.once:
        asyncio.run(run_once(args.store_path))
    else:
        asyncio.run(run_forever(args.interval, args.store_path))


if __name__ == "__main__":
    main()
