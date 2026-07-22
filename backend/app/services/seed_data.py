"""Demo data seeder — creates sample accounts and data for development/testing.

Usage:
    python -m backend.app.services.seed_data
"""

from __future__ import annotations

import logging
import sys
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

logger = logging.getLogger(__name__)

# Ensure backend is importable
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.app.services.auth_handler import create_user  # noqa: E402

DEMO_USERS = [
    {
        "email": "admin@aihire.dev",
        "password": "admin123",
        "name": "Admin User",
        "role": "admin",
    },
    {
        "email": "hr@aihire.dev",
        "password": "hr123456",
        "name": "Jane Recruiter",
        "role": "recruiter",
    },
    {
        "email": "candidate@aihire.dev",
        "password": "candidate123",
        "name": "John Candidate",
        "role": "candidate",
    },
]

SAMPLE_JOBS = [
    {
        "title": "Senior Software Engineer",
        "department": "Engineering",
        "experience": "5-7 years",
        "location": "Kathmandu, Nepal",
        "salary": "$120k - $160k",
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "Kubernetes", "AWS", "React", "TypeScript"],
        "description": "We are looking for a Senior Software Engineer to join our growing team. You will design and build scalable microservices, mentor junior engineers, and contribute to our AI-powered hiring platform.",
        "status": "published",
    },
    {
        "title": "Machine Learning Engineer",
        "department": "AI/ML",
        "experience": "3-5 years",
        "location": "Remote",
        "salary": "$130k - $180k",
        "required_skills": ["Python", "PyTorch", "NLP", "Transformers", "BERT", "SQL", "Docker"],
        "description": "Join our ML team to improve our semantic matching engine. Work on fine-tuning transformer models, building embedding pipelines, and optimizing inference for production.",
        "status": "published",
    },
    {
        "title": "Frontend Developer",
        "department": "Engineering",
        "experience": "2-4 years",
        "location": "Kathmandu, Nepal",
        "salary": "$60k - $90k",
        "required_skills": ["React", "TypeScript", "Next.js", "Tailwind CSS", "JavaScript", "Git"],
        "description": "Build beautiful, responsive UIs for our hiring platform using Next.js, React, and Tailwind CSS. You will work closely with our design team to create an exceptional user experience.",
        "status": "draft",
    },
]

SAMPLE_RESUMES = [
    {
        "candidate_id": "cand-001",
        "display_name": "Alice Sharma",
        "text": "Senior Python Developer with 6+ years experience building microservices with FastAPI and Django. Proficient in PostgreSQL, Docker, Kubernetes, and AWS. Led a team of 4 engineers to deliver a real-time analytics platform handling 10M+ requests/day. Strong background in NLP and machine learning pipelines using PyTorch and HuggingFace Transformers.",
    },
    {
        "candidate_id": "cand-002",
        "display_name": "Bob Khatri",
        "text": "Full Stack Developer with 4 years of experience. Skilled in React, TypeScript, Next.js, and Node.js. Built several production applications using PostgreSQL and MongoDB. Experience with Docker and CI/CD pipelines using GitHub Actions. Strong communicator with experience working in remote teams.",
    },
    {
        "candidate_id": "cand-003",
        "display_name": "Carol Gurung",
        "text": "Data Scientist with 3 years of experience in machine learning and NLP. Proficient in Python, scikit-learn, PyTorch, and transformers. Worked on text classification, named entity recognition, and semantic search systems. Published 2 papers on representation learning at international conferences.",
    },
]


def seed_demo_users() -> list[dict]:
    """Create demo user accounts. Skips existing accounts."""
    created = []
    for user_data in DEMO_USERS:
        try:
            user = create_user(**user_data)
            created.append(user)
            logger.info("Created demo user: %s (%s)", user["email"], user["role"])
        except ValueError:
            logger.info("Demo user already exists: %s", user_data["email"])
        except Exception as exc:
            logger.warning("Failed to create user %s: %s", user_data["email"], exc)
    return created


def seed_sample_jobs() -> list[dict]:
    """Create sample job postings in the session store."""
    from backend.app.main import STORE  # noqa: E402

    created = []
    now = datetime.now(UTC).isoformat()
    for job_data in SAMPLE_JOBS:
        job = {
            "job_id": uuid4().hex[:12],
            "created_at": now,
            "updated_at": now,
            **job_data,
            "created_by": "recruiter",
        }
        STORE.save_job(job)
        created.append(job)
        logger.info("Created sample job: %s", job["title"])
    return created


def seed_sample_session() -> dict | None:
    """Create a sample analysis session with pre-computed scores."""
    from backend.app.main import ENGINE, STORE  # noqa: E402
    from backend.app.models import ExtractedDocument  # noqa: E402

    job = ExtractedDocument(
        filename="seed-job.txt",
        file_type="txt",
        text="Python FastAPI PostgreSQL Docker Kubernetes AWS React TypeScript machine learning NLP engineer developer",
    )

    resumes = [
        ExtractedDocument(filename=f"{r['candidate_id']}.txt", file_type="txt", text=r["text"])
        for r in SAMPLE_RESUMES
    ]

    try:
        session = ENGINE.analyze(job=job, resumes=resumes)
        STORE.save(session)
        logger.info("Created sample session: %s", session.session_id)
        return {
            "session_id": session.session_id,
            "candidate_count": len(session.candidates),
        }
    except Exception as exc:
        logger.warning("Failed to create sample session: %s", exc)
        return None


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    print("🌱 Seeding demo data for AIHire...")
    print()

    users = seed_demo_users()
    print(f"  Users: {len(users)} created (existing skipped)")

    jobs = seed_sample_jobs()
    print(f"  Jobs: {len(jobs)} created")

    session = seed_sample_session()
    if session:
        print(f"  Session: {session['session_id']} with {session['candidate_count']} candidates")
    else:
        print("  Session: skipped (model may not be loaded)")

    print()
    print("✅ Seeding complete!")
    print()
    print("Demo accounts:")
    for u in DEMO_USERS:
        print(f"  {u['email']} / {u['password']} ({u['role']})")


if __name__ == "__main__":
    main()
