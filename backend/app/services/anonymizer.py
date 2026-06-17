from __future__ import annotations

import re
from collections import Counter

from backend.app.models import AnonymizationSummary


EMAIL_RE = re.compile(r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b")
PHONE_RE = re.compile(r"(?<!\d)(?:\+?977[-\s]?)?(?:98\d{8}|97\d{8}|01[-\s]?\d{7}|\d{7,12})(?!\d)")
URL_RE = re.compile(r"\b(?:https?://|www\.)\S+|\b(?:linkedin|github|gitlab)\.com/\S+", re.IGNORECASE)
LOCATION_RE = re.compile(
    r"\b(?:kathmandu|lalitpur|bhaktapur|pokhara|biratnagar|butwal|nepal|baneshwor|jhamsikhel|"
    r"street|road|tole|ward\s+\d+|province\s+\d+)\b",
    re.IGNORECASE,
)
GENDER_RE = re.compile(
    r"\b(?:he|him|his|she|her|hers|male|female|man|woman|boy|girl|mr|mrs|ms)\b",
    re.IGNORECASE,
)
PHOTO_RE = re.compile(r"\b(?:photo|photograph|passport size photo|profile picture)\b", re.IGNORECASE)


def anonymize_text(text: str) -> AnonymizationSummary:
    counts: Counter[str] = Counter()
    cleaned = text

    replacements = [
        ("email", EMAIL_RE, "[EMAIL]"),
        ("phone", PHONE_RE, "[PHONE]"),
        ("url", URL_RE, "[LINK]"),
        ("location", LOCATION_RE, "[LOCATION]"),
        ("gendered_language", GENDER_RE, "[PRONOUN]"),
        ("photo_reference", PHOTO_RE, "[PHOTO]"),
    ]

    for label, pattern, replacement in replacements:
        cleaned, count = pattern.subn(replacement, cleaned)
        counts[label] += count

    lines = cleaned.splitlines()
    for index, line in enumerate(lines[:8]):
        stripped = line.strip()
        if _looks_like_name_line(stripped):
            lines[index] = line.replace(stripped, "[NAME]")
            counts["name"] += 1
            break

    cleaned = "\n".join(lines)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return AnonymizationSummary(redacted_text=cleaned, replacement_counts=dict(counts))


def _looks_like_name_line(line: str) -> bool:
    if not line or len(line) > 60:
        return False
    lower = line.lower()
    blocked = {
        "resume",
        "curriculum vitae",
        "cv",
        "profile",
        "summary",
        "education",
        "experience",
        "skills",
    }
    if lower in blocked or any(char.isdigit() for char in line):
        return False
    words = [word for word in re.split(r"\s+", line) if word]
    if not 2 <= len(words) <= 4:
        return False
    return all(re.match(r"^[A-Z][a-zA-Z.'-]+$", word) for word in words)
