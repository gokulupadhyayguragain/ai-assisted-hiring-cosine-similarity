from __future__ import annotations

from io import BytesIO, StringIO
import csv


def session_to_csv(session: dict) -> str:
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "rank",
            "candidate_id",
            "display_name",
            "score",
            "tfidf_score",
            "semantic_score",
            "matched_skills",
            "missing_skills",
            "experience_years",
            "summary",
        ]
    )
    for rank, candidate in enumerate(session.get("candidates", []), start=1):
        writer.writerow(
            [
                rank,
                candidate["candidate_id"],
                candidate["display_name"],
                candidate["score"],
                candidate["tfidf_score"],
                candidate["semantic_score"],
                "; ".join(candidate["matched_skills"]),
                "; ".join(candidate["missing_skills"]),
                candidate["experience_years"] or "",
                candidate["summary"],
            ]
        )
    return output.getvalue()


def candidate_report_pdf(session: dict, candidate_id: str) -> bytes:
    candidate = next(
        (item for item in session.get("candidates", []) if item["candidate_id"] == candidate_id),
        None,
    )
    if candidate is None:
        raise KeyError(candidate_id)

    buffer = BytesIO()
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except Exception:
        fallback = _plain_report(session, candidate)
        return fallback.encode("utf-8")

    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=0.65 * inch, leftMargin=0.65 * inch)
    story = [
        Paragraph("AI Assisted Hiring Transparency Report", styles["Title"]),
        Paragraph(f"Candidate: {candidate['display_name']} ({candidate['candidate_id']})", styles["Heading2"]),
        Paragraph(candidate["summary"], styles["BodyText"]),
        Spacer(1, 0.18 * inch),
    ]
    score_table = Table(
        [
            ["Overall", "TF-IDF", "Semantic", "Generated"],
            [
                f"{candidate['score']}%",
                f"{candidate['tfidf_score']}%",
                f"{candidate['semantic_score']}%",
                session.get("created_at", ""),
            ],
        ],
        hAlign="LEFT",
    )
    score_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#102033")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d2dae5")),
                ("PADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.extend([score_table, Spacer(1, 0.2 * inch)])

    story.append(Paragraph("Matched Skills", styles["Heading3"]))
    story.append(Paragraph(", ".join(candidate["matched_skills"]) or "No direct matches found.", styles["BodyText"]))
    story.append(Paragraph("Missing Skills", styles["Heading3"]))
    story.append(Paragraph(", ".join(candidate["missing_skills"]) or "No major missing skills detected.", styles["BodyText"]))
    story.append(Paragraph("Improvement Suggestions", styles["Heading3"]))
    for suggestion in candidate["suggestions"]:
        story.append(Paragraph(f"- {suggestion}", styles["BodyText"]))

    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph("Method", styles["Heading3"]))
    story.append(
        Paragraph(
            "The score combines TF-IDF cosine similarity with a semantic layer. Personal identifiers are masked before ranking.",
            styles["BodyText"],
        )
    )
    doc.build(story)
    return buffer.getvalue()


def resume_to_pdf(session: dict, candidate_id: str) -> bytes:
    """Render a candidate's (anonymized) CV text into a clean, readable PDF.

    Returns PDF bytes, or UTF-8 text bytes if reportlab is unavailable.
    """
    candidate = next(
        (item for item in session.get("candidates", []) if item["candidate_id"] == candidate_id),
        None,
    )
    if candidate is None:
        raise KeyError(candidate_id)

    resume_text = (candidate.get("resume_text") or "").strip()

    try:
        from xml.sax.saxutils import escape

        from reportlab.lib import colors
        from reportlab.lib.enums import TA_LEFT
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer
    except Exception:
        return (resume_text or "No resume text available.").encode("utf-8")

    styles = getSampleStyleSheet()
    name_style = ParagraphStyle(
        "CvName", parent=styles["Title"], fontSize=18, alignment=TA_LEFT,
        textColor=colors.HexColor("#003893"), spaceAfter=2,
    )
    meta_style = ParagraphStyle(
        "CvMeta", parent=styles["BodyText"], fontSize=9,
        textColor=colors.HexColor("#6b7280"), spaceAfter=4,
    )
    section_style = ParagraphStyle(
        "CvSection", parent=styles["Heading3"], fontSize=11,
        textColor=colors.HexColor("#111111"), spaceBefore=10, spaceAfter=3,
    )
    body_style = ParagraphStyle(
        "CvBody", parent=styles["BodyText"], fontSize=9.5, leading=13,
        textColor=colors.HexColor("#27272a"),
    )

    exp = candidate.get("experience_years")
    meta_bits = [
        candidate.get("candidate_id", ""),
        f"{exp}y experience" if exp else "Experience N/A",
        f"Match {round(candidate.get('score') or 0)}%",
    ]

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=0.7 * inch, leftMargin=0.7 * inch,
        topMargin=0.7 * inch, bottomMargin=0.7 * inch,
        title=f"{candidate.get('display_name') or 'Anonymous Candidate'} - CV",
    )

    story = [
        Paragraph(escape(candidate.get("display_name") or "Anonymous Candidate"), name_style),
        Paragraph(escape("  -  ".join(b for b in meta_bits if b)), meta_style),
        HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#e4e4e7"), spaceAfter=6),
    ]

    matched = candidate.get("matched_skills") or []
    missing = candidate.get("missing_skills") or []
    if matched:
        story.append(Paragraph(f"Matched Skills ({len(matched)})", section_style))
        story.append(Paragraph(escape(", ".join(matched)), body_style))
    if missing:
        story.append(Paragraph(f"Skill Gaps ({len(missing)})", section_style))
        story.append(Paragraph(escape(", ".join(missing)), body_style))

    story.append(Paragraph("Resume", section_style))
    if resume_text:
        for line in resume_text.split("\n"):
            if line.strip():
                story.append(Paragraph(escape(line.rstrip()), body_style))
            else:
                story.append(Spacer(1, 5))
    else:
        story.append(Paragraph("No resume text available for this candidate.", body_style))

    doc.build(story)
    return buffer.getvalue()


def _plain_report(session: dict, candidate: dict) -> str:
    return "\n".join(
        [
            "AI Assisted Hiring Transparency Report",
            f"Session: {session.get('session_id')}",
            f"Candidate: {candidate['display_name']} ({candidate['candidate_id']})",
            f"Score: {candidate['score']}%",
            f"TF-IDF: {candidate['tfidf_score']}%",
            f"Semantic: {candidate['semantic_score']}%",
            f"Matched skills: {', '.join(candidate['matched_skills'])}",
            f"Missing skills: {', '.join(candidate['missing_skills'])}",
            candidate["summary"],
        ]
    )
