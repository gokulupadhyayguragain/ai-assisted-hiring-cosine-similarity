from backend.app.models import ExtractedDocument
from backend.app.services.anonymizer import anonymize_text
from backend.app.services.bias_audit import audit_job_description
from backend.app.services.matching import MatchingEngine


def test_anonymizer_masks_personal_information() -> None:
    text = "Gokul Upadhyay\nEmail: gokul@example.com\nPhone: +977 9800000000\nKathmandu"

    result = anonymize_text(text)

    assert "[EMAIL]" in result.redacted_text
    assert "[PHONE]" in result.redacted_text
    assert "[LOCATION]" in result.redacted_text
    assert result.replacement_counts["email"] == 1


def test_bias_audit_flags_exclusionary_language() -> None:
    audit = audit_job_description("We need a young male rockstar developer with native English.")

    assert audit.score < 100
    assert {finding.term for finding in audit.findings} >= {"young", "male", "rockstar"}


def test_matching_engine_ranks_stronger_resume_higher() -> None:
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
            filename="weak.txt",
            file_type="txt",
            text="Graphic designer with Figma and social media marketing experience.",
        ),
    ]

    session = engine.analyze(job=job, resumes=resumes)

    assert session.candidates[0].source_filename == "strong.txt"
    assert session.candidates[0].score > session.candidates[1].score
    assert "FastAPI" in session.candidates[0].matched_skills
