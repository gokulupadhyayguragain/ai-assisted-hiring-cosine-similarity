from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any


@dataclass(slots=True)
class ExtractedDocument:
    filename: str
    text: str
    file_type: str
    warnings: list[str] = field(default_factory=list)


@dataclass(slots=True)
class AnonymizationSummary:
    redacted_text: str
    replacement_counts: dict[str, int]


@dataclass(slots=True)
class BiasFinding:
    term: str
    category: str
    severity: str
    suggestion: str


@dataclass(slots=True)
class BiasAudit:
    score: int
    findings: list[BiasFinding]


@dataclass(slots=True)
class CandidateResult:
    candidate_id: str
    display_name: str
    source_filename: str
    score: float
    tfidf_score: float
    semantic_score: float
    matched_skills: list[str]
    inferred_skills: list[str]
    missing_skills: list[str]
    top_terms: list[str]
    experience_years: float | None
    summary: str
    suggestions: list[str]
    anonymization: dict[str, int]
    extraction_warnings: list[str]


@dataclass(slots=True)
class AnalysisSession:
    session_id: str
    created_at: str
    job_skills: list[str]
    bias_audit: BiasAudit
    candidates: list[CandidateResult]
    processing_ms: int
    engine: dict[str, Any]
    role: str

    @classmethod
    def create(
        cls,
        *,
        session_id: str,
        job_skills: list[str],
        bias_audit: BiasAudit,
        candidates: list[CandidateResult],
        processing_ms: int,
        engine: dict[str, Any],
        role: str,
    ) -> "AnalysisSession":
        return cls(
            session_id=session_id,
            created_at=datetime.now(UTC).isoformat(),
            job_skills=job_skills,
            bias_audit=bias_audit,
            candidates=candidates,
            processing_ms=processing_ms,
            engine=engine,
            role=role,
        )


def to_plain(value: Any) -> Any:
    if hasattr(value, "__dataclass_fields__"):
        return asdict(value)
    if isinstance(value, list):
        return [to_plain(item) for item in value]
    if isinstance(value, dict):
        return {key: to_plain(item) for key, item in value.items()}
    return value
