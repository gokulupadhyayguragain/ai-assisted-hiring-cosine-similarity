# IR Requirement Map

This document maps the requirements from the Investigation Report (`IR FYP.md`) to the implemented system components.

---

## Core Screening Requirements

| IR Requirement / Deliverable | Implemented Location | Status |
|------------------------------|---------------------|--------|
| Upload job description and multiple resumes | `POST /api/analyze` (backend) + frontend upload forms | ✅ |
| Extract text from PDF, DOCX, TXT/MD | `backend/app/services/text_extraction.py` — `extract_upload()` | ✅ |
| Pre-process extracted text (cleaning, tokenization) | `backend/app/services/skills.py`, `backend/app/services/anonymizer.py` | ✅ |
| Remove or mask identifying data (PII) | `backend/app/services/anonymizer.py` — regex-based name, email, phone, location, gendered language removal | ✅ |
| TF-IDF vectorization | `backend/app/services/matching.py` — `MatchingEngine` with scikit-learn `TfidfVectorizer` | ✅ |
| Cosine similarity ranking | `backend/app/services/matching.py` — `cosine_similarity` from sklearn | ✅ |
| BERT/SBERT semantic enhancement | `backend/app/services/embeddings.py` — `sentence-transformers` (BGE Small EN v1.5) | ✅ |
| Explainable ranking (matched/missing skills, top terms, summary, suggestions) | `MatchingEngine.analyze()` returns full breakdown per candidate | ✅ |

## API & Persistence

| IR Requirement | Implemented Location | Status |
|----------------|---------------------|--------|
| FastAPI backend with automatic OpenAPI docs | `backend/app/main.py` — `/docs` endpoint | ✅ |
| Job CRUD API | `POST/GET/PUT/DELETE /api/jobs` | ✅ |
| PostgreSQL persistence | `backend/app/services/storage.py` + `infra/postgres/init.sql` | ✅ |
| Redis cache | `backend/app/services/storage.py` — optional cache layer | ✅ |
| Model upload API | `POST /api/models/upload` (zip/tar.gz extraction) | ✅ |
| Embedding precompute API | `POST /api/embeddings/precompute` | ✅ |

## Reports & Exports

| IR Requirement | Implemented Location | Status |
|----------------|---------------------|--------|
| Download ranked report as CSV | `GET /api/sessions/{id}/export.csv` — `session_to_csv()` | ✅ |
| Candidate transparency PDF | `GET /api/sessions/{id}/candidates/{cid}/report.pdf` — `candidate_report_pdf()` | ✅ |
| Document-to-PDF conversion | `POST /api/convert` — DOCX/TXT/MD to PDF via fpdf2 | ✅ |
| Resume comparison | `POST /api/compare` — side-by-side skill overlap + duplicate detection | ✅ |

## Bias & Fairness

| IR Requirement | Implemented Location | Status |
|----------------|---------------------|--------|
| Bias audit for discriminatory wording | `backend/app/services/bias_audit.py` — gender/age/disability/exclusionary term detection | ✅ |
| Anonymization during pre-processing | `backend/app/services/anonymizer.py` — PII redaction before scoring | ✅ |
| Tie-breaking analysis | `frontend/components/hr/tie-break-summary.tsx` — 6-dimension comparison | ✅ |

## User Interface

| IR Requirement | Implemented Location | Status |
|----------------|---------------------|--------|
| Responsive web dashboard | Frontend Next.js app — all pages responsive | ✅ |
| Recruiter mode | `/hr/*` routes — job management, screening, rankings, bias audit | ✅ |
| Job-seeker / Candidate mode | `/candidate/*` routes — resume upload, skill gap check, reports | ✅ |
| Admin panel | `/admin/*` routes — system health, models, users, analytics | ✅ |
| White theme with blue/red/black accent | Tailwind config + globals.css — Nepal flag-inspired colors on white | ✅ |
| Glassmorphism UI | CSS classes (`.glass`, `.glass-card`, `.glass-strong`) in `globals.css` | ✅ |
| Mobile-optimized layout | Responsive breakpoints in all components + sidebar drawer pattern | ✅ |
| Smooth animations | Framer Motion — `Reveal`, `Stagger`, `Magnetic` components | ✅ |

## Deployment

| IR Requirement | Implemented Location | Status |
|----------------|---------------------|--------|
| Docker Compose deployment | `docker-compose.local.yml` — frontend + backend + postgres + redis (healthchecks, networks, restart policies) | ✅ |
| AWS / cloud production stack | `docker-compose.aws.yml` — env-driven config, private DB/Redis, restart: always | ✅ |
| AI training container | `ai_training/Dockerfile` + `docker-compose.local.yml` `training` profile | ✅ |
| Automated tests | `backend/tests/` + `ai_training/tests/` + `docker-compose.local.yml` `testing` profile | ✅ |
| Frontend containerization | `frontend/Dockerfile` | ✅ |

## AI Training

| IR Requirement | Implemented Location | Status |
|----------------|---------------------|--------|
| From-scratch model training (10M–150M) | `ai_training/train_tiny.py` — MiniBERT training script | ✅ |
| SBERT fine-tuning (300M) | `ai_training/train_300m_sbert.py` — SentenceTransformer fine-tuning | ✅ |
| Data preprocessing pipeline | `ai_training/preprocess_full.py` — extraction, cleaning, consolidation | ✅ |
| Synthetic dataset generation | `ai_training/generate_synthetic_dataset.py` | ✅ |
| Kaggle dataset gathering | `ai_training/scripts/` — Puppeteer scraper + Colab notebook | ✅ |
| Pipeline orchestrator | `ai_training/run_pipeline.sh` — end-to-end training pipeline | ✅ |

## Archival / Notes

| Resource | Description |
|----------|-------------|
| `ir-requirements-map.md` (this file) | Requirement mapping from IR to implementation |
| `suggestion.txt` | ML model training feasibility analysis (1B vs 150M vs local vs Kaggle) |
| `dataset.txt` | 200+ Kaggle resume/job dataset download commands |
| `ui.txt` | UI design prompts for Google Stitch / design tool |
| `IR FYP.md` | Full Investigation Report (academic submission — unmodified) |

## Future / Not Implemented

| Feature | Reason |
|---------|--------|
| OCR for scanned PDFs | Requires Tesseract integration — listed as future enhancement |
| Automated candidate email communication | Out of scope for current build — listed as optional deliverable |
| Live video interview analysis | Out of scope (explicit constraint) |
| Real-time interview scheduling | Out of scope (explicit constraint) |
| Full-text OCR for image-only resumes | Requires external OCR engine — not included |
