"""
Enhanced skill extraction and NLP preprocessing using spaCy.

Provides tokenization, lemmatization, NER-based entity extraction,
and canonical skill matching for resume-job analysis.
"""

from __future__ import annotations

import logging
import re
from collections import Counter
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# spaCy model (lazy-loaded)
# ---------------------------------------------------------------------------
_NLP: Any = None


def _get_nlp():
    global _NLP
    if _NLP is not None:
        return _NLP
    try:
        import spacy

        try:
            _NLP = spacy.load("en_core_web_sm")
        except OSError:
            logger.warning(
                "spaCy model 'en_core_web_sm' not found. "
                "Install it with: python -m spacy download en_core_web_sm"
            )
            return None
    except Exception as exc:
        logger.warning("spaCy not available (%s); falling back to regex tokenizer.", exc)
        _NLP = None
    return _NLP


# ---------------------------------------------------------------------------
# Stop words
# ---------------------------------------------------------------------------

STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "been",
    "being",
    "by",
    "for",
    "from",
    "has",
    "have",
    "having",
    "in",
    "is",
    "it",
    "its",
    "of",
    "on",
    "or",
    "our",
    "shall",
    "that",
    "the",
    "their",
    "them",
    "this",
    "to",
    "was",
    "were",
    "with",
    "you",
    "your",
    "we",
    "will",
    "work",
    "working",
    "team",
    "role",
    "candidate",
    "experience",
    "skills",
    "knowledge",
    "able",
    "ability",
    "also",
    "using",
    "used",
    "use",
    "including",
    "including",
    "etc",
    "etc.",
    "like",
    "well",
    "within",
    "various",
    "per",
    "may",
    "must",
    "new",
}

# ---------------------------------------------------------------------------
# Skill dictionary (extended)
# ---------------------------------------------------------------------------

SKILL_TERMS: dict[str, tuple[str, ...]] = {
    # Languages & Frameworks
    "Python": ("python", "py"),
    "Java": ("java", "jvm"),
    "Spring Boot": ("spring boot", "springboot", "spring framework"),
    "JavaScript": ("javascript", "js", "ecmascript"),
    "TypeScript": ("typescript", "ts"),
    "React": ("react", "react.js", "reactjs"),
    "Next.js": ("next.js", "nextjs", "next js"),
    "Node.js": ("node.js", "nodejs", "node js", "express.js", "expressjs"),
    "FastAPI": ("fastapi", "fast api"),
    "Django": ("django",),
    "Flask": ("flask",),
    "REST API": ("rest api", "restful", "api development", "apis", "rest"),
    "GraphQL": ("graphql",),
    "SQL": ("sql", "structured query language"),
    "PostgreSQL": ("postgresql", "postgres", "psql"),
    "MySQL": ("mysql",),
    "MongoDB": ("mongodb", "mongo"),
    "Redis": ("redis",),
    "Docker": ("docker", "containerization", "containers", "container"),
    "Kubernetes": ("kubernetes", "k8s", "kube"),
    "AWS": ("aws", "amazon web services", "ec2", "s3", "lambda", "ecs", "eks"),
    "GCP": ("gcp", "google cloud", "google cloud platform"),
    "Azure": ("azure", "microsoft azure"),
    "Cloudflare": ("cloudflare",),
    "Git": ("git", "github", "gitlab", "version control"),
    "Linux": ("linux", "ubuntu", "shell scripting", "bash", "unix"),
    "CI/CD": ("ci/cd", "cicd", "continuous integration", "continuous deployment", "jenkins"),
    # ML / AI
    "Machine Learning": ("machine learning", "ml", "predictive modeling", "deep learning"),
    "NLP": ("nlp", "natural language processing", "text mining", "text analytics"),
    "BERT": ("bert", "sbert", "sentence bert", "sentence-transformers", "transformer embeddings"),
    "LLM": ("llm", "large language model", "gpt", "generative ai"),
    "RAG": ("rag", "retrieval augmented generation", "retrieval-augmented"),
    "Scikit-learn": ("scikit-learn", "sklearn", "scikit learn"),
    "Pandas": ("pandas",),
    "NumPy": ("numpy",),
    "PyTorch": ("pytorch", "torch"),
    "TensorFlow": ("tensorflow", "tf"),
    "Data Analysis": ("data analysis", "analytics", "eda", "visualization", "data viz"),
    "Computer Vision": ("computer vision", "cv", "image processing", "opencv"),
    # Cybersecurity
    "Cybersecurity": ("cybersecurity", "security", "penetration testing", "infosec"),
    "Networking": ("networking", "tcp/ip", "routing", "switching", "network security"),
    # Web
    "HTML/CSS": ("html", "css", "html5", "css3"),
    "Tailwind CSS": ("tailwind", "tailwind css"),
    "PHP": ("php",),
    "Laravel": ("laravel",),
    ".NET": (".net", "dotnet", "asp.net", ".net core"),
    "C#": ("c#", "c sharp", "csharp"),
    "Go": ("go", "golang"),
    "Rust": ("rust", "rustlang"),
    # Mobile
    "Android": ("android",),
    "Kotlin": ("kotlin",),
    "Swift": ("swift",),
    "iOS": ("ios", "iphone"),
    "Flutter": ("flutter", "dart"),
    "React Native": ("react native", "reactnative"),
    # Other
    "Agile/Scrum": ("agile", "scrum", "kanban", "sprint"),
    "Testing": ("testing", "unit testing", "integration testing", "qa", "pytest", "junit"),
    "UI/UX": ("ui/ux", "ux", "user experience", "interface design", "usability"),
    "Figma": ("figma",),
    "Jira": ("jira",),
    "Confluence": ("confluence",),
    "Kafka": ("kafka", "apache kafka"),
    "RabbitMQ": ("rabbitmq",),
    "Elasticsearch": ("elasticsearch", "elastic", "elk"),
    "Tableau": ("tableau",),
    "Power BI": ("power bi", "powerbi"),
    "Excel": ("excel", "microsoft excel", "spreadsheet"),
}

INFERRED_SKILLS: dict[str, tuple[str, ...]] = {
    "Spring Boot": ("Java", "REST API"),
    "Django": ("Python", "REST API"),
    "Flask": ("Python", "REST API"),
    "FastAPI": ("Python", "REST API"),
    "React": ("JavaScript", "HTML/CSS"),
    "Next.js": ("React", "JavaScript", "HTML/CSS"),
    "Node.js": ("JavaScript", "REST API"),
    "Laravel": ("PHP", "REST API"),
    ".NET": ("C#", "REST API"),
    "PostgreSQL": ("SQL",),
    "MySQL": ("SQL",),
    "MongoDB": ("Data Analysis",),
    "BERT": ("NLP", "Machine Learning"),
    "LLM": ("NLP", "Machine Learning"),
    "RAG": ("LLM", "NLP"),
    "Scikit-learn": ("Python", "Machine Learning"),
    "Pandas": ("Python", "Data Analysis"),
    "NumPy": ("Python", "Data Analysis"),
    "PyTorch": ("Python", "Machine Learning"),
    "TensorFlow": ("Python", "Machine Learning"),
    "Docker": ("Linux",),
    "Kubernetes": ("Docker", "Linux"),
    "Kafka": ("Data Analysis",),
    "Tableau": ("Data Analysis",),
    "Power BI": ("Data Analysis",),
    "React Native": ("React", "JavaScript", "Mobile Development"),
    "Flutter": ("Dart", "Mobile Development"),
    "Swift": ("iOS", "Mobile Development"),
    "Kotlin": ("Android", "Mobile Development"),
}

TOKEN_RE = re.compile(r"[a-zA-Z][a-zA-Z0-9+#./-]*")


# ---------------------------------------------------------------------------
# Core NLP functions
# ---------------------------------------------------------------------------


def normalize_text(text: str) -> str:
    """Normalize text: lowercase, collapse whitespace."""
    return re.sub(r"\s+", " ", text.lower()).strip()


def tokenize(text: str, use_spacy: bool = True) -> list[str]:
    """
    Tokenize text into clean tokens.

    When spaCy is available and use_spacy=True, uses spaCy lemmatization
    for better token quality. Falls back to regex tokenization.
    """
    if use_spacy:
        nlp = _get_nlp()
        if nlp is not None:
            try:
                doc = nlp(text[:100_000])
                tokens = []
                for token in doc:
                    if token.is_alpha and not token.is_space and len(token.text) > 1:
                        lemma = token.lemma_.lower().strip()
                        if lemma not in STOP_WORDS and len(lemma) > 1:
                            tokens.append(lemma)
                return tokens
            except Exception:
                pass  # fall through to regex

    # Regex fallback
    tokens = [match.group(0).lower().strip("./-") for match in TOKEN_RE.finditer(text)]
    return [t for t in tokens if len(t) > 1 and t not in STOP_WORDS]


def extract_skills(text: str, *, include_inferred: bool = True) -> tuple[list[str], list[str]]:
    """
    Extract canonical skills from text using both the skill dictionary and
    spaCy NER (for additional recognition of technical terms).
    """
    normalized = f" {normalize_text(text)} "
    found: set[str] = set()

    # 1. Dictionary-based skill matching
    for canonical, aliases in SKILL_TERMS.items():
        for alias in aliases:
            escaped = re.escape(alias.lower())
            if re.search(rf"(?<![a-z0-9+#.]){escaped}(?![a-z0-9+#.])", normalized):
                found.add(canonical)
                break

    # 2. spaCy NER enhancement: detect tech/products from noun chunks
    nlp = _get_nlp()
    if nlp is not None:
        try:
            doc = nlp(text[:50_000])
            for ent in doc.ents:
                if ent.label_ in {"ORG", "PRODUCT", "GPE", "WORK_OF_ART"}:
                    ent_text = ent.text.lower().strip()
                    # Check if NER entity matches any skill alias
                    for canonical, aliases in SKILL_TERMS.items():
                        if canonical.lower() in found:
                            continue
                        for alias in aliases:
                            if ent_text == alias or ent_text in alias or alias in ent_text:
                                found.add(canonical)
                                break
        except Exception:
            pass

    # 3. Inferred skills
    inferred: set[str] = set()
    if include_inferred:
        for skill in list(found):
            inferred.update(INFERRED_SKILLS.get(skill, ()))
        inferred.difference_update(found)

    return sorted(found | inferred), sorted(inferred)


def extract_experience_years(text: str) -> float | None:
    """Extract years of experience from text using regex patterns."""
    patterns = [
        # "5+ years of experience" / "3 years professional experience"
        r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+)?experience",
        # "experience of 4 years" / "Experience: 4 years"
        r"experience\s*[:\s]+(?:of\s+)?(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)",
        # "experience 5+ years"
        r"experience\s+(?:of\s+)?(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)",
        # "4+ years exp"
        r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:exp\b)",
        # "4+ years" (generic, used as low-confidence fallback)
        r"(\d+)\+\s+years",
    ]
    values: list[float] = []
    for pattern in patterns:
        values.extend(float(m) for m in re.findall(pattern, text, flags=re.IGNORECASE))
    return max(values) if values else None


def important_terms(text: str, limit: int = 16) -> list[str]:
    """Extract the most important terms from text (frequency-based with skill boost)."""
    counts = Counter(tokenize(text))
    normalized = normalize_text(text)
    for skill, _ in SKILL_TERMS.items():
        if skill.lower() in normalized:
            counts[skill.lower()] += 3
    return [term for term, _ in counts.most_common(limit)]


def expanded_tokens(text: str) -> list[str]:
    """Tokenize text and append canonical skill names as multi-word tokens."""
    tokens = tokenize(text)
    skills, inferred = extract_skills(text)
    for skill in skills:
        tokens.append(skill.lower().replace(" ", "_"))
    for skill in inferred:
        tokens.append(skill.lower().replace(" ", "_"))
    return tokens
