# IR Requirement Map

This implementation follows the core system described in `IR FYP.md`.

| IR requirement / deliverable | Implemented location |
| --- | --- |
| Upload job description and multiple resumes | `frontend/app/page.tsx`, `POST /api/analyze` |
| Extract text from PDF, DOCX, TXT/MD | `backend/app/services/text_extraction.py` |
| Pre-process extracted text | `backend/app/services/skills.py`, `backend/app/services/anonymizer.py` |
| Remove or mask identifying data | `backend/app/services/anonymizer.py` |
| TF-IDF vectorization | `backend/app/services/matching.py` |
| Cosine similarity ranking | `backend/app/services/matching.py` |
| BERT/SBERT semantic enhancement | Optional Docker build via `docker-compose.semantic.yml`; runtime hook in `MatchingEngine` |
| Explainable ranking | matched skills, missing skills, top terms, summary, suggestions |
| Responsive dashboard | `frontend/app/page.tsx`, `frontend/app/globals.css` |
| Recruiter and job-seeker modes | dashboard mode switch and API `role` field |
| Filter by minimum similarity and experience | dashboard filters |
| Download ranked report as CSV | `GET /api/sessions/{session_id}/export.csv` |
| Candidate transparency PDF | `GET /api/sessions/{session_id}/candidates/{candidate_id}/report.pdf` |
| Bias audit for discriminatory wording | `backend/app/services/bias_audit.py` |
| FastAPI backend with OpenAPI docs | `backend/app/main.py`, `/docs` |
| PostgreSQL persistence | `backend/app/services/storage.py`, `infra/postgres/init.sql` |
| Redis cache | `backend/app/services/storage.py` |
| Docker deployment | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` |
| Automated tests | `backend/tests/test_services.py`, `docker-compose.test.yml` |

## Current Practical Notes

- The default build keeps SBERT disabled to avoid a heavy first-time model download. The optional semantic compose file enables it inside Docker.
- Name anonymization uses conservative first-lines heuristics, plus email, phone, link, location, gendered-language, and photo-reference masking.
- OCR for scanned resumes and automated candidate emails are not included in this build.
