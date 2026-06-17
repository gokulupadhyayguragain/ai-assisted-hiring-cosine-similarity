from __future__ import annotations

from pathlib import Path
from typing import Annotated
from datetime import UTC, datetime
import uuid

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, Response
from pydantic import BaseModel, Field

from backend.app.models import ExtractedDocument, to_plain
from backend.app.services.matching import MatchingEngine
from backend.app.services.embeddings import precompute_embeddings
from backend.app.services.reporting import candidate_report_pdf, session_to_csv
from backend.app.services.storage import SessionStore
from backend.app.services.text_extraction import extract_upload
from backend.app.services.comparison import compare_resumes
import zipfile
import tarfile


APP_ROOT = Path(__file__).resolve().parents[1]
STORE = SessionStore(APP_ROOT / "runtime" / "sessions")
ENGINE = MatchingEngine()
MODEL_DIR = APP_ROOT / "runtime" / "models"

app = FastAPI(
    title="AI Assisted Hiring using Cosine Similarity",
    description=(
        "FastAPI backend for resume/JD extraction, anonymization, hybrid TF-IDF plus semantic "
        "cosine scoring, explainable candidate ranking, exports, and bias auditing."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class JobCreate(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    department: str = Field(min_length=2, max_length=120)
    experience: str = Field(min_length=1, max_length=80)
    location: str = Field(min_length=1, max_length=120)
    salary: str = Field(min_length=1, max_length=120)
    required_skills: list[str] = Field(default_factory=list)
    description: str = Field(min_length=10)
    created_by: str = Field(default="recruiter", max_length=40)


class JobRecord(JobCreate):
    job_id: str
    created_at: str
    updated_at: str


class EmbeddingPrecomputeRequest(BaseModel):
    texts: list[str] = Field(min_length=1)


class EmbeddingPrecomputeResponse(BaseModel):
    cached: list[dict[str, object]]


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "AI Assisted Hiring using Cosine Similarity",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "semantic_enabled": ENGINE.semantic_enabled,
        "semantic_model": ENGINE.semantic_model_name if ENGINE.semantic_enabled else "fallback",
    }


@app.post("/api/jobs", response_model=JobRecord)
def create_job(payload: JobCreate) -> dict:
    now = datetime.now(UTC).isoformat()
    job = {
        "job_id": uuid.uuid4().hex[:12],
        "created_at": now,
        "updated_at": now,
        "title": payload.title.strip(),
        "department": payload.department.strip(),
        "experience": payload.experience.strip(),
        "location": payload.location.strip(),
        "salary": payload.salary.strip(),
        "required_skills": [item.strip() for item in payload.required_skills if item.strip()],
        "description": payload.description.strip(),
        "created_by": payload.created_by.strip() or "recruiter",
    }
    STORE.save_job(job)
    return job


@app.get("/api/jobs", response_model=list[JobRecord])
def list_jobs(limit: int = 20) -> list[dict]:
    bounded = min(max(limit, 1), 100)
    return STORE.list_jobs(limit=bounded)


@app.get("/api/jobs/{job_id}", response_model=JobRecord)
def get_job(job_id: str) -> dict:
    job = STORE.load_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


@app.put("/api/jobs/{job_id}", response_model=JobRecord)
def update_job(job_id: str, payload: JobCreate) -> dict:
    existing = STORE.load_job(job_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    now = datetime.now(UTC).isoformat()
    job = {
        "job_id": job_id,
        "created_at": existing.get("created_at", now),
        "updated_at": now,
        "title": payload.title.strip(),
        "department": payload.department.strip(),
        "experience": payload.experience.strip(),
        "location": payload.location.strip(),
        "salary": payload.salary.strip(),
        "required_skills": [item.strip() for item in payload.required_skills if item.strip()],
        "description": payload.description.strip(),
        "created_by": payload.created_by.strip() or existing.get("created_by", "recruiter"),
    }
    STORE.save_job(job)
    return job


@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: str) -> dict:
    existing = STORE.load_job(job_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    STORE.delete_job(job_id)
    return {"deleted": True, "job_id": job_id}


@app.post("/api/models/upload")
def upload_model(file: UploadFile = File(...), name: str | None = Form(None)) -> dict:
    """Upload a packaged model (zip or folder) into runtime/models.

    If a zip archive is uploaded it will be extracted to runtime/models/<name>.
    """
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    filename = (name or file.filename).strip()
    if not filename:
        raise HTTPException(status_code=400, detail="Provide a valid filename or name form field.")

    dest = MODEL_DIR / filename
    try:
        # save uploaded file to a temp path
        data = file.file.read()
        temp_path = MODEL_DIR / (filename + ".upload")
        with temp_path.open("wb") as fh:
            fh.write(data)

        # if zip, extract
        if zipfile.is_zipfile(temp_path):
            extract_dir = MODEL_DIR / (Path(filename).stem)
            extract_dir.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(temp_path, "r") as zf:
                zf.extractall(path=extract_dir)
            temp_path.unlink()
            return {"uploaded": True, "path": str(extract_dir)}

        # if tar (tar.gz) extract
        if tarfile.is_tarfile(temp_path):
            extract_dir = MODEL_DIR / (Path(filename).stem)
            extract_dir.mkdir(parents=True, exist_ok=True)
            with tarfile.open(temp_path, "r:*") as tf:
                tf.extractall(path=extract_dir)
            temp_path.unlink()
            return {"uploaded": True, "path": str(extract_dir)}

        # otherwise move to a folder named filename
        final_dir = MODEL_DIR / filename
        final_dir.mkdir(parents=True, exist_ok=True)
        with (final_dir / "uploaded.bin").open("wb") as fh:
            fh.write(data)
        temp_path.unlink()
        return {"uploaded": True, "path": str(final_dir)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save model: {exc}")


@app.post("/api/embeddings/precompute", response_model=EmbeddingPrecomputeResponse)
def precompute_embedding_cache(payload: EmbeddingPrecomputeRequest) -> dict:
    cached = precompute_embeddings(ENGINE.semantic_model, [text.strip() for text in payload.texts if text.strip()])
    if not cached:
        raise HTTPException(status_code=400, detail="Provide at least one non-empty text.")
    return {"cached": cached}


@app.get("/api/models")
def list_models() -> dict:
    """List packaged models under runtime/models and whether the engine has loaded one."""
    models = []
    if MODEL_DIR.exists():
        for p in sorted(MODEL_DIR.iterdir()):
            if not p.exists():
                continue
            files = []
            if p.is_dir():
                for f in sorted(p.iterdir()):
                    files.append(f.name)
            else:
                files = [p.name]
            loaded = False
            # engine reports loaded packaged model as 'packaged:<name>'
            try:
                if ENGINE.semantic_enabled and isinstance(ENGINE.semantic_model_name, str) and ENGINE.semantic_model_name.startswith("packaged:"):
                    loaded = ENGINE.semantic_model_name.split(":", 1)[1] == p.name
            except Exception:
                loaded = False
            models.append({"name": p.name, "files": files, "loaded": loaded})
    return {"models": models}


@app.post("/api/analyze")
async def analyze(
    resumes: Annotated[list[UploadFile], File(description="Resume files in PDF, DOCX, TXT, or MD format.")],
    job_file: Annotated[UploadFile | None, File(description="Optional job description file.")] = None,
    job_text: Annotated[str | None, Form(description="Optional pasted job description text.")] = None,
    role: Annotated[str, Form(description="recruiter or job-seeker")] = "recruiter",
    tfidf_weight: Annotated[float, Form(description="Weight for TF-IDF score between 0 and 1.")] = 0.65,
) -> dict:
    if not resumes:
        raise HTTPException(status_code=400, detail="Upload at least one resume.")
    if job_file is None and not (job_text and job_text.strip()):
        raise HTTPException(status_code=400, detail="Provide a job description file or pasted job text.")
    if not 0 <= tfidf_weight <= 1:
        raise HTTPException(status_code=400, detail="tfidf_weight must be between 0 and 1.")
    if role not in {"recruiter", "job-seeker"}:
        raise HTTPException(status_code=400, detail="role must be recruiter or job-seeker.")

    if job_file is not None:
        job_document = await extract_upload(job_file)
    else:
        job_document = ExtractedDocument(filename="pasted-job-description.txt", text=job_text or "", file_type="txt")

    resume_documents = [await extract_upload(file) for file in resumes]
    empty = [document.filename for document in resume_documents if not document.text.strip()]
    if empty:
        raise HTTPException(status_code=400, detail=f"No extractable text found in: {', '.join(empty)}")

    session = ENGINE.analyze(
        job=job_document,
        resumes=resume_documents,
        role=role,
        tfidf_weight=tfidf_weight,
    )
    STORE.save(session)
    return to_plain(session)


@app.get("/api/sessions")
def list_sessions(limit: int = 20) -> dict:
    """List past screening sessions."""
    bounded = min(max(limit, 1), 100)
    sessions = STORE.list_sessions(limit=bounded)
    return {"sessions": sessions}


@app.get("/api/sessions/{session_id}")
def get_session(session_id: str) -> dict:
    session = STORE.load(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session


@app.get("/api/sessions/{session_id}/export.csv", response_class=PlainTextResponse)
def export_csv(session_id: str) -> PlainTextResponse:
    session = STORE.load(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return PlainTextResponse(
        session_to_csv(session),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="screening-{session_id}.csv"'},
    )


@app.post("/api/convert")
async def convert_to_pdf(file: UploadFile = File(...)) -> Response:
    """Convert an uploaded document (DOCX, TXT, MD) to PDF for preview.

    Uses python-docx to read .docx files and fpdf2 to generate a PDF.
    Falls back to plain-text PDF for unsupported formats.
    """
    from io import BytesIO

    raw = await file.read()
    filename = file.filename or "document"
    suffix = Path(filename).suffix.lower()

    text = ""
    if suffix == ".docx":
        try:
            from docx import Document
            doc = Document(BytesIO(raw))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            text = "\n".join(paragraphs)
        except Exception:
            text = raw.decode("utf-8", errors="ignore")
    elif suffix in (".txt", ".md", ".csv"):
        text = raw.decode("utf-8", errors="ignore")
    elif suffix == ".pdf":
        # Already PDF — return as-is
        return Response(raw, media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{filename}"'})
    else:
        text = raw.decode("utf-8", errors="ignore")

    # Generate PDF from text using fpdf2
    try:
        from fpdf import FPDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_font("DejaVu", "", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", uni=True)
        pdf.set_font("DejaVu", "", 10)
        for line in text.split("\n"):
            line = line.strip()
            if line:
                # Handle non-Latin characters safely
                safe_line = line.encode("latin-1", "replace").decode("latin-1")
                pdf.cell(0, 5, safe_line, new_x="LMARGIN", new_y="NEXT")
            else:
                pdf.ln(3)

        pdf_bytes = pdf.output(dest="S").encode("latin-1")
        return Response(
            pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{Path(filename).stem}.pdf"'},
        )
    except Exception as exc:
        # If PDF generation fails, return plain text
        return Response(
            text,
            media_type="text/plain",
            headers={"Content-Disposition": f'inline; filename="{Path(filename).stem}.txt"'},
        )


@app.post("/api/compare")
async def compare_resumes_api(
    resume_a: UploadFile = File(...),
    resume_b: UploadFile = File(...),
) -> dict:
    """Compare two resumes side-by-side: skill overlap, similarity score,
    tie-breaking recommendation, and duplicate detection.
    """
    doc_a = await extract_upload(resume_a)
    doc_b = await extract_upload(resume_b)

    result = compare_resumes(doc_a, doc_b)
    return result


@app.get("/api/sessions/{session_id}/candidates/{candidate_id}/report.pdf")
def transparency_report(session_id: str, candidate_id: str) -> Response:
    session = STORE.load(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    try:
        body = candidate_report_pdf(session, candidate_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Candidate not found.") from None

    content_type = "application/pdf" if body.startswith(b"%PDF") else "text/plain"
    suffix = "pdf" if content_type == "application/pdf" else "txt"
    return Response(
        body,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{candidate_id}-transparency-report.{suffix}"'},
    )
