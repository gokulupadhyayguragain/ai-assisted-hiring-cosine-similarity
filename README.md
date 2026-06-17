# AI Assisted Hiring using Cosine Similarity

Containerized recruitment screening system based on the Investigation Report in `IR FYP.md`.

The system ranks resumes against a job description using anonymized text extraction, TF-IDF cosine similarity, an optional SBERT semantic layer, skill-gap explanations, bias auditing, CSV exports, and per-candidate transparency reports.

## Run With Docker

No host dependency installation is required.

```bash
docker compose up --build
```

Open:

- Dashboard: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

## Frontend Routes

- `/`: Login and workspace selection
- `/onboarding`: Recruiter onboarding wizard
- `/workspace/recruiter`: Recruiter home
- `/workspace/recruiter/create`: Create and persist job profile
- `/workspace/recruiter/upload`: Select saved job context
- `/workspace/recruiter/process`: Upload files and run AI screening
- `/workspace/recruiter/rankings`: Ranked candidates by session
- `/workspace/recruiter/bias`: Bias-audit view for latest session
- `/workspace/candidate`: Candidate self-check workspace
- `/reports`: Session report lookup and CSV/PDF exports
- `/settings`: Runtime behavior overview

## Job APIs

- `POST /api/jobs`: create persisted job profile
- `GET /api/jobs`: list saved jobs
- `GET /api/jobs/{job_id}`: load a saved job
- `PUT /api/jobs/{job_id}`: update a saved job profile
- `DELETE /api/jobs/{job_id}`: remove a saved job profile

## Run Tests

```bash
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit
```

## Optional SBERT/BERT Layer

The default Docker setup runs a lightweight skill-expanded semantic fallback so the project starts quickly. To install and enable `sentence-transformers` inside the backend container:

```bash
docker compose -f docker-compose.yml -f docker-compose.semantic.yml up --build
```

This downloads Python ML dependencies inside Docker and may take longer on the first build.

## Training & Packaging (scaffold)

A lightweight training scaffold is provided at `backend/tools/train_sbert.py`. It is safe to run in containers and supports a dry-run packaging mode that creates a small placeholder model suitable for testing the upload/load flow.

Run the dry-run packaging locally (or inside the backend container):

```bash
# inside project root
python -m backend.tools.train_sbert --dry-run --output runtime/models/example-packaged
```

To use a real training run you can install `sentence-transformers` inside a training container and run without `--dry-run`. The scaffold will save a model directory under `--output` that can be uploaded via `POST /api/models/upload` or copied into `backend/runtime/models/`.

## Uploading a trained model (from Colab)

After you train a `SentenceTransformer` model in Google Colab, save the model directory (the folder produced by `model.save(...)`) and compress it as a `.zip` or `.tar.gz` archive. Then upload it to the running backend:

```bash
# using curl from your workstation
curl -X POST "http://localhost:8000/api/models/upload" -F "file=@/path/to/your-model.zip"
```

Alternatively, copy the unpacked model directory into the backend runtime volume under `backend/runtime/models/<your-model-name>`.

Finally, rebuild the backend with the semantic dependencies installed so it can load the packaged model at runtime:

```bash
docker compose -f docker-compose.yml -f docker-compose.semantic.yml up --build -d
```

Check `/health` and `GET /api/models` to confirm the packaged model is present and (when dependencies are installed) loaded.

## Architecture

- `backend/`: FastAPI API, text extraction, anonymization, TF-IDF cosine matching, semantic scoring, exports, reports.
- `frontend/`: Next.js + Tailwind glass-style UI with dedicated screen flows for recruiters and job seekers.
- `postgres`: PostgreSQL session persistence.
- `redis`: Session cache.
- `infra/postgres/init.sql`: database schema.
- `docs/requirements-map.md`: IR requirement coverage.

## Supported Files

- Job descriptions: pasted text, `.txt`, `.md`, `.pdf`, `.docx`
- Resumes: `.txt`, `.md`, `.pdf`, `.docx`

PDF support depends on selectable text. Scanned image PDFs need OCR, which is listed as a future enhancement.
