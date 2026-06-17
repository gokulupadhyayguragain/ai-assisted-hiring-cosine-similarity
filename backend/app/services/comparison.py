"""
Resume comparison service with multi-strategy tie-breaking.

Provides side-by-side skill overlap analysis, similarity scoring,
and several tie-breaking strategies to differentiate candidates
when overall scores are close.
"""

from __future__ import annotations

import re
import math
import logging
from collections import Counter

from backend.app.models import ExtractedDocument
from backend.app.services.skills import (
    extract_skills,
    extract_experience_years,
    important_terms,
    normalize_text,
    tokenize,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Main comparison function
# ---------------------------------------------------------------------------


def compare_resumes(
    doc_a: ExtractedDocument,
    doc_b: ExtractedDocument,
) -> dict:
    """
    Compare two resumes and produce a structured result with:
      - similarity_score
      - skill_overlap / unique_to_a / unique_to_b
      - recommendation
      - tie_breakers (multi-strategy tie-breaking analysis)
    """
    text_a = doc_a.text
    text_b = doc_b.text

    # --- Skill extraction ---
    skills_a, inferred_a = extract_skills(text_a)
    skills_b, inferred_b = extract_skills(text_b)

    set_a = set(skills_a)
    set_b = set(skills_b)

    overlap = sorted(set_a & set_b)
    unique_a = sorted(set_a - set_b)
    unique_b = sorted(set_b - set_a)

    # --- Similarity score (cosine on TF-IDF of expanded tokens) ---
    tokens_a = Counter(tokenize(text_a))
    tokens_b = Counter(tokenize(text_b))

    similarity_score = _cosine_token_similarity(tokens_a, tokens_b)

    # --- Tie-breaking analysis ---
    tie_breakers = _tie_breaking_analysis(
        doc_a, doc_b,
        skills_a, skills_b,
        inferred_a, inferred_b,
        tokens_a, tokens_b,
        text_a, text_b,
    )

    # --- Recommendation ---
    recommendation = _generate_recommendation(
        similarity_score, skills_a, skills_b,
        inferred_a, inferred_b,
        tie_breakers,
    )

    return {
        "similarity_score": round(similarity_score * 100, 1),
        "skill_overlap": overlap,
        "unique_to_a": unique_a,
        "unique_to_b": unique_b,
        "recommendation": recommendation,
        "tie_breakers": tie_breakers,
    }


# ---------------------------------------------------------------------------
# Tie-breaking strategies
# ---------------------------------------------------------------------------


def _tie_breaking_analysis(
    doc_a: ExtractedDocument,
    doc_b: ExtractedDocument,
    skills_a: list[str],
    skills_b: list[str],
    inferred_a: list[str],
    inferred_b: list[str],
    tokens_a: Counter[str],
    tokens_b: Counter[str],
    text_a: str,
    text_b: str,
) -> list[dict]:
    """Run all tie-breaking strategies and return results."""

    strategies: list[dict] = []

    # 1. Semantic Depth Score (conceptual alignment beyond keywords)
    strategies.append(_strategy_semantic_depth(
        tokens_a, tokens_b, skills_a, skills_b, text_a, text_b
    ))

    # 2. Skill Depth Ratio (unique skills + inferred skills)
    strategies.append(_strategy_skill_depth(
        skills_a, skills_b, inferred_a, inferred_b
    ))

    # 3. Breadth vs Specialization (total skill coverage)
    strategies.append(_strategy_breadth(
        skills_a, skills_b, inferred_a, inferred_b
    ))

    # 4. Experience Signal (years of experience)
    strategies.append(_strategy_experience(text_a, text_b))

    # 5. Keyword Density (how densely packed the resume is with relevant terms)
    strategies.append(_strategy_keyword_density(tokens_a, tokens_b, text_a, text_b))

    # 6. Term Specificity (rare/unique terms that stand out)
    strategies.append(_strategy_term_specificity(tokens_a, tokens_b))

    return strategies


def _strategy_semantic_depth(
    tokens_a: Counter[str],
    tokens_b: Counter[str],
    skills_a: list[str],
    skills_b: list[str],
    text_a: str,
    text_b: str,
) -> dict:
    """
    Semantic Depth: measures conceptual alignment beyond keywords.
    Uses the overlap of important terms and skill relevance frequency.
    """
    important_a = set(important_terms(text_a, limit=30))
    important_b = set(important_terms(text_b, limit=30))

    if not important_a and not important_b:
        return _tie_result("semantic_depth", "Semantic Depth", "tie",
                           "Insufficient text for semantic analysis.", {})

    overlap_ratio = len(important_a & important_b) / max(len(important_a | important_b), 1)

    # Boost if one has more relevant skill mentions
    mentions_a = sum(1 for s in skills_a if s.lower() in text_a.lower())
    mentions_b = sum(1 for s in skills_b if s.lower() in text_b.lower())

    score_a = overlap_ratio + (mentions_a / max(mentions_a + mentions_b, 1)) * 0.2
    score_b = overlap_ratio + (mentions_b / max(mentions_a + mentions_b, 1)) * 0.2

    if abs(score_a - score_b) < 0.05:
        winner: str = "tie"
    else:
        winner = "a" if score_a > score_b else "b"

    detail = {
        "overlap_ratio": round(overlap_ratio * 100, 1),
        "skill_mentions_a": mentions_a,
        "skill_mentions_b": mentions_b,
    }

    return _tie_result(
        "semantic_depth", "Semantic Depth Score", winner,
        "Semantic embeddings measure conceptual alignment beyond keyword overlap. "
        "Higher term overlap and more frequent skill mentions indicate deeper domain understanding.",
        detail,
    )


def _strategy_skill_depth(
    skills_a: list[str],
    skills_b: list[str],
    inferred_a: list[str],
    inferred_b: list[str],
) -> dict:
    """
    Skill Depth Ratio: total skills (direct + inferred) as a measure of expertise.
    """
    total_a = len(set(skills_a)) + len(set(inferred_a))
    total_b = len(set(skills_b)) + len(set(inferred_b))

    if total_a == 0 and total_b == 0:
        return _tie_result("skill_depth", "Skill Depth Ratio", "tie",
                           "No skills detected.", {})

    if total_a == total_b:
        winner = "tie"
    else:
        winner = "a" if total_a > total_b else "b"

    detail = {
        "direct_skills_a": len(set(skills_a)),
        "direct_skills_b": len(set(skills_b)),
        "inferred_skills_a": len(set(inferred_a)),
        "inferred_skills_b": len(set(inferred_b)),
        "total_a": total_a,
        "total_b": total_b,
    }

    return _tie_result(
        "skill_depth", "Skill Depth Ratio", winner,
        "Total skill count (directly matched + inferred) reflects depth of expertise. "
        "More skills suggest broader and deeper qualifications.",
        detail,
    )


def _strategy_breadth(
    skills_a: list[str],
    skills_b: list[str],
    inferred_a: list[str],
    inferred_b: list[str],
) -> dict:
    """
    Breadth vs Specialization: broader skill coverage (unique categories).
    """
    categories_a = set()
    categories_b = set()

    # Categorize skills into high-level domains
    category_map = {
        "python": "Languages",
        "java": "Languages",
        "javascript": "Languages",
        "typescript": "Languages",
        "go": "Languages",
        "rust": "Languages",
        "c#": "Languages",
        "c++": "Languages",
        "sql": "Languages",
        "react": "Frontend",
        "next.js": "Frontend",
        "tailwind": "Frontend",
        "html/css": "Frontend",
        "fastapi": "Backend",
        "django": "Backend",
        "flask": "Backend",
        "node.js": "Backend",
        "rest api": "Backend",
        "graphql": "Backend",
        "docker": "DevOps",
        "kubernetes": "DevOps",
        "aws": "DevOps",
        "gcp": "DevOps",
        "azure": "DevOps",
        "ci/cd": "DevOps",
        "linux": "DevOps",
        "git": "DevOps",
        "machine learning": "AI/ML",
        "nlp": "AI/ML",
        "bert": "AI/ML",
        "llm": "AI/ML",
        "rag": "AI/ML",
        "pytorch": "AI/ML",
        "tensorflow": "AI/ML",
        "postgresql": "Databases",
        "mysql": "Databases",
        "mongodb": "Databases",
        "redis": "Databases",
        "elasticsearch": "Databases",
        "kafka": "Databases",
    }

    for skill in skills_a + inferred_a:
        normalized = skill.lower().strip()
        for key, category in category_map.items():
            if key in normalized:
                categories_a.add(category)
                break

    for skill in skills_b + inferred_b:
        normalized = skill.lower().strip()
        for key, category in category_map.items():
            if key in normalized:
                categories_b.add(category)
                break

    if len(categories_a) == len(categories_b):
        winner = "tie"
    else:
        winner = "a" if len(categories_a) > len(categories_b) else "b"

    detail = {
        "categories_a": sorted(categories_a),
        "categories_b": sorted(categories_b),
        "breadth_a": len(categories_a),
        "breadth_b": len(categories_b),
    }

    return _tie_result(
        "breadth_specialization", "Breadth vs Specialization", winner,
        "Broader skill coverage across more categories indicates versatility. "
        "Fewer but deeper categories may indicate specialization.",
        detail,
    )


def _strategy_experience(text_a: str, text_b: str) -> dict:
    """
    Experience Signal: years of relevant work experience.
    """
    years_a = extract_experience_years(text_a)
    years_b = extract_experience_years(text_b)

    if years_a is None and years_b is None:
        return _tie_result(
            "experience", "Experience Signal", "tie",
            "Experience years not available in either resume text. "
            "Upload a DOCX or PDF with structured experience data for this signal.",
            {},
        )

    if years_a is None:
        return _tie_result(
            "experience", "Experience Signal", "b",
            f"Resume B has {years_b:.0f} years of experience. "
            "Resume A did not contain extractable experience data.",
            {"years_a": None, "years_b": years_b},
        )

    if years_b is None:
        return _tie_result(
            "experience", "Experience Signal", "a",
            f"Resume A has {years_a:.0f} years of experience. "
            "Resume B did not contain extractable experience data.",
            {"years_a": years_a, "years_b": None},
        )

    if abs(years_a - years_b) < 0.5:
        winner = "tie"
    else:
        winner = "a" if years_a > years_b else "b"

    detail = {"years_a": years_a, "years_b": years_b}
    reason = (f"{'Resume A' if winner == 'a' else 'Resume B' if winner == 'b' else 'Both'} "
              f"{'has' if winner != 'tie' else 'have'} more experience "
              f"({years_a:.0f}y vs {years_b:.0f}y).") if winner != "tie" else \
              f"Both resumes have comparable experience ({years_a:.0f}y vs {years_b:.0f}y)."

    return _tie_result("experience", "Experience Signal", winner, reason, detail)


def _strategy_keyword_density(
    tokens_a: Counter[str],
    tokens_b: Counter[str],
    text_a: str,
    text_b: str,
) -> dict:
    """
    Keyword Density: density of meaningful terms relative to total text.
    A higher density suggests more focused, relevant content.
    """
    meaningful_a = sum(count for token, count in tokens_a.items() if len(token) > 2)
    meaningful_b = sum(count for token, count in tokens_b.items() if len(token) > 2)

    word_count_a = max(len(text_a.split()), 1)
    word_count_b = max(len(text_b.split()), 1)

    density_a = meaningful_a / word_count_a
    density_b = meaningful_b / word_count_b

    if abs(density_a - density_b) < 0.02:
        winner = "tie"
    else:
        winner = "a" if density_a > density_b else "b"

    detail = {
        "density_a": round(density_a * 100, 1),
        "density_b": round(density_b * 100, 1),
        "meaningful_terms_a": meaningful_a,
        "meaningful_terms_b": meaningful_b,
    }

    return _tie_result(
        "keyword_density", "Keyword Density", winner,
        "Higher keyword density means the resume contains more relevant technical terms "
        "relative to total text length, indicating more focused, job-relevant content.",
        detail,
    )


def _strategy_term_specificity(
    tokens_a: Counter[str],
    tokens_b: Counter[str],
) -> dict:
    """
    Term Specificity: rare/unique terms that differentiate a candidate.
    Terms that appear in only one resume are weighted higher.
    """
    set_a = set(tokens_a.keys())
    set_b = set(tokens_b.keys())

    only_a = set_a - set_b
    only_b = set_b - set_a

    # Weight unique terms by their frequency
    specificity_a = sum(tokens_a[t] for t in only_a)
    specificity_b = sum(tokens_b[t] for t in only_b)

    if specificity_a == specificity_b:
        winner = "tie"
    else:
        winner = "a" if specificity_a > specificity_b else "b"

    detail = {
        "unique_terms_a": len(only_a),
        "unique_terms_b": len(only_b),
        "specificity_a": specificity_a,
        "specificity_b": specificity_b,
    }

    return _tie_result(
        "term_specificity", "Term Specificity", winner,
        "Unique rare terms that appear in only one resume can differentiate candidates. "
        "More distinctive vocabulary suggests specialized or unique experience.",
        detail,
    )


def _tie_result(
    strategy: str,
    label: str,
    winner: str,
    reason: str,
    detail: dict,
) -> dict:
    """Build a standardized tie-breaker result dict."""
    return {
        "strategy": strategy,
        "label": label,
        "winner": winner,
        "reason": reason,
        "detail": detail,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _cosine_token_similarity(
    tokens_a: Counter[str],
    tokens_b: Counter[str],
) -> float:
    """Compute cosine similarity between two token frequency vectors."""
    if not tokens_a or not tokens_b:
        return 0.0

    dot = sum(tokens_a[t] * tokens_b.get(t, 0) for t in tokens_a)
    norm_a = math.sqrt(sum(v * v for v in tokens_a.values()))
    norm_b = math.sqrt(sum(v * v for v in tokens_b.values()))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return max(0.0, min(1.0, dot / (norm_a * norm_b)))


def _generate_recommendation(
    similarity_score: float,
    skills_a: list[str],
    skills_b: list[str],
    inferred_a: list[str],
    inferred_b: list[str],
    tie_breakers: list[dict],
) -> str:
    """Generate a human-readable recommendation based on comparison results."""
    set_a = set(skills_a) | set(inferred_a)
    set_b = set(skills_b) | set(inferred_b)

    total_a = len(set_a)
    total_b = len(set_b)

    parts: list[str] = []

    if similarity_score > 0.8:
        parts.append("Both resumes are very similar in content and skill coverage.")
    elif similarity_score > 0.5:
        parts.append("The resumes share moderate similarity with some distinct skill areas.")
    else:
        parts.append("The resumes are quite different in content and skill focus.")

    # Mention tie-breaking advantage
    a_wins = sum(1 for tb in tie_breakers if tb["winner"] == "a")
    b_wins = sum(1 for tb in tie_breakers if tb["winner"] == "b")

    if a_wins > b_wins:
        parts.append(f"Resume A leads in {a_wins} of {len(tie_breakers)} tie-breaker categories.")
    elif b_wins > a_wins:
        parts.append(f"Resume B leads in {b_wins} of {len(tie_breakers)} tie-breaker categories.")
    else:
        parts.append("The resumes are evenly matched across tie-breaker categories.")

    # Skill-based recommendation
    if total_a > total_b:
        parts.append("Resume A has broader skill coverage.")
    elif total_b > total_a:
        parts.append("Resume B has broader skill coverage.")

    return " ".join(parts)
