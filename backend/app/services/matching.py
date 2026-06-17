"""
Resume-job matching engine using the recommended lightweight stack:

  - Embeddings: BGE Small EN (bge-small-en-v1.5) via sentence-transformers
  - NLP:        spaCy for tokenization, lemmatization, and NER
  - Scoring:    TF-IDF, BM25, Cosine Similarity, Skill overlap, Experience matching
  - LLM:        Qwen2.5 3B Instruct (4-bit quantized) — optional, lazy-loaded
"""

from __future__ import annotations

import logging
import math
import os
import re
import time
import uuid
from collections import Counter, defaultdict
from backend.app.models import AnalysisSession, CandidateResult, ExtractedDocument
from backend.app.services.anonymizer import anonymize_text
from backend.app.services.bias_audit import audit_job_description
from backend.app.services.skills import (
    expanded_tokens,
    extract_experience_years,
    extract_skills,
    important_terms,
    normalize_text,
    tokenize,
)
from backend.app.services.embeddings import cached_encode

logger = logging.getLogger(__name__)

try:
    import numpy as _np
except Exception:
    _np = None  # type: ignore

# ---------------------------------------------------------------------------
# BGE Small EN model loader (lazy-loaded)
# ---------------------------------------------------------------------------

_BGE_MODEL = None
_BGE_MODEL_NAME = None


def _load_bge_model():
    """Load BGE Small EN model lazily. Returns (model, model_name) or (None, reason)."""
    global _BGE_MODEL, _BGE_MODEL_NAME
    if _BGE_MODEL is not None:
        return _BGE_MODEL, _BGE_MODEL_NAME

    try:
        from sentence_transformers import SentenceTransformer

        model_name = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
        logger.info("Loading embedding model: %s", model_name)
        model = SentenceTransformer(model_name)
        _BGE_MODEL = model
        _BGE_MODEL_NAME = model_name
        logger.info("Embedding model loaded successfully (%s).", model_name)
        return model, model_name
    except Exception as exc:
        logger.warning("Failed to load BGE embedding model: %s", exc)
        return None, f"BGE loading failed: {exc}"


# ---------------------------------------------------------------------------
# Qwen2.5 LLM loader (lazy-loaded, optional)
# ---------------------------------------------------------------------------

_QWEN_MODEL = None
_QWEN_TOKENIZER = None


def _load_qwen_llm():
    """Load Qwen2.5 3B Instruct with optional 4-bit quantization.

    Strategy:
      1. If CUDA is available and bitsandbytes is installed: 4-bit quantized (GPU).
      2. Otherwise: loads on CPU via float16 (uses ~6 GB RAM, fits 8 GB budget).
      3. If everything fails: returns None (rule-based fallback).

    Lazy-loaded — first call triggers download.
    """
    global _QWEN_MODEL, _QWEN_TOKENIZER
    if _QWEN_MODEL is not None:
        return _QWEN_MODEL, _QWEN_TOKENIZER

    if os.getenv("ENABLE_LLM", "0") != "1":
        return None, None

    model_id = os.getenv("LLM_MODEL", "Qwen/Qwen2.5-3B-Instruct")
    logger.info("Loading LLM: %s...", model_id)

    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer
        import torch

        tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)

        # Try 4-bit quantized on GPU if bitsandbytes is available
        cuda_available = torch.cuda.is_available()
        if cuda_available:
            try:
                from transformers import BitsAndBytesConfig

                quantization_config = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_compute_dtype=torch.float16,
                    bnb_4bit_use_double_quant=True,
                    bnb_4bit_quant_type="nf4",
                )
                model = AutoModelForCausalLM.from_pretrained(
                    model_id,
                    quantization_config=quantization_config,
                    device_map="auto",
                    trust_remote_code=True,
                )
                logger.info("Qwen2.5 loaded with GPU 4-bit quantization.")
                _QWEN_MODEL = model
                _QWEN_TOKENIZER = tokenizer
                return model, tokenizer
            except Exception as exc:
                logger.warning("GPU 4-bit loading failed (%s); trying CPU float16.", exc)

        # CPU fallback: load in float16 (no quantization, ~6 GB RAM)
        logger.info("Loading Qwen2.5 on CPU (float16, ~6 GB RAM)...")
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=torch.float16,
            device_map="cpu",
            trust_remote_code=True,
            low_cpu_mem_usage=True,
        )
        _QWEN_MODEL = model
        _QWEN_TOKENIZER = tokenizer
        logger.info("Qwen2.5 loaded successfully on CPU.")
        return model, tokenizer

    except Exception as exc:
        logger.warning(
            "Failed to load Qwen LLM (%s). LLM features disabled. "
            "Install with: pip install transformers accelerate", exc
        )
        return None, None


def _batch_llm_summaries(candidates_info: list[dict], job_skills: list[str]) -> list[str]:
    """Generate summaries for all candidates in a single batched LLM call.

    This avoids N sequential model calls by passing all candidates in one prompt.
    Falls back to per-candidate calls if batching fails.
    """
    model, tokenizer = _load_qwen_llm()
    if model is None or tokenizer is None:
        return [_rule_summary(
            c["score"], c["matched"], c["missing"], c["experience"]
        ) for c in candidates_info]

    # Build a single prompt with all candidates
    lines = ["You are a hiring assistant. Review all candidates below and provide a concise",
             "2-3 sentence professional assessment for each. Number each assessment:\n"]
    for idx, c in enumerate(candidates_info, 1):
        lines.append(f"Candidate #{idx}:")
        lines.append(f"  Fit score: {c['score']:.1f}%")
        lines.append(f"  Matched skills: {', '.join(c['matched']) if c['matched'] else 'None'}")
        lines.append(f"  Missing skills: {', '.join(c['missing']) if c['missing'] else 'None'}")
        lines.append(f"  Experience: {c['experience']} years")
        lines.append("")

    lines.append("Provide assessments for all candidates above.")
    prompt = "\n".join(lines)

    try:
        messages = [{"role": "user", "content": prompt}]
        text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=1024)
        outputs = model.generate(
            **inputs,
            max_new_tokens=256 * len(candidates_info),
            temperature=0.3,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )
        generated = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)

        # Parse out individual assessments from the batched response
        summaries = []
        for idx in range(1, len(candidates_info) + 1):
            # Try to extract each candidate's assessment
            for line in generated.split("\n"):
                if line.strip().startswith(f"Candidate #{idx}"):
                    # Take the next 2-3 lines as the summary
                    parts = generated.split(f"Candidate #{idx}")
                    if len(parts) > 1:
                        section = parts[1].split(f"Candidate #{idx + 1}")[0] if idx < len(candidates_info) else parts[1]
                        summary = section.strip().split("\n")[0].lstrip(":").strip()
                        if summary:
                            summaries.append(summary)
                            break
            if len(summaries) < idx:
                summaries.append(_rule_summary(
                    candidates_info[idx - 1]["score"],
                    candidates_info[idx - 1]["matched"],
                    candidates_info[idx - 1]["missing"],
                    candidates_info[idx - 1]["experience"],
                ))

        # Fill remaining with rule-based
        while len(summaries) < len(candidates_info):
            summaries.append(_rule_summary(
                candidates_info[len(summaries)]["score"],
                candidates_info[len(summaries)]["matched"],
                candidates_info[len(summaries)]["missing"],
                candidates_info[len(summaries)]["experience"],
            ))

        return summaries
    except Exception as exc:
        logger.warning("Batched LLM generation failed (%s); using per-candidate fallback.", exc)
        return None  # signal caller to use per-candidate fallback


def generate_llm_summary(candidate_name: str, matched_skills: list[str],
                         missing_skills: list[str], score: float,
                         experience_years: float | None,
                         job_title: str = "") -> str:
    """Generate a natural-language candidate summary using Qwen2.5.

    Falls back to rule-based summary if LLM is unavailable.
    """
    model, tokenizer = _load_qwen_llm()
    if model is None or tokenizer is None:
        return _rule_summary(score, matched_skills, missing_skills, experience_years)

    prompt = (
        f"You are a hiring assistant. Write a 2-3 sentence professional summary "
        f"for a candidate applying to a {job_title or 'position'}.\n\n"
        f"Candidate fit score: {score:.1f}%\n"
        f"Matched skills: {', '.join(matched_skills) if matched_skills else 'None listed'}\n"
        f"Missing skills: {', '.join(missing_skills) if missing_skills else 'None'}\n"
        f"Experience: {experience_years} years\n\n"
        f"Provide a concise, professional assessment."
    )

    messages = [{"role": "user", "content": prompt}]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)

    try:
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        outputs = model.generate(
            **inputs,
            max_new_tokens=128,
            temperature=0.3,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )
        generated = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
        return generated.strip()
    except Exception as exc:
        logger.warning("LLM generation failed (%s); using rule-based fallback.", exc)
        return _rule_summary(score, matched_skills, missing_skills, experience_years)


def _rule_summary(score: float, matched: list[str], missing: list[str],
                  years: float | None) -> str:
    """Rule-based candidate summary (used as fallback)."""
    if score >= 78:
        fit = "Strong fit"
    elif score >= 55:
        fit = "Moderate fit"
    else:
        fit = "Needs review"

    experience = f" with about {years:g} years of experience" if years else ""
    if matched:
        return f"{fit}{experience}; strongest overlap is in {', '.join(matched[:4])}."
    if missing:
        return f"{fit}{experience}; limited direct evidence for required skills."
    return f"{fit}{experience}; score is based on textual similarity."


# ---------------------------------------------------------------------------
# Matching Engine
# ---------------------------------------------------------------------------


class MatchingEngine:
    """Resume-job matching engine with hybrid scoring (TF-IDF + BM25 + semantic + skill overlap)."""

    def __init__(self) -> None:
        self.semantic_model = None
        self.semantic_model_name = "none"
        self.semantic_enabled = False
        self.bm25_enabled = False

        # Load BGE Small EN as the semantic embedding model
        model, name = _load_bge_model()
        if model is not None:
            self.semantic_model = model
            self.semantic_model_name = name or "BAAI/bge-small-en-v1.5"
            self.semantic_enabled = True
            logger.info("Semantic model: %s", self.semantic_model_name)
        else:
            logger.warning("No semantic model loaded; semantic scoring will use skill overlap fallback.")

        # Check BM25 availability
        try:
            import rank_bm25 as _  # noqa: F401 — check import

            self.bm25_enabled = True
        except Exception:
            self.bm25_enabled = False

    def analyze(
        self,
        *,
        job: ExtractedDocument,
        resumes: list[ExtractedDocument],
        role: str = "recruiter",
        tfidf_weight: float = 0.65,
    ) -> AnalysisSession:
        start = time.perf_counter()
        job_clean = anonymize_text(job.text).redacted_text
        job_skills, _ = extract_skills(job_clean)
        bias_audit = audit_job_description(job.text)

        # --- Prepare resume payloads ---
        resume_payloads = []
        for index, resume in enumerate(resumes, start=1):
            anonymized = anonymize_text(resume.text)
            skills, inferred = extract_skills(anonymized.redacted_text)
            resume_payloads.append({
                "id": f"C{index:03d}",
                "document": resume,
                "text": anonymized.redacted_text,
                "skills": skills,
                "inferred": inferred,
                "anonymization": anonymized.replacement_counts,
                "experience_years": extract_experience_years(anonymized.redacted_text),
            })

        # --- TF-IDF vectors ---
        corpus = [job_clean] + [item["text"] for item in resume_payloads]
        tfidf_vectors = _tfidf_vectors(corpus)
        job_vector = tfidf_vectors[0]
        resume_vectors = tfidf_vectors[1:]

        # --- BM25 scores ---
        bm25_job_tokens = tokenize(job_clean)
        bm25_scores = self._bm25_scores(bm25_job_tokens, [item["text"] for item in resume_payloads])

        # --- Semantic scores ---
        semantic_scores = self._semantic_scores(
            job_clean, [item["text"] for item in resume_payloads]
        )

        # --- Compute final scores ---
        results: list[CandidateResult] = []
        candidates_info: list[dict] = []
        for i, payload in enumerate(resume_payloads):
            tfidf_score = cosine_similarity(job_vector, resume_vectors[i])
            bm25_score = bm25_scores[i] if bm25_scores else 0.0
            skill_score = _skill_overlap_score(job_skills, payload["skills"])
            semantic_score = semantic_scores[i] if semantic_scores else skill_score

            # Hybrid semantic: blend BGE embedding similarity with skill overlap
            hybrid_semantic = max(semantic_score, skill_score * 0.88)

            # Combine BM25 + TF-IDF for keyword matching
            keyword_score = max(tfidf_score, bm25_score * 0.9)

            # Final score: blend keyword and semantic
            score = (keyword_score * tfidf_weight) + (hybrid_semantic * (1 - tfidf_weight))

            matched_skills = sorted(set(job_skills) & set(payload["skills"]))
            missing_skills = sorted(set(job_skills) - set(payload["skills"]))
            source_terms = important_terms(payload["text"])
            top_terms = _shared_terms(job_clean, payload["text"], source_terms)

            candidates_info.append({
                "score": score * 100,
                "matched": matched_skills,
                "missing": missing_skills,
                "experience": payload["experience_years"],
            })

            results.append({
                "payload": payload,
                "tfidf_score": tfidf_score,
                "bm25_score": bm25_score,
                "hybrid_semantic": hybrid_semantic,
                "score": score,
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
                "source_terms": source_terms,
                "top_terms": top_terms,
            })

        # Generate LLM summaries in one batched call (avoids N sequential model calls)
        batched_summaries = _batch_llm_summaries(candidates_info, job_skills)
        summaries: list[str]
        if batched_summaries is not None:
            summaries = batched_summaries
        else:
            summaries = []
            for item in candidates_info:
                summaries.append(_rule_summary(
                    item["score"], item["matched"], item["missing"], item["experience"]
                ))

        # Build final CandidateResult objects
        candidate_results: list[CandidateResult] = []
        for item, summary in zip(results, summaries):
            payload = item["payload"]
            candidate_results.append(
                CandidateResult(
                    candidate_id=payload["id"],
                    display_name=_display_name(payload["document"].filename, role),
                    source_filename=payload["document"].filename,
                    score=round(item["score"] * 100, 2),
                    tfidf_score=round(item["tfidf_score"] * 100, 2),
                    semantic_score=round(item["hybrid_semantic"] * 100, 2),
                    matched_skills=item["matched_skills"],
                    inferred_skills=payload["inferred"],
                    missing_skills=item["missing_skills"],
                    top_terms=item["top_terms"],
                    experience_years=payload["experience_years"],
                    summary=summary,
                    suggestions=_suggestions(item["missing_skills"]),
                    anonymization=payload["anonymization"],
                    extraction_warnings=payload["document"].warnings,
                )
            )

        candidate_results.sort(key=lambda c: c.score, reverse=True)
        processing_ms = int((time.perf_counter() - start) * 1000)

        return AnalysisSession.create(
            session_id=uuid.uuid4().hex[:12],
            job_skills=job_skills,
            bias_audit=bias_audit,
            candidates=candidate_results,
            processing_ms=processing_ms,
            engine={
                "tfidf_weight": tfidf_weight,
                "semantic_weight": round(1 - tfidf_weight, 2),
                "semantic_model": self.semantic_model_name if self.semantic_enabled else "skill-expanded fallback",
                "semantic_enabled": self.semantic_enabled,
                "bm25_enabled": self.bm25_enabled,
                "anonymization": "enabled",
                "stack": "BGE-Small-EN + spaCy + TF-IDF + BM25",
            },
            role=role,
        )

    def _semantic_scores(self, job_text: str, resume_texts: list[str]) -> list[float]:
        """Compute semantic similarity scores using BGE Small EN embeddings."""
        if not resume_texts:
            return []

        if self.semantic_model is None:
            # Fallback to skill overlap
            job_skills, _ = extract_skills(job_text)
            return [_skill_overlap_score(job_skills, extract_skills(t)[0]) for t in resume_texts]

        # Get job embedding (cached)
        job_emb = cached_encode(self.semantic_model, job_text)
        if job_emb is None:
            job_skills, _ = extract_skills(job_text)
            return [_skill_overlap_score(job_skills, extract_skills(t)[0]) for t in resume_texts]

        scores: list[float] = []
        for text in resume_texts:
            emb = cached_encode(self.semantic_model, text)
            if emb is None:
                job_skills, _ = extract_skills(job_text)
                scores.append(_skill_overlap_score(job_skills, extract_skills(text)[0]))
                continue
            try:
                val = _vector_cosine(job_emb, emb)
                scores.append(max(0.0, min(1.0, val)))
            except Exception:
                job_skills, _ = extract_skills(job_text)
                scores.append(_skill_overlap_score(job_skills, extract_skills(text)[0]))
        return scores

    def _bm25_scores(self, job_tokens: list[str], resume_texts: list[str]) -> list[float]:
        """Compute BM25 similarity scores between job and each resume."""
        if not self.bm25_enabled or not job_tokens or not resume_texts:
            return []

        try:
            from rank_bm25 import BM25Okapi

            tokenized_corpus = [tokenize(text) for text in resume_texts]
            bm25 = BM25Okapi(tokenized_corpus)
            raw = bm25.get_scores(job_tokens)
            # rank_bm25 can return a numpy array; convert to list for safe handling
            raw_scores = list(raw) if hasattr(raw, "tolist") else list(raw)
            if len(raw_scores) == 0:
                return []

            # Normalize scores to [0, 1]
            max_score = max(raw_scores)
            if max_score == 0:
                return [0.0] * len(raw_scores)
            return [s / max_score for s in raw_scores]
        except Exception as exc:
            logger.warning("BM25 scoring failed: %s", exc)
            return []


# ---------------------------------------------------------------------------
# TF-IDF vectorisation
# ---------------------------------------------------------------------------


def _tfidf_vectors(documents: list[str]) -> list[dict[str, float]]:
    tokenized = [expanded_tokens(doc) for doc in documents]
    doc_count = len(tokenized)
    document_frequency: defaultdict[str, int] = defaultdict(int)
    for tokens in tokenized:
        for token in set(tokens):
            document_frequency[token] += 1

    vectors: list[dict[str, float]] = []
    for tokens in tokenized:
        counts = Counter(tokens)
        total = sum(counts.values()) or 1
        vector: dict[str, float] = {}
        for token, count in counts.items():
            tf = count / total
            idf = math.log((1 + doc_count) / (1 + document_frequency[token])) + 1
            vector[token] = tf * idf
        vectors.append(vector)
    return vectors


def cosine_similarity(left: dict[str, float], right: dict[str, float]) -> float:
    if not left or not right:
        return 0.0
    shared = set(left) & set(right)
    dot = sum(left[t] * right[t] for t in shared)
    left_norm = math.sqrt(sum(v * v for v in left.values()))
    right_norm = math.sqrt(sum(v * v for v in right.values()))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return max(0.0, min(1.0, dot / (left_norm * right_norm)))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _skill_overlap_score(job_skills: list[str], resume_skills: list[str]) -> float:
    if not job_skills:
        return 0.0
    return len(set(job_skills) & set(resume_skills)) / len(set(job_skills))


def _vector_cosine(left, right) -> float:
    if _np is not None:
        a = _np.asarray(left, dtype=float)
        b = _np.asarray(right, dtype=float)
        ln = float(_np.linalg.norm(a))
        rn = float(_np.linalg.norm(b))
        if ln == 0 or rn == 0:
            return 0.0
        return float(a @ b) / (ln * rn)

    lv = list(left)
    rv = list(right)
    dot = sum(a * b for a, b in zip(lv, rv))
    ln = math.sqrt(sum(v * v for v in lv))
    rn = math.sqrt(sum(v * v for v in rv))
    if ln == 0 or rn == 0:
        return 0.0
    return dot / (ln * rn)


def _shared_terms(job_text: str, resume_text: str, candidate_terms: list[str]) -> list[str]:
    job_terms = set(important_terms(job_text, limit=40))
    resume_terms = set(candidate_terms)
    shared = [t for t in candidate_terms if t in job_terms and t in resume_terms]
    return shared[:10]


def _suggestions(missing_skills: list[str]) -> list[str]:
    if not missing_skills:
        return ["Maintain the current resume wording and prepare evidence for interviews."]
    return [
        f"Add concrete project or work evidence for {skill} if the candidate has it."
        for skill in missing_skills[:5]
    ]


def _display_name(filename: str, role: str) -> str:
    if role == "job-seeker":
        stem = re.sub(r"\.[^.]+$", "", filename).replace("_", " ").replace("-", " ").strip()
        return stem.title() or "Your Resume"
    return "Anonymous Candidate"
