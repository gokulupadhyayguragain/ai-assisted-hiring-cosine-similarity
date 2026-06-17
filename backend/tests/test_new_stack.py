"""Tests for the new recommended stack components.

Tests:
  - BGE Small EN embedding model loading and encoding
  - spaCy-based skill extraction and tokenization
  - BM25 scoring
  - Qwen2.5 LLM loading (without actually loading the model — tests env var gating)
  - Hybrid scoring with BM25 + TF-IDF + Cosine Similarity
"""

from __future__ import annotations

import pytest

from backend.app.models import ExtractedDocument
from backend.app.services.matching import (
    MatchingEngine,
    _load_bge_model,
    _load_qwen_llm,
    _rule_summary,
    _skill_overlap_score,
    cosine_similarity,
    generate_llm_summary,
)
from backend.app.services.skills import (
    expanded_tokens,
    extract_experience_years,
    extract_skills,
    important_terms,
    normalize_text,
    tokenize,
)


# =========================================================================
# spaCy / skills tests
# =========================================================================


def test_tokenize_with_spacy() -> None:
    """spaCy-based tokenization handles lemmatization and stop word removal."""
    tokens = tokenize("The developer was working on several Python projects")
    # "the", "was", "on", "several" should be removed or lemmatized
    assert "python" in tokens
    assert "developer" in tokens or "develop" in tokens  # lemmatized
    assert "the" not in tokens


def test_tokenize_fallback_without_spacy(monkeypatch) -> None:
    """Tokenization falls back to regex when spaCy is unavailable."""
    # Simulate spaCy unavailability by modifying the import path
    # We test the fallback indirectly by ensuring no exceptions
    tokens = tokenize("Python FastAPI Docker engineer", use_spacy=False)
    assert "python" in tokens
    assert "fastapi" in tokens
    assert "docker" in tokens


def test_extract_skills_with_spacy_ner() -> None:
    """Skill extraction detects technical skills from text."""
    skills, inferred = extract_skills(
        "Expert in Python, FastAPI, Docker, and PostgreSQL. "
        "Also experienced with React and AWS."
    )
    assert "Python" in skills
    assert "FastAPI" in skills
    assert "Docker" in skills
    assert "PostgreSQL" in skills or "SQL" in skills
    assert "React" in skills


def test_extract_skills_inferred() -> None:
    """Skill extraction adds inferred parent skills."""
    skills, inferred = extract_skills("Expert in FastAPI and Docker")
    # FastAPI infers -> Python, REST API
    # Docker infers -> Linux
    assert "FastAPI" in skills
    assert "Python" in skills  # inferred
    assert "Docker" in skills
    assert "Linux" in skills  # inferred
    # inferred should be a subset
    for skill in inferred:
        assert skill in skills


def test_extract_experience_years() -> None:
    """Years of experience are extracted correctly."""
    assert extract_experience_years("5+ years of experience") == 5.0
    assert extract_experience_years("3 years of professional experience") == 3.0
    assert extract_experience_years("Experience: 4 years") == 4.0
    assert extract_experience_years("No experience mentioned") is None


def test_important_terms_boosts_skills() -> None:
    """Important terms boost known skill keywords."""
    terms = important_terms("Python developer with FastAPI and Docker experience.", limit=10)
    assert "python" in terms
    assert "fastapi" in terms or "fastapi" in str(terms).lower()


def test_expanded_tokens_includes_skills() -> None:
    """Expanded tokens adds canonical skill names as tokens."""
    tokens = expanded_tokens("Python FastAPI engineer")
    assert "python" in tokens or "Python".lower() in tokens
    # Canonical skills are added as underscore-separated tokens
    skill_tokens = [t for t in tokens if "_" in t]
    assert len(skill_tokens) > 0


# =========================================================================
# BM25 tests
# =========================================================================


def test_bm25_scoring_basic() -> None:
    """BM25 returns higher scores for relevant resumes."""
    engine = MatchingEngine()
    job_tokens = ["python", "fastapi", "docker", "postgresql"]
    resume_texts = [
        "Python developer with FastAPI and Docker experience",
        "Graphic designer with Figma and Adobe skills",
    ]
    scores = engine._bm25_scores(job_tokens, resume_texts)
    assert len(scores) == 2
    # Python resume should score higher
    assert scores[0] >= scores[1]


def test_bm25_empty_input() -> None:
    """BM25 handles empty input gracefully."""
    engine = MatchingEngine()
    scores = engine._bm25_scores([], [])
    assert scores == []


# =========================================================================
# Cosine similarity tests
# =========================================================================


def test_cosine_similarity_identical() -> None:
    """Identical vectors have cosine similarity of 1.0."""
    vec = {"python": 1.0, "fastapi": 0.5}
    assert cosine_similarity(vec, vec) == pytest.approx(1.0, rel=1e-3)


def test_cosine_similarity_orthogonal() -> None:
    """Non-overlapping vectors have cosine similarity of 0.0."""
    assert cosine_similarity({"python": 1.0}, {"java": 1.0}) == 0.0


def test_cosine_similarity_empty() -> None:
    """Empty vectors return 0.0."""
    assert cosine_similarity({}, {}) == 0.0
    assert cosine_similarity({"a": 1.0}, {}) == 0.0


# =========================================================================
# Skill overlap tests
# =========================================================================


def test_skill_overlap_full() -> None:
    """Full skill overlap returns 1.0."""
    assert _skill_overlap_score(["Python", "Docker"], ["Python", "Docker"]) == 1.0


def test_skill_overlap_partial() -> None:
    """Partial skill overlap returns a fraction."""
    score = _skill_overlap_score(["Python", "Docker", "FastAPI"], ["Python"])
    assert score == pytest.approx(1 / 3, rel=1e-3)


def test_skill_overlap_none() -> None:
    """No overlap returns 0.0."""
    assert _skill_overlap_score(["Python"], ["Java"]) == 0.0


# =========================================================================
# Rule summary tests
# =========================================================================


def test_rule_summary_strong_fit() -> None:
    """High-scoring candidates show 'Strong fit'."""
    summary = _rule_summary(85.0, ["Python", "Docker"], [], 5.0)
    assert "Strong fit" in summary
    assert "Python" in summary


def test_rule_summary_moderate_fit() -> None:
    """Medium-scoring candidates show 'Moderate fit'."""
    summary = _rule_summary(65.0, ["Python"], ["Docker"], 3.0)
    assert "Moderate fit" in summary


def test_rule_summary_needs_review() -> None:
    """Low-scoring candidates show 'Needs review'."""
    summary = _rule_summary(30.0, [], ["Python", "Docker"], None)
    assert "Needs review" in summary


# =========================================================================
# BGE Small EN model loading tests
# =========================================================================


def test_bge_model_loading() -> None:
    """BGE Small EN model loads and produces embeddings."""
    model, name = _load_bge_model()
    assert model is not None
    assert "bge-small" in (name or "").lower()
    # Check that encoding works
    emb = model.encode(["Python developer with FastAPI experience"])
    assert len(emb) == 1  # one text
    assert len(emb[0]) > 0  # has embedding dimensions


def test_bge_embedding_similarity() -> None:
    """BGE embeddings produce higher similarity for related texts."""
    model, _ = _load_bge_model()
    emb_python = model.encode(["Python developer with FastAPI and Docker"])
    emb_java = model.encode(["Java Spring Boot developer with Kubernetes"])
    emb_python2 = model.encode(["Python engineer working on FastAPI projects"])

    # Import for cosine similarity
    import numpy as np

    sim_same = float(np.dot(emb_python[0], emb_python2[0]) / (
        np.linalg.norm(emb_python[0]) * np.linalg.norm(emb_python2[0])
    ))
    sim_diff = float(np.dot(emb_python[0], emb_java[0]) / (
        np.linalg.norm(emb_python[0]) * np.linalg.norm(emb_java[0])
    ))

    assert sim_same > sim_diff


# =========================================================================
# Qwen2.5 LLM loading tests (env-var gated, no actual model load)
# =========================================================================


def test_qwen_llm_disabled_by_default() -> None:
    """Qwen2.5 is not loaded when ENABLE_LLM is not set to '1'."""
    model, tokenizer = _load_qwen_llm()
    assert model is None
    assert tokenizer is None


def test_qwen_llm_generate_summary_fallback() -> None:
    """generate_llm_summary falls back to rule-based when LLM is disabled."""
    summary = generate_llm_summary(
        candidate_name="C001",
        matched_skills=["Python", "FastAPI"],
        missing_skills=["Docker"],
        score=80.0,
        experience_years=5.0,
        job_title="Backend Engineer",
    )
    assert isinstance(summary, str)
    assert len(summary) > 10


# =========================================================================
# Matching Engine integration tests
# =========================================================================


def test_matching_engine_ranks_correctly() -> None:
    """The matching engine correctly ranks stronger candidates higher."""
    engine = MatchingEngine()
    job = ExtractedDocument(
        filename="job.txt",
        file_type="txt",
        text="Python FastAPI PostgreSQL Docker developer with NLP and BERT experience.",
    )
    resumes = [
        ExtractedDocument(
            filename="strong.txt",
            file_type="txt",
            text="Python engineer with 3 years experience in FastAPI, PostgreSQL, Docker, NLP and BERT.",
        ),
        ExtractedDocument(
            filename="medium.txt",
            file_type="txt",
            text="Python developer with basic FastAPI knowledge and some SQL.",
        ),
        ExtractedDocument(
            filename="weak.txt",
            file_type="txt",
            text="Graphic designer with Figma and social media marketing experience.",
        ),
    ]

    session = engine.analyze(job=job, resumes=resumes)

    assert len(session.candidates) == 3
    assert session.candidates[0].source_filename == "strong.txt"
    assert session.candidates[1].source_filename == "medium.txt"
    assert session.candidates[2].source_filename == "weak.txt"
    assert session.candidates[0].score > session.candidates[1].score > session.candidates[2].score


def test_matching_engine_bm25_enabled() -> None:
    """The matching engine reports BM25 as enabled."""
    engine = MatchingEngine()
    assert engine.bm25_enabled is True


def test_matching_engine_semantic_enabled() -> None:
    """The matching engine reports semantic features as enabled with BGE."""
    engine = MatchingEngine()
    assert engine.semantic_enabled is True
    assert "bge-small" in engine.semantic_model_name.lower()


def test_matching_engine_skill_extraction() -> None:
    """The matching engine extracts skills from both job and resumes."""
    engine = MatchingEngine()
    job = ExtractedDocument(
        filename="job.txt",
        file_type="txt",
        text="Looking for a Python developer with FastAPI and Docker experience.",
    )
    resumes = [
        ExtractedDocument(
            filename="candidate.txt",
            file_type="txt",
            text="Python developer with FastAPI and Docker skills.",
        ),
    ]

    session = engine.analyze(job=job, resumes=resumes)

    assert len(session.job_skills) > 0
    assert "Python" in session.job_skills
    assert session.candidates[0].matched_skills is not None


def test_matching_engine_anonymization() -> None:
    """The matching engine applies anonymization correctly."""
    engine = MatchingEngine()
    job = ExtractedDocument(
        filename="job.txt",
        file_type="txt",
        text="Looking for a Python developer.",
    )
    resumes = [
        ExtractedDocument(
            filename="resume.txt",
            file_type="txt",
            text="John Doe\nEmail: john@example.com\nPython developer with Django experience.",
        ),
    ]

    session = engine.analyze(job=job, resumes=resumes)

    assert session.engine["anonymization"] == "enabled"
    # Check that anonymization was applied
    anonym = session.candidates[0].anonymization
    assert isinstance(anonym, dict)
    assert len(anonym) > 0


# =========================================================================
# TF-IDF tests
# =========================================================================


def test_tfidf_vectors_produce_scores() -> None:
    """TF-IDF vectors produce non-zero scores for relevant documents."""
    from backend.app.services.matching import _tfidf_vectors, cosine_similarity

    vectors = _tfidf_vectors([
        "Python FastAPI Docker engineer",
        "Python developer with FastAPI experience",
        "Graphic designer with Figma",
    ])

    assert len(vectors) == 3
    # Job (vector[0]) should be more similar to resume[0] than resume[1]
    sim_good = cosine_similarity(vectors[0], vectors[1])
    sim_bad = cosine_similarity(vectors[0], vectors[2])
    assert sim_good > sim_bad
