from __future__ import annotations

import re

from backend.app.models import BiasAudit, BiasFinding


BIAS_TERMS: dict[str, tuple[str, str, str]] = {
    "rockstar": ("masculine-coded language", "medium", "Use skill-specific wording such as high-performing developer."),
    "ninja": ("masculine-coded language", "medium", "Use role-specific wording such as software engineer."),
    "guru": ("masculine-coded language", "medium", "Use expert or specialist only when seniority requires it."),
    "aggressive": ("masculine-coded language", "medium", "Use proactive or results-oriented."),
    "dominant": ("masculine-coded language", "high", "Use collaborative leadership wording."),
    "young": ("age-coded language", "high", "Remove age references and describe experience level."),
    "fresh graduate only": ("age-coded language", "high", "Allow equivalent skills or experience."),
    "native english": ("nationality-coded language", "high", "Use professional English proficiency."),
    "he": ("gendered pronoun", "medium", "Use they or the candidate."),
    "she": ("gendered pronoun", "medium", "Use they or the candidate."),
    "his": ("gendered pronoun", "medium", "Use their."),
    "her": ("gendered pronoun", "medium", "Use their."),
    "male": ("gender restriction", "high", "Remove gender restrictions."),
    "female": ("gender restriction", "high", "Remove gender restrictions."),
    "unmarried": ("marital-status restriction", "high", "Remove marital-status requirements."),
    "married": ("marital-status restriction", "high", "Remove marital-status requirements."),
    "able-bodied": ("disability-coded language", "high", "Describe the essential job activity and accommodations."),
}


def audit_job_description(text: str) -> BiasAudit:
    findings: list[BiasFinding] = []
    lowered = text.lower()
    for term, (category, severity, suggestion) in BIAS_TERMS.items():
        pattern = rf"(?<![a-z]){re.escape(term)}(?![a-z])"
        if re.search(pattern, lowered):
            findings.append(
                BiasFinding(
                    term=term,
                    category=category,
                    severity=severity,
                    suggestion=suggestion,
                )
            )

    penalty = sum(18 if item.severity == "high" else 10 for item in findings)
    score = max(0, 100 - penalty)
    return BiasAudit(score=score, findings=findings)
