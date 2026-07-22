# AI Assisted Hiring using Cosine Similarity

**A fair, explainable, and containerized AI recruitment screening system** that ranks candidates against job descriptions using hybrid TF-IDF + BERT/SBERT cosine similarity, anonymized screening, bias auditing, and transparency reporting.

Built for Nepal's IT sector — specifically SMEs that lack budget for enterprise ATS tools like LinkedIn Recruiter ($10k+/yr) or Greenhouse ($6k+/yr).

---

## Quick Start

```bash
# Clone and run (local dev stack)
docker compose -f docker-compose.local.yml up --build
# or use the helper script
./start.sh
```

| Service | URL |
|---------|-----|
| Frontend (Next.js) | http://localhost:3000 |
| Backend API (FastAPI) | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## Features

### Core Screening Engine
- **Dual-engine scoring** — TF-IDF for fast keyword matching + BERT/SBERT for deep semantic understanding
- **Cosine Similarity ranking** — mathematically sound vector comparison for candidate-job fit
- **Weighted scoring** — configurable TF-IDF vs. semantic weight ratio (default 65/35)
- **Skill extraction & gap analysis** — identifies matched, missing, and inferred skills per candidate

### Anonymization & Fairness
- **PII detection & redaction** — removes names, emails, phone numbers, URLs, locations, gendered language
- **Bias Audit** — scans job descriptions for discriminatory language (gender, age, disability bias)
- **Explainable scores** — each candidate gets a breakdown of why they scored what they did

### Transparency
- **CSV exports** — downloadable leaderboard per screening session
- **Per-candidate PDF reports** — detailed match score, skill analysis, and narrative explanation
- **Tie-breaking analysis** — when candidates are within 5% of each other, compares 6 strategic dimensions

### Dual Workspace
- **Recruiter mode** — create jobs, batch upload resumes, run screenings, compare candidates
- **Candidate mode** — upload your resume, check skill-gap fit against job descriptions

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                     │
│              Tailwind CSS · Framer Motion                 │
│                    White Theme                            │
│         Blue (#003893) · Red (#CE1126) · Black           │
└──────────────────────────┬───────────────────────────────┘
                           │ HTTP/REST
┌──────────────────────────▼───────────────────────────────┐
│                   Backend (FastAPI)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Text     │ │TF-IDF    │ │ BERT/    │ │ Bias       │  │
│  │Extraction│ │Matching  │ │SBERT     │ │ Audit      │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │Anonymizer│ │Skill     │ │PDF/CSV   │ │ Storage    │  │
│  │          │ │Extraction│ │Reports   │ │ (Postgres) │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
└──────────────┬──────────────────────────────┬────────────┘
               │                              │
        ┌──────▼──────┐              ┌───────▼───────┐
        │  PostgreSQL  │              │    Redis      │
        │  (Sessions,  │              │   (Cache)     │
        │   Jobs)      │              │               │
        └─────────────┘              └───────────────┘
```

### Backend Stack

| Component | Technology |
|-----------|-----------|
| API Framework | FastAPI (Python) |
| TF-IDF Vectorization | scikit-learn |
| Semantic Embeddings | sentence-transformers (BGE Small EN v1.5) |
| Text Extraction | python-docx, PyMuPDF, standard text parsing |
| Anonymization | regex-based PII detection & redaction |
| PDF Reports | fpdf2 |
| Database | PostgreSQL (via raw SQL/JSONB) |
| Cache | Redis |
| OCR (future) | Tesseract (not in current build) |

### Frontend Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 16 (React 18) |
| Styling | Tailwind CSS 3 |
| Animations | Framer Motion 12 |
| Icons | Lucide React |
| State | TanStack React Query, Zustand |
| PDF Viewer | react-pdf, pdfjs-dist |

---

## Frontend Routes

### Public Routes
| Route | Page |
|-------|------|
| `/` | Landing / Home — workspace selection (HR or Candidate) |
| `/onboarding` | Recruiter onboarding wizard |
| `/reports` | Session report lookup and CSV/PDF exports |
| `/settings` | Runtime configuration overview |

### HR / Recruiter Routes
| Route | Page |
|-------|------|
| `/hr` | HR Dashboard — quick actions + recent jobs |
| `/hr/jobs` | Job posting list and creation |
| `/hr/jd-manager` | Manage saved job descriptions |
| `/hr/screening` | Upload resumes + run AI screening |
| `/hr/rankings` | View ranked candidates from screening sessions |
| `/hr/compare` | Side-by-side PDF resume comparison |
| `/hr/bias` | Bias audit for job descriptions |
| `/hr/uploads` | Manage uploaded files |
| `/hr/settings` | HR workspace settings |

### Candidate Routes
| Route | Page |
|-------|------|
| `/candidate` | Dashboard — upload resume + check fit |
| `/candidate/upload` | Upload and manage your resume |
| `/candidate/skill-gap` | Skill gap analysis against jobs |
| `/candidate/reports` | Your transparency reports |

### Admin Routes
| Route | Page |
|-------|------|
| `/admin` | System overview — health, stats |
| `/admin/users` | User management |
| `/admin/models` | AI model management |
| `/admin/analytics` | Platform analytics |
| `/admin/audits` | Audit logs |
| `/admin/reports` | System reports |
| `/admin/database` | Database management |
| `/admin/settings` | Platform settings |

---

## Backend API

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Root — service name + links |
| GET | `/health` | Health check — status, semantic engine info |

### Analysis / Screening
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze` | Upload resumes + job description, run AI screening |
| GET | `/api/sessions` | List past screening sessions |
| GET | `/api/sessions/{id}` | Get session details & rankings |
| GET | `/api/sessions/{id}/export.csv` | Download session results as CSV |
| GET | `/api/sessions/{id}/candidates/{cid}/report.pdf` | Per-candidate transparency PDF |

### Job Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jobs` | Create job posting |
| GET | `/api/jobs` | List saved jobs |
| GET | `/api/jobs/{id}` | Get job details |
| PUT | `/api/jobs/{id}` | Update job posting |
| DELETE | `/api/jobs/{id}` | Delete job posting |

### Model Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/models/upload` | Upload packaged model (zip/tar.gz) |
| GET | `/api/models` | List installed models |

### Utilities
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/convert` | Convert document (DOCX/TXT/MD) to PDF |
| POST | `/api/compare` | Compare two resumes side-by-side |
| POST | `/api/embeddings/precompute` | Precompute & cache embeddings for texts |

---

## Deployment Options

### Docker Compose (Full Stack)
```bash
# Local dev stack (frontend + backend + DB + Redis, with healthchecks)
docker compose -f docker-compose.local.yml up --build
# or: ./start.sh    (stop with ./stop.sh)
```

### With AI Training Profile
```bash
# Includes AI training container
docker compose -f docker-compose.local.yml --profile training up --build
```

### Run Tests
```bash
docker compose -f docker-compose.local.yml --profile testing up --build --abort-on-container-exit
```

### AWS / Cloud (production)
```bash
# Production-tuned: env-driven config, private DB/Redis, restart: always.
# Set PUBLIC_API_BASE, APP_URL, JWT_SECRET, GOOGLE_*, RESEND_*, POSTGRES_PASSWORD in .env first.
docker compose -f docker-compose.aws.yml --env-file .env up -d --build
```

---

## AI Training Module

A separate module (`ai_training/`) for training custom embedding models from scratch or fine-tuning existing ones.

### Pipeline
```bash
# Run full pipeline
bash ai_training/run_pipeline.sh              # 10M model (default)
bash ai_training/run_pipeline.sh 50m          # 50M model
bash ai_training/run_pipeline.sh 300m         # fine-tune 300M
bash ai_training/run_pipeline.sh --quick-test # quick validation
```

### Individual Steps
```bash
# 1. Preprocess datasets
python ai_training/preprocess_full.py --input datasets/ --output runtime/training_data

# 2. Train from scratch
python ai_training/train_tiny.py --data runtime/training_data

# 3. Fine-tune SBERT
python ai_training/train_300m_sbert.py --data runtime/training_data/training_pairs.csv

# 4. Upload model to backend
curl -X POST http://localhost:8000/api/models/upload -F "file=@model.zip"
```

### Training Architecture
- **10M–150M models** — from-scratch MiniBERT training, feasible on Kaggle free tier
- **300M+ models** — SentenceTransformer fine-tuning (requires GPU or patience on CPU)
- **Kaggle integration** — notebook at `notebooks/kaggle_colab_train.ipynb`
- **Dataset scraping** — Puppeteer tool at `ai_training/scripts/` for Kaggle dataset discovery

### Dataset Sources
Over 200+ Kaggle resume/job datasets discovered and cataloged at `dataset.txt`. The consolidated pipeline produces:
- `training_pairs.csv` — resume-JD similarity pairs
- `corpus.txt` — full text corpus for tokenizer training
- `consolidated_resumes.csv` — cleaned, deduplicated resume data (~10GB+)

---

## Project Structure

```
├── frontend/                  # Next.js web application
│   ├── app/                   # Pages (site, hr, candidate, admin)
│   ├── components/            # UI components (site, hr, candidate, admin, motion)
│   └── lib/                   # Utilities, API client, types
├── backend/                   # FastAPI Python backend
│   ├── app/
│   │   ├── main.py            # API routes
│   │   ├── models.py          # Data models
│   │   └── services/          # Matching, extraction, anonymization, etc.
│   ├── tests/
│   └── Dockerfile
├── ai_training/               # Model training pipeline
│   ├── train_tiny.py          # From-scratch training
│   ├── train_300m_sbert.py    # Fine-tuning
│   ├── preprocess_full.py     # Data preprocessing
│   └── scripts/               # Kaggle scraping tools
├── infra/
│   └── postgres/init.sql      # Database schema
├── datasets/                  # Raw Kaggle datasets (gitignored, ~14GB)
├── data/                      # Processed data
├── docker-compose.local.yml   # Local dev stack (+ training/testing profiles)
├── docker-compose.aws.yml     # AWS / cloud production stack
└── docs/
    └── requirements-map.md    # IR requirement mapping
```

---

## Design System

The latest frontend uses a **clean white theme** with Nepal flag-inspired accent colors:

| Color | Hex | Usage |
|-------|-----|-------|
| Blue | `#003893` | Primary actions, links, active states |
| Red | `#CE1126` | Secondary actions, danger, candidate side |
| White | `#ffffff` | Backgrounds, cards |
| Black | `#111111` | Headings, primary text |
| Gray | `#f4f4f5` – `#18181b` | Surfaces, borders, secondary text |

Responsive design optimized for both desktop and mobile with sidebar navigation, glassmorphism cards, and smooth Framer Motion transitions.

---

## Supported File Formats

| Format | Resumes | Job Descriptions |
|--------|---------|-----------------|
| PDF | ✅ (selectable text) | ✅ |
| DOCX | ✅ | ✅ |
| TXT | ✅ | ✅ |
| Markdown | ✅ | ✅ |
| Scanned PDF | ❌ (future: OCR) | ❌ |

---

## License

This project is developed as part of an academic Investigation Report (IR) and Final Year Project at Asia Pacific University (APU) / LBEF Campus, Kathmandu, Nepal.

**Author:** Gokul Upadhyay Guragain (NP069822)  
**Supervisor:** Mr. Shambhu Gautam  
**University:** Asia Pacific University of Technology & Innovation

---

## Research Context

This project addresses key challenges in Nepal's IT recruitment:

- **The Semantic Gap** — 78% of candidates believe keyword-based ATS systems fail to extract semantically similar skills
- **Efficiency Bottleneck** — HR teams spend 20+ hours/week on manual screening
- **Cognitive Bias** — unconscious bias in 6–7 second resume scans
- **Cost Barriers** — enterprise ATS costs $6,000–$10,000+/year, unaffordable for SMEs

**SDG Alignment:**
- **SDG 8** — Decent Work and Economic Growth (faster, fairer hiring)
- **SDG 10** — Reduced Inequalities (anonymized, merit-based evaluation)

See `IR FYP.md` for the full Investigation Report and `docs/requirements-map.md` for detailed requirement mapping.
