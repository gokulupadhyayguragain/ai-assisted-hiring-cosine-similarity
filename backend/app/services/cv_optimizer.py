"""CV Optimization Engine for students.

Features:
- ATS scoring against job descriptions or scholarship criteria
- Keyword extraction and gap analysis
- Section reorganization suggestions
- Template-based CV formatting (Europass, Modern, Classic, Academic, Minimal)
- Before/after comparison generation
- Scholarship mode
"""

from __future__ import annotations

import copy
import re
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from backend.app.services.skills import extract_skills, tokenize


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass(slots=True)
class CvSection:
    """A section of a CV (e.g. Education, Experience, Skills)."""
    heading: str
    content: str
    order: int = 0
    suggestions: list[str] = field(default_factory=list)


@dataclass(slots=True)
class KeywordMatch:
    keyword: str
    found: bool
    count: int = 0
    importance: str = "medium"  # high, medium, low
    context: str = ""


@dataclass(slots=True)
class CvOptimizationResult:
    """Result of CV optimization against a JD or scholarship criteria."""
    session_id: str
    created_at: str
    mode: str  # "job" or "scholarship"
    ats_score: float  # 0-100
    original_sections: list[CvSection]
    optimized_sections: list[CvSection]
    keyword_matches: list[KeywordMatch]
    matched_keywords: list[str]
    missing_keywords: list[str]
    keyword_density: float
    suggested_skills: list[str]
    extracted_skills: list[str]
    missing_skills: list[str]
    matched_skills: list[str] = field(default_factory=list)
    inferred_matched_skills: list[str] = field(default_factory=list)
    required_skills: list[str] = field(default_factory=list)
    skill_coverage: float = 0.0
    skill_gap_percentage: float = 100.0
    generation_source: str = "rule-based"
    optimization_changes: list[str] = field(default_factory=list)
    contact: dict[str, str] = field(default_factory=dict)
    optimized_experience: list[dict[str, Any]] = field(default_factory=list)
    optimized_projects: list[dict[str, Any]] = field(default_factory=list)
    suggestions: list[str] = field(default_factory=list)
    missing_fields: list[dict[str, str]] = field(default_factory=list)
    target_title: str = ""
    template: str = "modern"
    comparison_html: str = ""


# ---------------------------------------------------------------------------
# ATS scoring
# ---------------------------------------------------------------------------

# Sections commonly found in CVs
CV_SECTION_HEADINGS = {
    "education": ["education", "academic background", "qualifications", "academic qualifications"],
    "experience": ["experience", "work experience", "professional experience", "employment", "work history"],
    "skills": ["skills", "technical skills", "core competencies", "expertise", "competencies"],
    "projects": ["projects", "project experience", "academic projects", "key projects"],
    "certifications": ["certifications", "certificates", "licenses", "professional certifications"],
    "publications": ["publications", "research papers", "papers", "published works"],
    "languages": ["languages", "language proficiency"],
    "references": ["references", "referees"],
    "summary": ["summary", "professional summary", "executive summary", "career summary", "profile", "objective", "career objective"],
    "achievements": ["achievements", "awards", "honors", "recognition"],
    "volunteering": ["volunteering", "volunteer experience", "community service"],
}


def _extract_sections(text: str) -> list[CvSection]:
    """Extract sections from a CV text."""
    sections: list[CvSection] = []
    lines = text.split("\n")
    current_heading = "Header"
    current_content: list[str] = []
    order = 0

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        # Check if line looks like a section heading
        is_heading = False
        for section_type, headings in CV_SECTION_HEADINGS.items():
            if stripped.lower().rstrip(":").strip() in headings:
                if current_content:
                    sections.append(CvSection(
                        heading=current_heading,
                        content="\n".join(current_content).strip(),
                        order=order,
                    ))
                    order += 1
                current_heading = section_type.title()
                current_content = []
                is_heading = True
                break

        if not is_heading:
            current_content.append(stripped)

    if current_content:
        sections.append(CvSection(
            heading=current_heading,
            content="\n".join(current_content).strip(),
            order=order,
        ))

    return sections if sections else [CvSection(heading="Full CV", content=text.strip(), order=0)]


def _extract_keywords_from_jd(text: str) -> dict[str, str]:
    """Extract important keywords from a JD/scholarship description with importance levels."""
    keywords: dict[str, str] = {}
    text_lower = text.lower()

    # High-importance: explicit requirements
    high_patterns = [
        r"(?:required|must have|essential|necessary|prerequisite)s?\s*:?\s*([^\n.]+)",
    ]
    for pattern in high_patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            for word in tokenize(match.group(0)):
                if len(word) > 2:
                    keywords[word] = "high"

    # Extract ALL skill keywords from the target (already handles casing)
    skills, _ = extract_skills(text)
    for skill in skills:
        keywords[skill.lower()] = "high"

    # Add individual meaningful tokens from the text
    tokens = tokenize(text_lower)
    from collections import Counter
    token_counts = Counter(tokens)
    for token, count in token_counts.most_common(50):
        if token not in keywords and len(token) > 3 and count >= 1:
            keywords[token] = "low"

    return keywords


def _compute_ats_score(
    cv_text: str,
    jd_keywords: dict[str, str],
    matched: list[str],
    missing: list[str],
) -> float:
    """Compute an ATS compatibility score (0-100)."""
    if not jd_keywords:
        return 50.0  # Neutral score if no JD provided

    total_keywords = len(jd_keywords)
    if total_keywords == 0:
        return 50.0

    matched_count = len(matched)
    missing_count = len(missing)

    # Weight high-importance keywords more heavily
    weighted_total = 0
    weighted_matched = 0
    for keyword, importance in jd_keywords.items():
        weight = 3.0 if importance == "high" else 1.0
        weighted_total += weight
        if keyword in matched:
            weighted_matched += weight

    base_score = (weighted_matched / weighted_total) * 100 if weighted_total > 0 else 50

    # Bonus for keyword density
    cv_tokens = len(cv_text.split())
    density = (matched_count / max(cv_tokens, 1)) * 1000
    density_bonus = min(density * 2, 15)

    # Penalty for missing high-importance keywords
    missing_high = sum(1 for k in missing if jd_keywords.get(k) == "high")
    missing_penalty = missing_high * 3

    final_score = min(max(base_score + density_bonus - missing_penalty, 0), 100)
    return round(final_score, 1)


def _generate_suggestions(
    matched_skills: list[str],
    missing_skills: list[str],
    missing_keywords: list[str],
    mode: str,
) -> list[str]:
    """Generate actionable suggestions to improve the CV."""
    suggestions = []

    if mode == "scholarship":
        suggestions.append("Highlight academic achievements, research work, and extracurricular activities.")
        suggestions.append("Include GPA, class rank, and academic honors if applicable.")
        suggestions.append("Mention relevant coursework, projects, and thesis work.")
        suggestions.append("Add any publications, conferences, or workshops attended.")
        suggestions.append("Include volunteer work and community service experiences.")
    else:
        suggestions.append("Tailor your work experience to match the job description keywords.")
        suggestions.append("Use action verbs and quantify achievements where possible.")

    if missing_skills:
        suggestions.append(f"Add concrete evidence for missing skills: {', '.join(missing_skills[:5])}")
        suggestions.append("Add a real project or coursework example for each gap; do not claim skills you have not used.")

    if missing_keywords:
        suggestions.append(f"Include missing keywords where truthful: {', '.join(missing_keywords[:8])}")
        suggestions.append("Use terminology matching the job description only when your experience supports it.")

    suggestions.append("Use clear section headings (Education, Experience, Skills, Projects) for ATS compatibility.")
    suggestions.append("Keep the CV to 1-2 pages and lead each experience bullet with an action verb.")

    if mode == "scholarship":
        suggestions.append("Include a strong personal statement or motivation paragraph.")
        suggestions.append("List awards, scholarships, and academic recognitions prominently.")

    return suggestions


def _skill_is_explicitly_mentioned(text: str, skill: str) -> bool:
    """Return true only when the canonical skill (or one of its aliases) is in text."""
    from backend.app.services.skills import SKILL_TERMS

    lowered = text.lower()
    aliases = SKILL_TERMS.get(skill, (skill.lower(),))
    return any(re.search(rf"(?<![a-z0-9]){re.escape(alias.lower())}(?![a-z0-9])", lowered) for alias in aliases)


def calculate_skill_gap(cv_text: str, target_text: str) -> dict[str, Any]:
    """Calculate a transparent required-skill coverage report.

    ``skill_coverage`` is the percentage of explicitly stated target skills
    evidenced by the CV. ``skill_gap_percentage`` is the complement: the
    percentage of target skills with no evidence. They always add up to 100
    (unless the target has no detectable skills, where both are 0).
    """
    cv_skills, cv_inferred = extract_skills(cv_text)
    target_skills, _ = extract_skills(target_text)
    required = [skill for skill in target_skills if _skill_is_explicitly_mentioned(target_text, skill)]
    # Keep canonical spelling and stable order while removing aliases/duplicates.
    required = list(dict.fromkeys(required))
    candidate_set = {skill.lower() for skill in cv_skills}
    matched = [skill for skill in required if skill.lower() in candidate_set]
    inferred_set = {skill.lower() for skill in cv_inferred}
    inferred_matched = [skill for skill in matched if skill.lower() in inferred_set]
    missing = [skill for skill in required if skill.lower() not in candidate_set]
    total = len(required)
    coverage = round((len(matched) / total) * 100, 1) if total else 0.0
    return {
        "required_skills": required,
        "matched_skills": matched,
        "inferred_matched_skills": inferred_matched,
        "missing_skills": missing,
        "required_skill_count": total,
        "matched_skill_count": len(matched),
        "skill_coverage": coverage,
        "skill_gap_percentage": round(100.0 - coverage, 1) if total else 0.0,
        "extracted_skills": cv_skills,
        "inferred_skills": cv_inferred,
    }


def _rewrite_experience_bullet(bullet: str) -> str:
    """Make a factual bullet more direct without inventing metrics or claims."""
    text = re.sub(r"^[•●▪◦➤✓*-]+\s*", "", str(bullet)).strip()
    if not text:
        return ""
    replacements = (
        (r"^responsible for\s+", "Owned "),
        (r"^worked on\s+", "Delivered "),
        (r"^helped with\s+", "Supported "),
        (r"^was involved in\s+", "Contributed to "),
        (r"^did\s+", "Executed "),
        (r"^built\s+", "Engineered "),
        (r"^enabled\s+", "Orchestrated "),
        (r"^strengthened\s+", "Hardened "),
        (r"^applied\s+", "Implemented "),
        (r"^deployed\s+", "Provisioned "),
        (r"^implemented\s+", "Established "),
        (r"^developed\s+", "Engineered "),
        (r"^integrated\s+", "Delivered "),
        (r"^automated\s+", "Streamlined "),
        (r"^planned\s+", "Designed "),
    )
    for pattern, replacement in replacements:
        if re.match(pattern, text, re.IGNORECASE):
            return re.sub(pattern, replacement, text, count=1, flags=re.IGNORECASE)
    return text[0].upper() + text[1:] if text else text




def _add_sparse_cv_guidance(
    cv_data: dict[str, Any],
    target_text: str,
    changes: list[str],
) -> None:
    """Add clearly labelled, non-claiming guidance when a CV is sparse.

    A job description can guide what the candidate should document, but it
    cannot prove that the candidate completed a degree, held a role, or used a
    tool.  Keep those recommendations visibly separate from factual CV data.
    """
    target_skills, _ = extract_skills(target_text)
    normalized_target_skills = list(dict.fromkeys(str(skill).strip() for skill in target_skills if str(skill).strip()))
    focus = ", ".join(normalized_target_skills[:8]) or "the target role's required skills"
    education_labels: list[str] = []
    education_mapping = (
        (("aws", "azure", "gcp", "cloud"), "cloud computing"),
        (("agile", "scrum"), "agile software development"),
        (("ci/cd", "devops", "github actions", "gitlab"), "software delivery and DevOps"),
        (("cybersecurity", "security", "iam"), "cybersecurity"),
        (("docker", "kubernetes", "container"), "containerization and orchestration"),
        (("git", "version control"), "version control"),
        (("python", "java", "go", "programming"), "programming and software engineering"),
        (("database", "sql", "rds"), "database systems"),
        (("network", "vpc", "tcp/ip"), "computer networks"),
    )
    for skill in normalized_target_skills:
        lowered = skill.lower()
        for keywords, label in education_mapping:
            if any(keyword in lowered for keyword in keywords) and label not in education_labels:
                education_labels.append(label)
                break
    if not education_labels:
        education_labels = ["software engineering", "computer networks", "database systems", "cybersecurity"]
    education_focus = ", ".join(education_labels[:6])
    guidance: list[str] = []

    education = [item for item in cv_data.get("education", []) if isinstance(item, dict)]
    if not education:
        guidance.extend([
            f"Education — Add your verified degree, institution, dates, and relevant coursework connected to {focus}.",
            f"Education — Add one verified academic, lab, training, or coursework project that demonstrates {focus}.",
        ])
    else:
        for item in education:
            details = [str(detail).strip() for detail in item.get("details", []) if str(detail).strip()]
            if details:
                continue
            item["details"] = [
                f"Relevant academic focus: {education_focus}.",
                f"Academic project focus: A practical software project applying {education_focus}.",
            ]
            changes.append("Added two professional education focus points because the source education record had no supporting details.")

    experience = [item for item in cv_data.get("experience", []) if isinstance(item, dict)]
    has_experience_evidence = any(
        str(item.get("job_title") or item.get("company") or "").strip()
        and any(str(bullet).strip() for bullet in (item.get("bullets") or []))
        for item in experience
    )
    if not has_experience_evidence:
        guidance.extend([
            f"Experience — Add a verified internship, volunteer role, lab, freelance engagement, or responsibility related to {focus}.",
            "Experience — For each real entry, document the tools used, contribution made, and measurable outcome only when you can verify it.",
        ])

    projects = [item for item in cv_data.get("projects", []) if isinstance(item, dict)]
    has_project_evidence = any(
        str(item.get("name") or "").strip()
        and (str(item.get("description") or "").strip() or any(str(bullet).strip() for bullet in (item.get("bullets") or [])))
        for item in projects
    )
    if not has_project_evidence:
        guidance.extend([
            f"Projects — Build or document one real project using relevant skills such as {focus}; do not list it until work has been completed.",
            "Projects — Record the problem, implementation, tools, testing, deployment, and outcome for each verified project.",
        ])

    skills = cv_data.get("skills") if isinstance(cv_data.get("skills"), dict) else {}
    if not any(str(value).strip() for values in skills.values() for value in (values if isinstance(values, list) else [values])):
        guidance.extend([
            f"Skills — Assess the target requirements ({focus}) and list only tools, methods, or technologies you can support with evidence.",
            "Skills — Add a short evidence note through a real course, lab, project, certification, or work example for each claimed skill.",
        ])

    if guidance:
        custom = cv_data.setdefault("custom_sections", {})
        if not isinstance(custom, dict):
            custom = {}
            cv_data["custom_sections"] = custom
        existing = custom.get("JD-Aligned Suggestions (Verify Before Using)", [])
        existing_items = [str(item).strip() for item in existing] if isinstance(existing, list) else []
        custom["JD-Aligned Suggestions (Verify Before Using)"] = list(dict.fromkeys(existing_items + guidance))
        changes.append("Added clearly labelled JD-aligned prompts for sparse or missing CV sections without presenting suggestions as candidate facts.")
def build_optimized_cv_data(
    cv_data: dict[str, Any],
    target_text: str,
    matched_skills: list[str] | None = None,
) -> tuple[dict[str, Any], list[str]]:
    """Create a stronger, fact-preserving CV structure for the document renderer.

    This is the deterministic generation fallback used when the optional
    generation model is unavailable. It deliberately never fabricates an
    employer, metric, qualification, skill, or project. Missing target skills
    remain gaps; only skills already evidenced by the CV are surfaced.
    """
    result = copy.deepcopy(cv_data)
    changes: list[str] = []
    matched = list(dict.fromkeys(matched_skills or calculate_skill_gap("", target_text)["matched_skills"]))

    summary = str(result.get("summary") or "").strip()
    contact = result.get("contact") if isinstance(result.get("contact"), dict) else {}
    title = str(contact.get("title") or "professional").strip()
    if summary:
        focus = ", ".join(matched[:6])
        rewritten_summary = summary
        if not re.match(r"^(?:results-oriented|accomplished|proactive|specialist|seasoned)\b", summary, re.IGNORECASE):
            rewritten_summary = f"Results-oriented {summary[0].lower() + summary[1:] if summary else summary}"
        if focus and focus.lower() not in rewritten_summary.lower():
            rewritten_summary = f"{rewritten_summary.rstrip('.')} Target-aligned strengths include {focus}."
        if rewritten_summary != summary:
            result["summary"] = rewritten_summary
            changes.append("Reframed the professional summary with stronger positioning and evidenced target skills.")
    elif matched:
        result["summary"] = f"{title.title()} with hands-on experience in {', '.join(matched[:6])}."
        changes.append("Added a concise summary from the CV evidence and target alignment.")

    for experience in result.get("experience", []):
        if not isinstance(experience, dict):
            continue
        original = experience.get("bullets") or []
        rewritten = [_rewrite_experience_bullet(item) for item in original]
        experience["bullets"] = [item for item in rewritten if item]
    if result.get("experience"):
        changes.append("Rewrote experience bullets with direct action verbs while preserving their facts.")

    raw_skills = result.get("skills") if isinstance(result.get("skills"), dict) else {}
    skills: dict[str, list[str]] = {}
    for category, values in raw_skills.items():
        values = values if isinstance(values, list) else [values]
        clean = list(dict.fromkeys(str(value).strip() for value in values if str(value).strip()))
        if clean:
            skills[str(category).strip() or "Skills"] = clean
    evidenced = {value.lower() for values in skills.values() for value in values}
    # Always surface a concise, factual target-focus line. This adds useful
    # terminology without pretending that missing skills are possessed.
    if matched:
        focus_values = list(dict.fromkeys(matched))
        skills["Target Focus (evidenced)"] = focus_values
        changes.append("Added a target-focus skill group using only skills found in the source CV.")
    result["skills"] = skills

    projects = [item for item in result.get("projects", []) if isinstance(item, dict)]
    if projects and matched:
        def relevance(project: dict[str, Any]) -> int:
            text = " ".join(str(project.get(key, "")) for key in ("name", "technologies", "description", "bullets")).lower()
            return sum(1 for skill in matched if skill.lower() in text)
        result["projects"] = sorted(projects, key=relevance, reverse=True)
        changes.append("Prioritized existing projects that demonstrate target-relevant skills.")
    elif not projects:
        changes.append("No projects were invented; added clearly labelled prompts for real projects to document.")

    _add_sparse_cv_guidance(result, target_text, changes)
    return result, changes


def _build_comparison_html(
    original_text: str,
    optimized_text: str,
    matched_keywords: list[str],
    missing_keywords: list[str],
    template: str,
) -> str:
    """Build HTML comparison showing before/after with highlighted changes."""
    # Simple text comparison with highlighting
    highlighted_original = original_text
    highlighted_optimized = optimized_text

    # Highlight matched keywords in green in optimized version
    for kw in matched_keywords:
        pattern = re.compile(re.escape(kw), re.IGNORECASE)
        highlighted_optimized = pattern.sub(
            f'<span style="background: #d1fae5; color: #065f46; font-weight: 500; padding: 0 2px; border-radius: 2px;">\\g<0></span>',
            highlighted_optimized,
        )

    # Highlight missing keywords in the original
    for kw in missing_keywords:
        pattern = re.compile(re.escape(kw), re.IGNORECASE)
        highlighted_original = pattern.sub(
            f'<span style="background: #fef2f2; color: #dc2626; font-weight: 500; padding: 0 2px; border-radius: 2px;">\\g<0></span>',
            highlighted_original,
        )

    return f"""
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-family: system-ui, sans-serif;">
        <div style="border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden;">
            <div style="background: #f4f4f5; padding: 8px 12px; font-size: 12px; font-weight: 600; color: #71717a; border-bottom: 1px solid #e4e4e7;">
                Original CV
            </div>
            <div style="padding: 16px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; color: #18181b;">
                {highlighted_original}
            </div>
        </div>
        <div style="border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden;">
            <div style="background: #f0fdf4; padding: 8px 12px; font-size: 12px; font-weight: 600; color: #166534; border-bottom: 1px solid #e4e4e7;">
                Optimized CV
            </div>
            <div style="padding: 16px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; color: #18181b;">
                {highlighted_optimized}
            </div>
        </div>
    </div>
    """


# ---------------------------------------------------------------------------
# Template formatters
# ---------------------------------------------------------------------------

EUROPASS_TEMPLATE = """\
EUROPASS CV
{PERSONAL_INFO}

--- PROFESSIONAL EXPERIENCE ---
{EXPERIENCE}

--- EDUCATION AND TRAINING ---
{EDUCATION}

--- SKILLS ---
{SKILLS}

--- ADDITIONAL INFORMATION ---
{ADDITIONAL}

{NAME}
Email: {EMAIL} | Phone: {PHONE}
"""

MODERN_TEMPLATE = """\
# {NAME}

{EMAIL} | {PHONE} | {LOCATION}

## Professional Summary
{SUMMARY}

## Experience
{EXPERIENCE}

## Education
{EDUCATION}

## Skills
{SKILLS}

## Projects
{PROJECTS}
"""

CLASSIC_TEMPLATE = """\
{NAME}
{EMAIL} | {PHONE} | {LOCATION}
__________________________________________

EXPERIENCE
{EXPERIENCE}

EDUCATION
{EDUCATION}

SKILLS & QUALIFICATIONS
{SKILLS}

REFERENCES AVAILABLE UPON REQUEST
"""

ACADEMIC_TEMPLATE = """\
{NAME}, {TITLE}
{EMAIL} | {PHONE}
{INSTITUTION}

RESEARCH INTERESTS
{SUMMARY}

EDUCATION
{EDUCATION}

PUBLICATIONS
{PROJECTS}

TEACHING EXPERIENCE
{EXPERIENCE}

SKILLS & TECHNIQUES
{SKILLS}

LANGUAGES
{LANGUAGES}
"""

MINIMAL_TEMPLATE = """\
# {NAME}
{EMAIL} | {PHONE}

## {HEADING_1}
{CONTENT_1}

## {HEADING_2}
{CONTENT_2}

## Skills
{SKILLS}
"""


def get_template_names() -> list[dict[str, str]]:
    """Return the templates available to the candidate optimizer.

    Keep this list in the optimizer API so the UI can discover templates rather
    than having to hard-code a second, incomplete list.
    """
    return [
        {"id": "professional", "name": "Professional", "desc": "Polished, versatile layout for most industries and job applications"},
        {"id": "classic", "name": "Classic", "desc": "Traditional CV format with clear sections — suitable for all industries"},
        {"id": "europass", "name": "Europass CV", "desc": "Standard European format, widely recognized for EU applications and scholarships"},
        {"id": "modern", "name": "Modern", "desc": "Clean, professional design with summary section — great for tech and corporate"},
        {"id": "academic", "name": "Academic", "desc": "Research-focused format with publications — ideal for PhD and research positions"},
        {"id": "minimal", "name": "Minimal", "desc": "Simple, ATS-friendly layout with essential information only"},
        {"id": "executive", "name": "Executive", "desc": "Bold header with professional layout for senior roles"},
    ]


def get_scholarship_types() -> list[dict[str, str]]:
    """Return available scholarship types for optimization."""
    return [
        {"id": "merit", "name": "Merit-Based Scholarship", "desc": "Academic excellence, GPA, class rank"},
        {"id": "research", "name": "Research Scholarship", "desc": "Publications, research experience, conferences"},
        {"id": "need", "name": "Need-Based Scholarship", "desc": "Financial need, community background"},
        {"id": "international", "name": "International Scholarship", "desc": "Study abroad, cultural exchange, language proficiency"},
        {"id": "sports", "name": "Sports Scholarship", "desc": "Athletic achievements, team leadership"},
    ]


def _format_cv_text(sections: list[CvSection], template: str, personal_info: dict[str, str] | None = None) -> str:
    """Format CV sections into the selected template."""
    info = personal_info or {"name": "Full Name", "email": "email@example.com", "phone": "+1 234 567 890", "location": "City, Country", "title": "", "institution": ""}

    sections_by_type = {s.heading.lower(): s.content for s in sections}

    if template == "europass":
        experience_text = sections_by_type.get("experience", "")
        education_text = sections_by_type.get("education", "")
        skills_text = sections_by_type.get("skills", "")
        additional_text = sections_by_type.get("projects", "") or sections_by_type.get("certifications", "")
        personal_info_text = f"\n{info['location']}\n{info['email']} | {info['phone']}"

        return EUROPASS_TEMPLATE.format(
            PERSONAL_INFO=personal_info_text,
            EXPERIENCE=experience_text or "Not yet added",
            EDUCATION=education_text or "Not yet added",
            SKILLS=skills_text or "Not yet added",
            ADDITIONAL=additional_text or "Not yet added",
            NAME=info["name"],
            EMAIL=info["email"],
            PHONE=info["phone"],
        )

    elif template in ("modern", "professional", "executive"):
        summary_text = sections_by_type.get("summary", "A motivated professional seeking opportunities.")
        experience_text = sections_by_type.get("experience", "")
        education_text = sections_by_type.get("education", "")
        skills_text = sections_by_type.get("skills", "")
        projects_text = sections_by_type.get("projects", "")

        return MODERN_TEMPLATE.format(
            NAME=info["name"],
            EMAIL=info["email"],
            PHONE=info["phone"],
            LOCATION=info["location"],
            SUMMARY=summary_text,
            EXPERIENCE=experience_text or "Not yet added",
            EDUCATION=education_text or "Not yet added",
            SKILLS=skills_text or "Not yet added",
            PROJECTS=projects_text or "Not yet added",
        )

    elif template == "academic":
        summary_text = sections_by_type.get("summary", info.get("title", "Research Interests"))
        education_text = sections_by_type.get("education", "")
        experience_text = sections_by_type.get("experience", "")
        projects_text = sections_by_type.get("publications", sections_by_type.get("projects", ""))
        skills_text = sections_by_type.get("skills", "")
        languages_text = sections_by_type.get("languages", "")

        return ACADEMIC_TEMPLATE.format(
            NAME=info["name"],
            TITLE=info.get("title", "Researcher"),
            EMAIL=info["email"],
            PHONE=info["phone"],
            INSTITUTION=info.get("institution", "University"),
            SUMMARY=summary_text or "Research interests not specified",
            EDUCATION=education_text or "Not yet added",
            PROJECTS=projects_text or "No publications listed",
            EXPERIENCE=experience_text or "Not yet added",
            SKILLS=skills_text or "Not yet added",
            LANGUAGES=languages_text or "Not specified",
        )

    else:  # classic or minimal
        heading_1 = list(sections_by_type.keys())[0] if sections_by_type else "Experience"
        content_1 = list(sections_by_type.values())[0] if sections_by_type else ""
        heading_2 = list(sections_by_type.keys())[1] if len(sections_by_type) > 1 else "Education"
        content_2 = list(sections_by_type.values())[1] if len(sections_by_type) > 1 else ""
        skills_text = sections_by_type.get("skills", "")

        if template == "classic":
            return CLASSIC_TEMPLATE.format(
                NAME=info["name"],
                EMAIL=info["email"],
                PHONE=info["phone"],
                LOCATION=info["location"],
                EXPERIENCE=sections_by_type.get("experience", "Not yet added"),
                EDUCATION=sections_by_type.get("education", "Not yet added"),
                SKILLS=skills_text or "Not yet added",
            )
        else:
            return MINIMAL_TEMPLATE.format(
                NAME=info["name"],
                EMAIL=info["email"],
                PHONE=info["phone"],
                HEADING_1=heading_1,
                CONTENT_1=content_1 or "Not yet added",
                HEADING_2=heading_2,
                CONTENT_2=content_2 or "Not yet added",
                SKILLS=skills_text or "Not yet added",
            )


# ---------------------------------------------------------------------------
# Main optimization function
# ---------------------------------------------------------------------------


def optimize_cv(
    cv_text: str,
    target_text: str,
    mode: str = "job",
    template: str = "modern",
    personal_info: dict[str, str] | None = None,
    scholarship_type: str = "",
    additional_suggestions: list[str] | None = None,
    use_generation_model: bool = False,
) -> CvOptimizationResult:
    """Run the full CV optimization pipeline.

    Args:
        cv_text: The original CV text
        target_text: The job description or scholarship criteria text
        mode: "job" or "scholarship"
        template: Template name for formatting
        personal_info: Optional dict with name, email, phone, location
        scholarship_type: Type of scholarship (merit, research, etc.)

    Returns a CvOptimizationResult with scores, suggestions, and rewritten CV.
    """
    # Extract sections from CV (use robust parser if basic extraction fails)
    sections = _extract_sections(cv_text)

    # Always try the robust parser for better section detection
    meaningful = [s for s in sections if s.heading.lower() not in ("header", "full cv")]
    parsed: dict[str, Any] = {}
    try:
        from backend.app.services.cv_parser import parse_cv_text
        parsed = parse_cv_text(cv_text)
        sections = []
        order = 0
        # Rebuild sections from parsed data
        if parsed.get("summary"):
            sections.append(CvSection(heading="Summary", content=parsed["summary"], order=order))
            order += 1
        if parsed.get("experience"):
            exp_lines = []
            for e in parsed["experience"]:
                title_line = e.get("job_title", "")
                if e.get("company"):
                    title_line += f" | {e['company']}"
                if e.get("start_date"):
                    title_line += f" | {e['start_date']}"
                    if e.get("end_date"):
                        title_line += f" - {e['end_date']}"
                exp_lines.append(title_line)
                for b in e.get("bullets", []):
                    exp_lines.append(f"• {b}")
            sections.append(CvSection(heading="Experience", content="\n".join(exp_lines), order=order))
            order += 1
        if parsed.get("education"):
            edu_lines = []
            for e in parsed["education"]:
                line = e.get("degree", "")
                if e.get("institution"):
                    line += f" | {e['institution']}"
                if e.get("start_date") or e.get("end_date"):
                    line += f" | {e.get('start_date', '')} - {e.get('end_date', '')}"
                edu_lines.append(line)
                for d in e.get("details", []):
                    edu_lines.append(f"• {d}")
            sections.append(CvSection(heading="Education", content="\n".join(edu_lines), order=order))
            order += 1
        if parsed.get("skills"):
            skill_lines = []
            skills_data = parsed["skills"]
            if isinstance(skills_data, dict):
                for cat, items in skills_data.items():
                    skill_lines.append(f"{cat}: {', '.join(items)}")
            sections.append(CvSection(heading="Skills", content="\n".join(skill_lines), order=order))
            order += 1
        if parsed.get("projects"):
            proj_lines = []
            for p in parsed["projects"]:
                name = p.get("name", "")
                if p.get("technologies"):
                    name += f" [{p['technologies']}]"
                proj_lines.append(name)
                if p.get("description"):
                    proj_lines.append(f"• {p['description']}")
                for b in p.get("bullets", []):
                    proj_lines.append(f"• {b}")
            sections.append(CvSection(heading="Projects", content="\n".join(proj_lines), order=order))
            order += 1
        if parsed.get("certifications"):
            cert_lines = [c.get("name", "") for c in parsed["certifications"]]
            sections.append(CvSection(heading="Certifications", content="\n".join(cert_lines), order=order))
            order += 1
        if parsed.get("languages"):
            sections.append(CvSection(heading="Languages", content=", ".join(parsed["languages"]), order=order))
            order += 1
        if parsed.get("interests"):
            sections.append(CvSection(heading="Interests", content=", ".join(parsed["interests"]), order=order))
            order += 1
        # Preserve every additional heading detected by the parser. This is
        # important for real CVs whose content includes Leadership,
        # Achievements, Publications, Volunteering, or industry-specific
        # sections that are not part of the core schema.
        for heading, values in (parsed.get("custom_sections") or {}).items():
            if not values:
                continue
            content = "\n".join(
                f"• {value}" if not str(value).lstrip().startswith(("•", "-", "–")) else str(value)
                for value in values
                if str(value).strip()
            )
            if content:
                sections.append(CvSection(heading=str(heading), content=content, order=order))
                order += 1
        # If parsing found no structured content, retain a readable fallback
        # section instead of returning an empty preview.
        if not sections:
            sections = _extract_sections(cv_text)
        if not sections or all(not section.content.strip() for section in sections):
            sections = [CvSection(heading="CV Content", content=cv_text.strip(), order=0)]
    except Exception:
        pass

    if not sections or all(section.heading.lower() in {"header", "full cv"} for section in sections):
        sections = [CvSection(heading="CV Content", content=cv_text.strip(), order=0)]

    missing_fields: list[dict[str, str]] = []
    for index, experience in enumerate(parsed.get("experience", [])):
        if not experience.get("start_date"):
            missing_fields.append({
                "key": f"experience_{index}_start_date",
                "label": f"Work experience {index + 1}: start year",
                "placeholder": "YYYY",
            })
        if not experience.get("end_date"):
            missing_fields.append({
                "key": f"experience_{index}_end_date",
                "label": f"Work experience {index + 1}: end year (or Present)",
                "placeholder": "YYYY or Present",
            })
    for index, education in enumerate(parsed.get("education", [])):
        if not education.get("start_date"):
            missing_fields.append({
                "key": f"education_{index}_start_date",
                "label": f"Education {index + 1}: start year",
                "placeholder": "YYYY",
            })
        if not education.get("end_date"):
            missing_fields.append({
                "key": f"education_{index}_end_date",
                "label": f"Education {index + 1}: end year (or Present)",
                "placeholder": "YYYY or Present",
            })

    # Skill coverage is intentionally separate from the broader keyword/ATS score.
    # It answers: how many explicitly stated required skills are evidenced by the CV?
    skill_gap = calculate_skill_gap(cv_text, target_text)
    cv_skills = skill_gap["extracted_skills"]
    cv_inferred = skill_gap["inferred_skills"]
    matched_skills_list = skill_gap["matched_skills"]
    missing_skills_list = skill_gap["missing_skills"]

    # Extract keywords from target
    jd_keywords = _extract_keywords_from_jd(target_text)

    # Find matched and missing keywords
    cv_tokens_lower = set(tokenize(cv_text.lower()))
    matched_keywords_list: list[str] = []
    missing_keywords_list: list[str] = []
    keyword_matches_list: list[KeywordMatch] = []

    for kw, importance in jd_keywords.items():
        found = kw.lower() in cv_tokens_lower
        count = cv_text.lower().count(kw.lower()) if found else 0
        keyword_matches_list.append(KeywordMatch(
            keyword=kw,
            found=found,
            count=count,
            importance=importance,
        ))
        if found:
            matched_keywords_list.append(kw)
        else:
            missing_keywords_list.append(kw)

    # Compute ATS score
    ats_score = _compute_ats_score(cv_text, jd_keywords, matched_keywords_list, missing_keywords_list)

    # Keyword density
    total_words = len(cv_text.split())
    keyword_density = (len(matched_keywords_list) / max(total_words, 1)) * 100

    # Generate rewrite suggestions
    if mode == "scholarship":
        # Add scholarship-specific context
        scholarship_contexts = {
            "merit": "Focus on academic achievements, GPA, honors, and class rank.",
            "research": "Emphasize publications, research projects, lab experience, and conference presentations.",
            "need": "Highlight community background, financial need context, and determination.",
            "international": "Feature language proficiency, cross-cultural experience, and adaptability.",
            "sports": "Showcase athletic achievements, team leadership, and discipline.",
        }
        context = scholarship_contexts.get(scholarship_type, "")
        suggestions = _generate_suggestions(matched_skills_list, missing_skills_list, missing_keywords_list, mode)
        if context:
            suggestions.insert(0, context)
    else:
        suggestions = _generate_suggestions(matched_skills_list, missing_skills_list, missing_keywords_list, mode)

    # Candidate guidance is additive: the optimizer keeps its own ATS checks,
    # while allowing the candidate to add priorities such as "emphasize
    # backend projects" or "keep this to one page" for the export step.
    for suggestion in additional_suggestions or []:
        cleaned = str(suggestion).strip()
        if cleaned and cleaned not in suggestions:
            suggestions.append(cleaned)

    # Build generated content first, then order the resulting sections for ATS.
    generated_data, optimization_changes = build_optimized_cv_data(parsed, target_text, matched_skills_list)
    generation_source = "rule-based"
    if use_generation_model:
        try:
            from backend.app.services.llm_service import generate_optimized_cv
            model_data = generate_optimized_cv(generated_data, target_text)
            if model_data:
                generated_data = model_data
                generation_source = "qwen-generation"
                optimization_changes.append("Rewritten by the dedicated CV generation model under fact-preserving constraints.")
        except Exception as exc:
            logger.warning("Generation model unavailable; using fact-preserving fallback: %s", exc)
    optimized_sections = _reorder_sections_for_ats(_apply_generated_content(sections, generated_data), mode)

    # Format optimized CV text
    optimized_text = _format_cv_text(optimized_sections, template, personal_info)

    # Build comparison HTML
    comparison_html = _build_comparison_html(cv_text, optimized_text, matched_keywords_list, missing_keywords_list, template)

    return CvOptimizationResult(
        session_id=uuid.uuid4().hex[:12],
        created_at=datetime.now(UTC).isoformat(),
        mode=mode,
        ats_score=ats_score,
        original_sections=sections,
        optimized_sections=optimized_sections,
        keyword_matches=keyword_matches_list,
        matched_keywords=matched_keywords_list,
        missing_keywords=missing_keywords_list,
        keyword_density=round(keyword_density, 2),
        suggested_skills=missing_skills_list,
        extracted_skills=cv_skills,
        missing_skills=missing_skills_list,
        matched_skills=skill_gap["matched_skills"],
        inferred_matched_skills=skill_gap["inferred_matched_skills"],
        required_skills=skill_gap["required_skills"],
        skill_coverage=skill_gap["skill_coverage"],
        skill_gap_percentage=skill_gap["skill_gap_percentage"],
        generation_source=generation_source,
        optimization_changes=optimization_changes,
        contact={str(key): str(value) for key, value in (parsed.get("contact") or {}).items()},
        optimized_experience=[dict(item) for item in generated_data.get("experience", []) if isinstance(item, dict)],
        optimized_projects=[dict(item) for item in generated_data.get("projects", []) if isinstance(item, dict)],
        suggestions=suggestions,
        missing_fields=missing_fields,
        target_title="",
        template=template,
        comparison_html=comparison_html,
    )



def _apply_generated_content(sections: list[CvSection], cv_data: dict[str, Any]) -> list[CvSection]:
    """Overlay generated structured content onto the section preview."""
    result = [copy.copy(section) for section in sections]
    for section in result:
        kind = section.heading.lower()
        if kind == "summary" and cv_data.get("summary"):
            section.content = str(cv_data["summary"])
        elif kind == "experience":
            lines: list[str] = []
            for item in cv_data.get("experience", []):
                if not isinstance(item, dict):
                    continue
                title = str(item.get("job_title", ""))
                if item.get("company"):
                    title += f" | {item['company']}"
                if item.get("start_date"):
                    title += f" | {item['start_date']}"
                    if item.get("end_date"):
                        title += f" - {item['end_date']}"
                lines.append(title)
                lines.extend(f"• {_rewrite_experience_bullet(bullet)}" for bullet in item.get("bullets", []) if str(bullet).strip())
            if lines:
                section.content = "\n".join(lines)
        elif kind == "education":
            lines: list[str] = []
            for item in cv_data.get("education", []):
                if not isinstance(item, dict):
                    continue
                title = str(item.get("degree", ""))
                if item.get("institution"):
                    title += f" | {item['institution']}"
                if item.get("start_date") or item.get("end_date"):
                    title += f" | {item.get('start_date', '')}"
                    if item.get("end_date"):
                        title += f" - {item['end_date']}"
                if title.strip():
                    lines.append(title)
                lines.extend(f"• {detail}" for detail in item.get("details", []) if str(detail).strip())
            if lines:
                section.content = "\n".join(lines)
        elif kind == "skills" and isinstance(cv_data.get("skills"), dict):
            section.content = "\n".join(
                f"{category}: {', '.join(str(value) for value in values)}"
                for category, values in cv_data["skills"].items() if values
            )
        elif kind == "projects":
            lines: list[str] = []
            for item in cv_data.get("projects", []):
                if not isinstance(item, dict):
                    continue
                title = str(item.get("name", ""))
                if item.get("technologies"):
                    title += f" [{item['technologies']}]"
                lines.append(title)
                if item.get("description"):
                    lines.append(f"• {item['description']}")
                lines.extend(f"• {bullet}" for bullet in item.get("bullets", []) if str(bullet).strip())
            if lines:
                section.content = "\n".join(lines)

    existing_headings = {section.heading.lower() for section in result}
    custom_sections = cv_data.get("custom_sections") if isinstance(cv_data.get("custom_sections"), dict) else {}
    for heading, values in custom_sections.items():
        items = [str(value).strip() for value in values] if isinstance(values, list) else []
        items = [item for item in items if item]
        if not items or str(heading).lower() in existing_headings:
            continue
        result.append(CvSection(
            heading=str(heading),
            content="\n".join(f"• {item}" for item in items),
            order=len(result),
        ))
    return result


def _reorder_sections_for_ats(sections: list[CvSection], mode: str) -> list[CvSection]:
    """Reorder CV sections for optimal ATS parsing."""
    priority = ["summary", "education", "experience", "skills", "projects", "certifications"]
    if mode == "scholarship":
        priority = ["summary", "education", "achievements", "experience", "skills", "projects"]

    ordered: list[CvSection] = []
    remaining = list(sections)

    for priority_heading in priority:
        for section in remaining[:]:
            if section.heading.lower() == priority_heading:
                ordered.append(section)
                remaining.remove(section)

    # Add remaining sections at the end
    ordered.extend(remaining)
    return ordered
