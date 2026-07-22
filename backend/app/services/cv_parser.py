"""Robust CV Text Parser.

Parses unstructured CV text (from PDF/DOCX extraction) into structured
sections. Handles various heading styles, bullet formats, and layouts
commonly found in real-world resumes.
"""

from __future__ import annotations

import re
from typing import Any


# ---------------------------------------------------------------------------
# Section detection patterns (handles many heading variations)
# ---------------------------------------------------------------------------

SECTION_PATTERNS: dict[str, re.Pattern] = {
    "summary": re.compile(
        r"^(?:(?:professional|executive|career)\s+)?(?:summary|profile|objective|career\s+objective|about\s+me|personal\s+statement)s?$",
        re.IGNORECASE,
    ),
    "experience": re.compile(
        r"^(?:professional\s+|work\s+)?(?:experience|employment|work\s+history|career\s+history|job\s+history)s?$",
        re.IGNORECASE,
    ),
    "education": re.compile(
        r"^(?:education|academic\s+(?:background|qualifications?)|qualifications?)(?:\s+(?:&|and)\s+\w+)?$",
        re.IGNORECASE,
    ),
    "skills": re.compile(
        r"^(?:technical\s+|core\s+|key\s+|professional\s+)?(?:skills|competenc(?:ies|y)|expertise|technologies|tech\s+stack)(?:\s+(?:&|and)\s+\w+)?$",
        re.IGNORECASE,
    ),
    "projects": re.compile(
        r"^(?:personal\s+|academic\s+|key\s+|notable\s+)?projects?(?:\s+experience)?$",
        re.IGNORECASE,
    ),
    "certifications": re.compile(
        r"^(?:certifications?|certificates?|licenses?|professional\s+certifications?|training)$",
        re.IGNORECASE,
    ),
    "languages": re.compile(r"^languages?(?:\s+proficiency)?$", re.IGNORECASE),
    "publications": re.compile(r"^(?:publications?|research\s+papers?|papers?|presentations?|conference\s+presentations?)$", re.IGNORECASE),
    "research": re.compile(r"^(?:research|research\s+experience|research\s+interests?)$", re.IGNORECASE),
    "achievements": re.compile(
        r"^(?:achievements?|awards?|honors?|recognition|accomplishments?|selected\s+achievements?)$", re.IGNORECASE
    ),
    "volunteering": re.compile(
        r"^(?:volunteering|volunteer(?:ing)?\s+(?:experience|work)|community\s+(?:service|involvement)|extracurricular(?:\s+activities?)?)$",
        re.IGNORECASE,
    ),
    "leadership": re.compile(r"^(?:leadership|leadership\s+experience|activities?)$", re.IGNORECASE),
    "interests": re.compile(r"^(?:interests?|hobbies)$", re.IGNORECASE),
    "affiliations": re.compile(r"^(?:professional\s+affiliations?|memberships?|associations?)$", re.IGNORECASE),
    "references": re.compile(r"^references?|referees?$", re.IGNORECASE),
    "additional": re.compile(r"^(?:additional\s+information|other\s+information|extra\s+curricular)$", re.IGNORECASE),
}


def _is_section_heading(line: str) -> str | None:
    """Return section type if line is a heading, else None."""
    cleaned = line.strip().rstrip(":").rstrip("-").rstrip("_").strip()
    # Remove common decoration chars
    cleaned = re.sub(r"^[=\-_*#]+\s*", "", cleaned)
    cleaned = re.sub(r"\s*[=\-_*#]+$", "", cleaned)
    cleaned = cleaned.strip()

    if len(cleaned) > 50 or len(cleaned) < 3:
        return None

    # Headings are usually short (1-5 words)
    word_count = len(cleaned.split())
    if word_count > 6:
        return None

    # Check against patterns
    for section_type, pattern in SECTION_PATTERNS.items():
        if pattern.match(cleaned):
            return section_type

    # Also try with common prefixes/suffixes stripped
    cleaned_lower = cleaned.lower().strip()
    # Direct common heading matches
    direct_matches = {
        "experience": ["experience", "work experience", "professional experience", "employment history", "work history", "career"],
        "education": ["education", "academic", "academics", "qualifications", "education & training"],
        "skills": ["skills", "technical skills", "core skills", "key skills", "competencies", "technologies", "tech stack", "tools & technologies"],
        "projects": ["projects", "personal projects", "key projects", "notable projects", "academic projects"],
        "summary": ["summary", "profile", "about me", "objective", "professional summary", "executive summary", "career summary", "career objective"],
        "certifications": ["certifications", "certificates", "training", "courses"],
        "languages": ["languages"],
        "achievements": ["achievements", "awards", "honors"],
        "interests": ["interests", "hobbies"],
        "references": ["references"],
    }
    for section_type, headings in direct_matches.items():
        if cleaned_lower in headings:
            return section_type

    return None


def _generic_heading(line: str) -> str | None:
    """Recognize common all-caps/title-case headings not in the alias list."""
    cleaned = line.strip().rstrip(":_-–—").strip()
    cleaned = re.sub(r"^[=*_#\-]+\s*|\s*[=*_#\-]+$", "", cleaned).strip()
    if not cleaned or len(cleaned) > 50 or len(cleaned.split()) > 6:
        return None
    if re.search(r"(?:@|https?://|\d{4}|[.!?,|/:])", cleaned):
        return None
    words = cleaned.split()
    if len(words) < 2:
        return None
    stop_words = {"a", "an", "and", "as", "at", "for", "from", "in", "of", "on", "or", "the", "to", "with"}
    if sum(word.lower() in stop_words for word in words) >= 2:
        return None
    is_all_caps = cleaned == cleaned.upper() and any(char.isalpha() for char in cleaned)
    is_title_case = all(word[:1].isupper() or word.lower() in {"and", "of", "&", "the"} for word in words)
    if not (is_all_caps or is_title_case):
        return None
    return cleaned


# PDF extraction can place headings directly after the previous sentence. The
# candidates are ordered longest-first so "Work Experience" wins over
# "Experience" when both could match.
_EMBEDDED_HEADING_LABELS = (
    "Professional Experience", "Work Experience", "Executive Summary", "Professional Summary",
    "Career Summary", "Technical Skills", "Core Skills", "Key Skills", "Certifications",
    "Achievements", "Education", "Experience", "Projects", "Skills", "Languages",
    "Leadership", "Publications", "Research", "Volunteering", "Interests", "References",
)


def _split_embedded_heading(line: str) -> tuple[str, str] | None:
    """Split ``content Heading`` when a PDF extractor lost the newline."""
    for label in sorted(_EMBEDDED_HEADING_LABELS, key=len, reverse=True):
        match = re.match(rf"^(.{{20,}}?)\s+({re.escape(label)})\s*$", line, re.IGNORECASE)
        if match and _is_section_heading(match.group(2)):
            return match.group(1).strip(), match.group(2).strip()
    return None


def _split_heading_with_content(line: str) -> tuple[str, str] | None:
    """Split ``Heading: content`` or ``Heading content`` into two parts."""
    for label in sorted(_EMBEDDED_HEADING_LABELS, key=len, reverse=True):
        match = re.match(rf"^({re.escape(label)})(?:\s*:\s*|\s+)(.+)$", line, re.IGNORECASE)
        if match and _is_section_heading(match.group(1)):
            return match.group(1).strip(), match.group(2).strip()
    return None


def _is_bullet(line: str) -> bool:
    """Return whether a line starts with a common resume bullet marker."""
    stripped = line.strip()
    if stripped in {"-", "•", "●", "–", "▪", "*", "◦", "►", "➤", "✓"}:
        return True
    return bool(re.match(r"^[-•●–▪*◦►➤✓]\s|^\d+[.)]\s|^[a-z]\)\s", stripped, re.IGNORECASE))


def _strip_bullet(line: str) -> str:
    """Remove bullet marker from start of line."""
    return re.sub(r"^[-•●–▪*◦►➤✓]\s*|^\d+[.)]\s*|^[a-z]\)\s*", "", line).strip()


_RECOVERY_HEADING_LABELS = (
    "Executive Summary", "Professional Summary", "Career Summary", "Summary",
    "Technical Skills", "Core Skills", "Key Skills", "Skills",
    "Professional Experience", "Work Experience", "Experience", "Projects",
    "Certifications", "Education",
)
_RECOVERY_ORDER = {
    "summary": 0,
    "skills": 1,
    "experience": 2,
    "projects": 3,
    "certifications": 4,
    "education": 5,
}


def _recover_flattened_sections(text: str) -> dict[str, list[str]] | None:
    """Recover ordered CV sections when PDF extraction flattens line breaks.

    Some PDF text layers return one long stream while preserving heading case.
    Restricting recovery to title-case/all-caps heading tokens prevents ordinary
    prose such as ``experience`` from becoming a section boundary.
    """
    heading_pattern = re.compile(
        r"(?<![A-Za-z])(" + "|".join(re.escape(label) for label in sorted(_RECOVERY_HEADING_LABELS, key=len, reverse=True)) + r")(?![A-Za-z])"
    )
    matches = []
    for match in heading_pattern.finditer(text):
        raw = match.group(1).strip()
        if not (raw == raw.upper() or raw.istitle()):
            continue
        section_type = _is_section_heading(raw)
        if section_type not in _RECOVERY_ORDER:
            continue
        if section_type == "education" and re.match(r"\s+Foundation\b", text[match.end():], re.IGNORECASE):
            continue
        matches.append((match.start(), match.end(), section_type))

    # Institution names can contain a title-cased section word (for example,
    # ``Lord Buddha Education Foundation``). Use the final Education token,
    # which is the actual section boundary in a normal CV.
    education_matches = [item for item in matches if item[2] == "education"]
    if len(education_matches) > 1:
        final_education = education_matches[-1]
        matches = [item for item in matches if item[2] != "education"] + [final_education]
        matches.sort(key=lambda item: item[0])

    # Only use this fallback when the stream contains a credible ordered CV
    # sequence; otherwise the normal parser is better for unusual layouts.
    accepted: list[tuple[int, int, str]] = []
    last_order = -1
    seen: set[str] = set()
    for start, end, section_type in matches:
        order = _RECOVERY_ORDER[section_type]
        if section_type in seen or order < last_order:
            continue
        accepted.append((start, end, section_type))
        seen.add(section_type)
        last_order = order

    if len(accepted) < 3 or "skills" not in seen or "experience" not in seen:
        return None

    sections: dict[str, list[str]] = {"header": []}
    first_start = accepted[0][0]
    header = text[:first_start].strip()
    if header:
        sections["header"] = [header]

    for index, (start, end, section_type) in enumerate(accepted):
        next_start = accepted[index + 1][0] if index + 1 < len(accepted) else len(text)
        content = text[end:next_start].strip()
        if not content:
            continue
        # Restore bullets even when the extractor returned one paragraph.
        content = re.sub(r"\s*[•●▪◦➤✓]\s*", "\n- ", content)

        # PDF text layers can flatten not only section headings, but also
        # adjacent records inside a section. Recover the boundaries before the
        # structured parsers see the text so company/project names are not
        # swallowed as the preceding bullet's description.
        if section_type == "skills":
            # Category labels are the reliable delimiters in a one-line skills
            # stream (for example, ``OS: Linux ... Cloud: AWS ...``). Keep
            # the vocabulary broad, but do not let ordinary value words such
            # as ``Windows Server`` become a fake category.
            skill_labels = (
                "OS", "Operating Systems", "Containerization", "CI/CD", "IaC",
                "Infrastructure as Code", "Monitoring", "Cloud", "Databases",
                "Languages", "Tools", "Frameworks", "Libraries", "Platforms",
            )
            label_pattern = "|".join(re.escape(label) for label in skill_labels)
            content = re.sub(
                rf"\s+(?=(?:{label_pattern})\s*:\s)",
                "\n",
                content,
                flags=re.IGNORECASE,
            )
        elif section_type == "experience":
            date_range = r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4}|\d{4}"
            content = re.sub(
                rf"(?<=\.)\s+(?=[A-Z][A-Za-z0-9&.,'()]+(?:\s+[A-Za-z0-9&.,'()]+){{1,8}}\s+[—–-]\s+[^.\n]{{1,90}}\s+(?:{date_range})\s*[-–—to]+)",
                "\n",
                content,
                flags=re.IGNORECASE,
            )
            content = re.sub(
                rf"(?<=\.)\s+(?=[A-Z][^.\n]{2,120}?\s+(?:{date_range})\s*[-–—]\s*(?:{date_range}))",
                "\n",
                content,
                flags=re.IGNORECASE,
            )
        elif section_type == "projects":
            # Project titles in the supplied CV use ``Title — description``.
            # Split a following title after the previous description sentence.
            content = re.sub(
                r"(?<=\.)\s+(?=[A-Za-z][^.\n—–-]{1,70}\s+[—–-]\s+)",
                "\n",
                content,
            )
            content = re.sub(
                r"\s+(?=gocools\s+(?:learn|write|arch)\s*:)",
                "\n",
                content,
                flags=re.IGNORECASE,
            )
        elif section_type == "certifications":
            content = re.sub(
                r"(?<=\d{4})\s+(?=[A-Z][A-Za-z0-9&+ .-]{2,80}\s+[—–-]\s+)",
                "\n",
                content,
            )
        elif section_type == "education":
            # Keep institution-first education intact while exposing the
            # degree line and its year to the education parser.
            content = re.sub(
                r"\s+(?=(?:Bachelor(?:s)?|Master(?:s)?|B\.?[A-Z]|M\.?[A-Z]|MBA|Ph\.?D|Diploma)\b)",
                "\n",
                content,
                flags=re.IGNORECASE,
            )

        content = re.sub(r"\s*\n\s*", "\n", content)
        sections.setdefault(section_type, []).extend(line.strip() for line in content.split("\n") if line.strip())

    return sections


def _has_date_range(line: str) -> bool:
    """Check if line contains a date range like 'Jan 2020 - Present'."""
    return bool(re.search(
        r"(?:\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4}|\b\d{4})\s*[-–—to]+\s*(?:Present|Current|Now|\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4})",
        line, re.IGNORECASE
    ))


def _extract_dates(line: str) -> tuple[str, str]:
    """Extract start and end dates from a line."""
    m = re.search(
        r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4}|\d{4})\s*[-–—to]+\s*(Present|Current|Now|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4}|\d{4})",
        line, re.IGNORECASE,
    )
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return "", ""


# ---------------------------------------------------------------------------
# Main parser
# ---------------------------------------------------------------------------

def parse_cv_text(text: str) -> dict[str, Any]:
    """Parse raw CV text into a structured dict suitable for the CV generator.

    Returns a dict with keys: contact, summary, experience, education, skills,
    projects, certifications, languages, interests.
    """
    # Preprocess: normalize excessive whitespace (common in PDF extraction)
    import re as _re
    text = _re.sub(r"  +", " ", text)  # Collapse multiple spaces

    # Handle single-line or few-line PDF extraction:
    # Split the text at section boundaries using known section names
    raw_lines = text.split("\n")
    non_empty = [l.strip() for l in raw_lines if l.strip()]
    # Recover before the legacy single-line splitter. The legacy splitter can
    # incorrectly split legitimate names such as "Education Foundation".
    recovered_sections = _recover_flattened_sections(text)
    if recovered_sections is None and len(non_empty) < 10 and len(text) > 400:
        # This is likely a single-blob extraction — do aggressive splitting
        # 1. Insert newlines before section keywords (must be standalone words)
        section_re = r"\b(Summary|Skills|Technical Skills|Experience|Work Experience|Projects|Certifications|Education|Languages|Achievements)\b"
        text = _re.sub(r"\s+(" + section_re + r")", r"\n\1", text, flags=_re.IGNORECASE)
        # 2. Insert newlines before bullet markers
        text = _re.sub(r"\s*(●|•|–)\s*", r"\n● ", text)
        # 3. Split bullets that contain a new entry (company + date on same line)
        # e.g., "● Built CI/CD. Fusemachines - MLOps May 2025 - Dec 2025"
        text = _re.sub(
            r"(\.\s+)([A-Z][\w]*(?:\s+[\w/&+]*)*\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})",
            r"\1\n\2", text, flags=_re.IGNORECASE,
        )
        # 4. Also split before standalone date-range entries
        text = _re.sub(
            r"\s+([\w][\w\s/&+()-]*?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}\s*[-–]\s*(?:Present|Current|\w+\s+\d{4}))",
            r"\n\1", text, flags=_re.IGNORECASE,
        )

    lines = text.split("\n")

    # Step 1: Split into sections
    sections: dict[str, list[str]] = recovered_sections or {"header": []}
    current_section = "header"

    for line in lines:
        if recovered_sections is not None:
            break
        stripped = line.strip()
        if not stripped:
            continue

        # PDF text extraction sometimes appends the next heading to the
        # previous line, e.g. ``Cloud: AWS ... Experience``.
        embedded = _split_embedded_heading(stripped)
        if embedded and current_section not in {"header", "summary"}:
            content_before_heading, heading_text = embedded
            current_section_values = sections.setdefault(current_section, [])
            if content_before_heading:
                current_section_values.append(content_before_heading)
            current_section = _is_section_heading(heading_text) or current_section
            sections.setdefault(current_section, [])
            continue

        # Check if the ENTIRE line is a section heading
        detected = _is_section_heading(stripped)
        handled = False

        # If a heading and its first content share a line, split them before
        # parsing. This handles extraction from tightly packed PDF layouts.
        if not detected:
            heading_with_content = _split_heading_with_content(stripped)
            if heading_with_content:
                heading_text, remainder = heading_with_content
                detected = _is_section_heading(heading_text)
                if detected:
                    current_section = detected
                    sections.setdefault(current_section, []).append(remainder)
                    handled = True

        # If not, check if the line STARTS with a section keyword
        if not detected and not handled:
            first_word = stripped.split()[0].rstrip(":")
            for stype, pattern in SECTION_PATTERNS.items():
                if pattern.match(first_word):
                    detected = stype
                    # Everything after the keyword is content for this section
                    remainder = stripped[len(first_word):].strip().lstrip(":")
                    if remainder:
                        current_section = detected
                        if current_section not in sections:
                            sections[current_section] = []
                        sections[current_section].append(remainder)
                        handled = True
                        detected = None
        # Generic headings preserve sections such as publications, research,
        # memberships, or other domain-specific headings not in the alias map.
        if not detected and not handled and current_section != "header" and sections.get(current_section):
            generic_heading = _generic_heading(stripped)
            if generic_heading:
                current_section = generic_heading
                sections.setdefault(current_section, [])
                handled = True

        if handled:
            continue
        elif detected:
            current_section = detected
            if current_section not in sections:
                sections[current_section] = []
        else:
            sections.setdefault(current_section, []).append(stripped)

    # If everything ended up in "header" (no sections detected), use heuristic splitting
    non_header_sections = [k for k in sections if k != "header"]
    if not non_header_sections or (len(sections.get("header", [])) > 20 and len(non_header_sections) < 2):
        sections = _heuristic_split(sections.get("header", []) + [l for s in non_header_sections for l in sections.get(s, [])])

    # Step 2: Extract contact info from header
    header_lines = sections.get("header", [])
    contact = _parse_contact(header_lines)

    # Step 3: Parse each section
    summary = _parse_summary(sections.get("summary", []), header_lines)
    experience = _parse_experience(sections.get("experience", []))
    education = _parse_education(sections.get("education", []))
    skills = _parse_skills(sections.get("skills", []))
    projects = _parse_projects(sections.get("projects", []))
    certifications = _parse_certifications(sections.get("certifications", []))
    languages = _parse_list_section(sections.get("languages", []))
    interests = _parse_list_section(sections.get("interests", []))

    structured_sections = {
        "header", "summary", "experience", "education", "skills", "projects",
        "certifications", "languages", "interests",
    }
    custom_sections: dict[str, list[str]] = {}
    for heading, values in sections.items():
        if heading in structured_sections or not values:
            continue
        items = []
        for value in values:
            cleaned = _strip_bullet(value) if _is_bullet(value) else value.strip()
            if cleaned:
                items.append(cleaned)
        if items:
            label = heading.replace("_", " ").strip().title()
            custom_sections[label or "Additional Information"] = items

    return {
        "contact": contact,
        "summary": summary,
        "experience": experience,
        "education": education,
        "skills": skills,
        "projects": projects,
        "certifications": certifications,
        "languages": languages,
        "interests": interests,
        "custom_sections": custom_sections,
    }


def _heuristic_split(all_lines: list[str]) -> dict[str, list[str]]:
    """When no section headings are found, split by content patterns.

    Multi-pass approach:
    1. First identify contact/header lines (top)
    2. Find experience entries (lines with date ranges + their bullets)
    3. Find education entries (lines with degree keywords)
    4. Find skill lines (comma/space separated tech terms)
    5. Find project entries (lines with tech in brackets)
    6. Everything else is summary or uncategorized
    """
    sections: dict[str, list[str]] = {"header": [], "experience": [], "education": [], "skills": [], "projects": [], "summary": []}

    date_pattern = re.compile(
        r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4}\s*[-–—]\s*(?:Present|Current|Now|\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))",
        re.IGNORECASE,
    )
    degree_keywords = re.compile(
        r"\b(?:B\.?Sc|B\.?A|M\.?Sc|M\.?A|MBA|Ph\.?D|Bachelors?|Masters?|Diploma|BCA|MCA|B\.?Tech|M\.?Tech|B\.?E|M\.?E|BSc|MSc)\b",
        re.IGNORECASE,
    )
    project_bracket = re.compile(r"\[.+\]|\(.+\)")

    # Track which lines belong to which section
    line_labels: list[str] = ["unknown"] * len(all_lines)

    # Pass 1: Header (first few lines with contact info)
    header_end = 0
    for i, line in enumerate(all_lines[:6]):
        stripped = line.strip()
        if "@" in stripped or re.search(r"\+?\d[\d\s\-()]{7,}", stripped) or "linkedin" in stripped.lower():
            line_labels[i] = "header"
            header_end = i + 1
        elif i < 2:
            line_labels[i] = "header"
            header_end = i + 1
        else:
            break

    # Pass 2: Find experience entries (date ranges)
    i = header_end
    while i < len(all_lines):
        stripped = all_lines[i].strip()
        if date_pattern.search(stripped):
            line_labels[i] = "experience"
            # Following bullets belong to this experience
            j = i + 1
            while j < len(all_lines):
                next_line = all_lines[j].strip()
                if not next_line:
                    j += 1
                    continue
                if _is_bullet(next_line):
                    line_labels[j] = "experience"
                    j += 1
                elif date_pattern.search(next_line):
                    break  # Next experience entry
                elif degree_keywords.search(next_line) or project_bracket.search(next_line):
                    break  # Different section
                else:
                    # Could be company name on next line
                    if j == i + 1 and len(next_line.split()) <= 6:
                        line_labels[j] = "experience"
                        j += 1
                    else:
                        break
            i = j
        else:
            i += 1

    # Pass 3: Education (degree keywords)
    for i, line in enumerate(all_lines):
        if line_labels[i] != "unknown":
            continue
        stripped = line.strip()
        if degree_keywords.search(stripped):
            line_labels[i] = "education"
            # Following lines until next pattern
            j = i + 1
            while j < len(all_lines) and line_labels[j] == "unknown":
                next_line = all_lines[j].strip()
                if not next_line:
                    j += 1
                    continue
                if _is_bullet(next_line) or ("gpa" in next_line.lower()) or ("cgpa" in next_line.lower()):
                    line_labels[j] = "education"
                    j += 1
                elif len(next_line.split()) <= 5 and not re.search(r"[,|/]", next_line):
                    line_labels[j] = "education"
                    j += 1
                else:
                    break

    # Pass 4: Projects (brackets with tech)
    for i, line in enumerate(all_lines):
        if line_labels[i] != "unknown":
            continue
        stripped = line.strip()
        if project_bracket.search(stripped) and len(stripped) < 80:
            line_labels[i] = "projects"
            j = i + 1
            while j < len(all_lines) and line_labels[j] == "unknown":
                next_line = all_lines[j].strip()
                if _is_bullet(next_line):
                    line_labels[j] = "projects"
                    j += 1
                else:
                    break

    # Pass 5: Skills (remaining lines that look like tech lists)
    for i, line in enumerate(all_lines):
        if line_labels[i] != "unknown":
            continue
        stripped = line.strip()
        if not stripped or len(stripped) < 10:
            continue
        # Check if it's a sentence (has common English words = NOT a skill list)
        lower = stripped.lower()
        sentence_indicators = [" with ", " the ", " for ", " in ", " to ", " a ", " an ", " of ", " is ", " was ", " are ", " has ", " have ", " and "]
        is_sentence = sum(1 for w in sentence_indicators if w in lower) >= 2

        # Comma-separated tech (3+ items) — but not sentences
        if not is_sentence and len(stripped.split(",")) >= 3:
            line_labels[i] = "skills"
            continue
        # Category: items pattern
        if ":" in stripped and len(stripped.split(",")) >= 2:
            line_labels[i] = "skills"
            continue
        # Space-separated capitalized words (tech names) — need 4+ words, all short
        words = stripped.split()
        if not is_sentence and len(words) >= 4 and len(words) <= 10 and all(len(w) <= 15 for w in words):
            # Must not look like a sentence (no common verbs/prepositions)
            sentence_words = {"with", "the", "and", "for", "in", "to", "a", "an", "of", "is", "was", "are", "has", "have", "experience", "developer", "engineer"}
            has_sentence_words = any(w.lower() in sentence_words for w in words)
            if not has_sentence_words:
                caps = sum(1 for w in words if w[0].isupper())
                if caps >= len(words) * 0.8:
                    line_labels[i] = "skills"
                    continue

    # Pass 6: Summary (long unknown lines near the top, after header)
    for i, line in enumerate(all_lines):
        if line_labels[i] != "unknown":
            continue
        stripped = line.strip()
        if i >= header_end and i < 8 and len(stripped) > 40 and "@" not in stripped:
            line_labels[i] = "summary"

    # Build sections from labels
    for i, line in enumerate(all_lines):
        stripped = line.strip()
        if not stripped:
            continue
        label = line_labels[i]
        if label == "unknown":
            continue
        sections.setdefault(label, []).append(stripped)

    # Clean up empty sections
    return {k: v for k, v in sections.items() if v}


def _parse_contact(header_lines: list[str]) -> dict[str, str]:
    """Extract contact info from header lines."""
    name = ""
    email = ""
    phone = ""
    location = ""
    title = ""
    linkedin = ""
    website = ""

    for i, line in enumerate(header_lines[:15]):
        # Email
        if not email:
            m = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", line)
            if m:
                email = m.group(0)

        # Phone
        if not phone:
            m = re.search(r"(?:\+?\d[\d\s\-()]{7,14}\d)", line)
            if m:
                phone = m.group(0).strip()

        # LinkedIn
        if not linkedin and "linkedin" in line.lower():
            m = re.search(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[\w-]+", line, re.IGNORECASE)
            if m:
                linkedin = m.group(0)

        # Website
        if not website and "linkedin" not in line.lower():
            m = re.search(r"https?://[\w.-]+(?:/[\w./-]*)?", line)
            if m:
                website = m.group(0)

        # Name: first line that's not a contact detail
        if not name and i < 3:
            if "@" not in line and not re.search(r"https?://", line) and not re.match(r"^\+?\d[\d\s\-()]+$", line):
                if len(line) < 50 and not re.search(r"[{}#$%^&*()=+\[\]<>]", line):
                    name = line.strip()
                    continue

        # Location (common patterns)
        if not location:
            m = re.search(r"(?:^|\||\•)\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?(?:,\s*[A-Z][a-zA-Z\s]+)?)\s*(?:$|\||\•)", line)
            if m and not re.search(r"@|\d{4}", m.group(1)):
                loc_candidate = m.group(1).strip()
                if 3 < len(loc_candidate) < 40:
                    location = loc_candidate

    # Title: second line if it looks like a job title
    if len(header_lines) > 1 and not title:
        second = header_lines[1] if header_lines[0] == name and len(header_lines) > 1 else ""
        if second and len(second) < 60 and "@" not in second and not re.search(r"\d{5,}", second):
            title = second

    return {
        "full_name": name,
        "email": email,
        "phone": phone,
        "location": location,
        "linkedin": linkedin,
        "website": website,
        "title": title,
    }


def _parse_summary(summary_lines: list[str], header_lines: list[str]) -> str:
    """Parse a professional summary, including an unlabelled top paragraph."""
    if summary_lines:
        return " ".join(summary_lines)

    # Many polished CVs place the summary directly below the contact header
    # without a heading. Keep long prose together, but never treat contact
    # lines or a short name/title as summary text.
    summary_start = None
    for index, line in enumerate(header_lines):
        if "@" not in line and not re.search(r"https?://|^\+?\d[\d\s().-]{7,}$", line) and len(line.strip()) >= 60 and re.search(r"[.!?,]", line):
            summary_start = index
            break
    if summary_start is not None:
        candidates = []
        for line in header_lines[summary_start:]:
            if _is_section_heading(line):
                break
            if "@" not in line and not re.search(r"https?://|^\+?\d[\d\s().-]{7,}$", line):
                candidates.append(line.strip())
        if candidates:
            return " ".join(candidates)

    # Legacy fallback for a header that contains name, title, and then prose.
    for line in header_lines[2:8]:
        if len(line) > 60 and "@" not in line and not re.search(r"^\+?\d", line):
            return line
    return ""


def _parse_experience(lines: list[str]) -> list[dict]:
    """Parse experience section into structured entries."""
    # PDF extractors can join the last bullet of one role with the next dated
    # role. Normalize that boundary before interpreting bullets.
    # Split role boundaries even when PDF extraction joins lines.
    date_range = r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4}"
    embedded_role = re.compile(
        rf"(?<=\.)\s+(?=[A-Z][^.\n]{2,120}?\s+(?:{date_range})\s*[-–—]\s*(?:{date_range}|Present|Current))"
    )
    normalized: list[str] = []
    for line in lines:
        line = re.sub(
            r"(?<=\.)\s+(?=(?:Fellow|Apprentice|Intern|Trainee|Senior|Junior|Lead|Principal|Staff|Associate|Manager|Director|Head)\b)",
            "\n",
            line,
        )
        pieces = [piece for chunk in line.splitlines() for piece in embedded_role.split(chunk)]
        normalized.extend(piece.strip() for piece in pieces if piece.strip())
    lines = normalized
    entries: list[dict] = []
    current: dict | None = None

    for line in lines:
        if _is_bullet(line):
            if current:
                current["bullets"].append(_strip_bullet(line))
            continue

        has_date = _has_date_range(line)

        # New entry if: has a date range, OR short line after bullets
        if has_date or (current is not None and len(current.get("bullets", [])) > 0 and len(line.split()) <= 10 and not _is_bullet(line)):
            if has_date or (not current or current.get("bullets")):
                if current:
                    entries.append(current)
                start_date, end_date = _extract_dates(line) if has_date else ("", "")
                # Remove the date part from the line for title extraction
                title_line = re.sub(
                    r"(?:\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4}|\d{4})\s*[-–—to]+\s*(?:Present|Current|Now|\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4})",
                    "", line, flags=re.IGNORECASE,
                ).strip().rstrip("|–—-,").strip()

                parts = re.split(r"\s*[|–—]\s*", title_line, maxsplit=2)
                current = {
                    "job_title": parts[0].strip() if parts else title_line,
                    "company": parts[1].strip() if len(parts) > 1 else "",
                    "location": parts[2].strip() if len(parts) > 2 else "",
                    "start_date": start_date,
                    "end_date": end_date,
                    "bullets": [],
                }
                continue

        if current is None:
            # First line, start an entry
            parts = re.split(r"\s*[|–—]\s*", line, maxsplit=2)
            current = {
                "job_title": parts[0].strip(),
                "company": parts[1].strip() if len(parts) > 1 else "",
                "location": parts[2].strip() if len(parts) > 2 else "",
                "start_date": "",
                "end_date": "",
                "bullets": [],
            }
        elif not current.get("company"):
            # Might be company on the next line
            current["company"] = line.strip()
        else:
            # Treat as a bullet point without marker
            current["bullets"].append(line.strip())

    if current:
        entries.append(current)
    return entries


def _parse_education(lines: list[str]) -> list[dict]:
    """Parse education entries in either degree-first or institution-first order."""
    entries: list[dict] = []
    current: dict | None = None

    for line in lines:
        if _is_bullet(line):
            clean = _strip_bullet(line)
            if current and not current.get("degree") and re.search(
                r"\b(?:B\.?Sc|B\.?A|M\.?Sc|M\.?A|MBA|Ph\.?D|Bachelors?|Masters?|Diploma|BCA|MCA|B\.?Tech|M\.?Tech|B\.?E|M\.?E|BSc|MSc)\b",
                clean,
                re.IGNORECASE,
            ):
                current["degree"] = clean
            elif current and clean:
                current["details"].append(clean)
            continue

        has_date = bool(re.search(r"\d{4}", line))
        has_degree = bool(re.search(
            r"\b(?:B\.?Sc|B\.?A|M\.?Sc|M\.?A|MBA|Ph\.?D|Bachelors?|Masters?|Diploma|BCA|MCA|B\.?Tech|M\.?Tech|B\.?E|M\.?E|BSc|MSc)\b",
            line,
            re.IGNORECASE,
        ))

        # New entry. A dated institution line is valid even when the degree
        # appears as the next bullet (a common one-column CV layout).
        if current is None or (has_date and (current.get("degree") or current.get("details"))):
            if current:
                entries.append(current)
            parts = re.split(r"\s*\|\s*|\s+[–—]\s+", re.sub(
                r"(?:\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4}|\b\d{4})\s*[-–—to]+\s*(?:Present|Current|Now|\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4})",
                "",
                line,
                flags=re.IGNORECASE,
            ).strip(" |–—,"))
            start_date, end_date = _extract_dates(line) if _has_date_range(line) else ("", "")
            gpa = ""
            gpa_m = re.search(r"(?:GPA|CGPA|Grade)[:\s]*(\d+\.?\d*(?:/\d+\.?\d*)?)", line, re.IGNORECASE)
            if gpa_m:
                gpa = gpa_m.group(1)
            current = {
                "degree": parts[0].strip() if has_degree else "",
                "institution": parts[1].strip() if has_degree and len(parts) > 1 else parts[0].strip(),
                "location": parts[2].strip() if has_degree and len(parts) > 2 else (", ".join(parts[1:]).strip() if not has_degree and len(parts) > 1 else ""),
                "start_date": start_date,
                "end_date": end_date,
                "gpa": gpa,
                "details": [],
            }
            # A standalone year on a degree line conventionally represents
            # completion. Preserve it as an end year without inventing a
            # start year; the optimizer can ask for that missing year.
            if has_degree and not start_date and not end_date:
                completion_year = re.search(r"\b(19|20)\d{2}\b", line)
                if completion_year:
                    current["end_date"] = completion_year.group(0)
        elif current and not current.get("institution"):
            current["institution"] = line.strip()
        elif current and not current.get("degree") and has_degree:
            current["degree"] = line.strip()
            if not current.get("start_date") and not current.get("end_date"):
                completion_year = re.search(r"\b(19|20)\d{2}\b", line)
                if completion_year:
                    current["end_date"] = completion_year.group(0)
        elif current:
            current["details"].append(line.strip())

    if current:
        entries.append(current)
    return entries


def _split_skill_values(value: str) -> list[str]:
    """Split skill lists while preserving commas inside parentheses."""
    items: list[str] = []
    current: list[str] = []
    depth = 0
    for char in value:
        if char == "(":
            depth += 1
        elif char == ")" and depth:
            depth -= 1
        if depth == 0 and char in ",;|•/":
            item = "".join(current).strip()
            if item:
                items.append(item)
            current = []
        else:
            current.append(char)
    item = "".join(current).strip()
    if item:
        items.append(item)
    return items


def _parse_skills(lines: list[str]) -> dict[str, list[str]]:
    """Parse skills section into categorized dict."""
    skills: dict[str, list[str]] = {}

    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Remove bullet markers
        line = re.sub(r"^[-•●–▪*]\s*", "", line)

        if ":" in line:
            cat, vals = line.split(":", 1)
            items = [s.strip() for s in _split_skill_values(vals) if s.strip() and len(s.strip()) > 1]
            if items:
                skills[cat.strip()] = items
        else:
            items = [s.strip() for s in _split_skill_values(line) if s.strip() and len(s.strip()) > 1]
            if items:
                skills.setdefault("Technical Skills", []).extend(items)

    return skills


def _parse_projects(lines: list[str]) -> list[dict]:
    """Parse project entries, including CVs where project names are bullets."""
    entries: list[dict] = []
    current: dict | None = None

    def looks_like_project_title(value: str) -> bool:
        value = value.strip()
        # Project names commonly contain a colon, technology parentheses, or
        # an explicit product/repository prefix. Ordinary achievement bullets
        # should remain attached to the current project.
        return bool(
            re.search(r":", value)
            or re.search(r"\([^)]*(?:AWS|Docker|Terraform|CI/CD|API|Cloud|Python|Kubernetes)\b", value, re.IGNORECASE)
            or re.match(r"(?:gocools|github|project\b)", value, re.IGNORECASE)
        )

    def make_project(line: str) -> dict:
        bracket_match = re.search(r"\[([^\]]+)\]", line)
        paren_match = re.search(r"\((?=[^)]*(?:AWS|Docker|Terraform|CI/CD|API|Cloud|Python|Kubernetes))([^)]*)\)", line, re.IGNORECASE)
        tech_match = bracket_match or paren_match
        technologies = ""
        name = line.strip()
        description = ""
        if tech_match:
            technologies = (tech_match.group(1) or tech_match.group(2) or "").strip()
            name = line[:tech_match.start()].strip()
            description = line[tech_match.end():].strip()
        else:
            dash_match = re.search(r"\s+[—–-]\s+", line)
            if dash_match:
                name = line[:dash_match.start()].strip()
                description = line[dash_match.end():].strip()
        return {
            "name": name,
            "technologies": technologies,
            "description": description,
            "url": "",
            "bullets": [],
        }

    normalized_lines: list[str] = []
    for line in lines:
        parts = re.split(r"(?<=\.)\s+(?=gocools\s+(?:learn|write|arch)\s*:)", line, flags=re.IGNORECASE)
        normalized_lines.extend(part.strip() for part in parts if part.strip())
    lines = normalized_lines

    for line in lines:
        if _is_bullet(line):
            clean = _strip_bullet(line)
            if not clean:
                continue
            if current is None:
                current = make_project(clean)
            elif looks_like_project_title(clean):
                entries.append(current)
                current = make_project(clean)
            else:
                current["bullets"].append(clean)
            continue

        # New unbulleted project title. A flattened CV often keeps each
        # project on its own line but omits the bullet marker; the em dash
        # between title and description is a strong boundary signal.
        if current is None or (current is not None and re.search(r"\s+[—–-]\s+", line)):
            if current:
                entries.append(current)
            current = make_project(line)
        elif current and re.match(r"(?:gocools|github|project\b)", line, re.IGNORECASE):
            entries.append(current)
            current = make_project(line)
        elif current and not current.get("description") and not current.get("bullets"):
            current["description"] = line.strip()
        else:
            current["bullets"].append(line.strip())

    if current:
        entries.append(current)
    return entries


def _parse_certifications(lines: list[str]) -> list[dict]:
    """Parse certifications."""
    entries = []
    for line in lines:
        line = re.sub(r"^[-•–▪*]\s*", "", line).strip()
        if not line:
            continue
        # Try to extract date
        date = ""
        date_m = re.search(r"\b(\d{4})\b|(\w+\s+\d{4})", line)
        if date_m:
            date = (date_m.group(1) or date_m.group(2) or "").strip()
        entries.append({"name": line, "issuer": "", "date": date, "url": ""})
    return entries


def _parse_list_section(lines: list[str]) -> list[str]:
    """Parse a simple list section (languages, interests)."""
    items: list[str] = []
    for line in lines:
        line = re.sub(r"^[-•–▪*]\s*", "", line).strip()
        if not line:
            continue
        parts = [s.strip() for s in re.split(r"[,;|•]", line) if s.strip()]
        items.extend(parts)
    return items
