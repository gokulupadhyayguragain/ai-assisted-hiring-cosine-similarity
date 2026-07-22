"""Lightweight LLM Service for CV restructuring.

Uses llama-cpp-python with a small quantized GGUF model (Qwen2.5-0.5B-Instruct)
to intelligently parse and restructure CVs. Runs on CPU with ~400MB RAM.

The model is downloaded on first use and cached in runtime/models/.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Model configuration
MODEL_DIR = Path(os.getenv("CV_GENERATION_MODEL_DIR", str(Path(__file__).resolve().parents[2] / "runtime" / "models")))
MODEL_FILENAME = os.getenv("CV_GENERATION_MODEL_FILENAME", "qwen2.5-0.5b-instruct-q4_k_m.gguf")
MODEL_URL = os.getenv(
    "CV_GENERATION_MODEL_URL",
    "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf",
)
MODEL_PATH = MODEL_DIR / MODEL_FILENAME

# Global model instance (lazy loaded)
_llm = None


def _download_model() -> bool:
    """Download the GGUF model if not present."""
    if MODEL_PATH.exists():
        return True

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(f"Downloading LLM model to {MODEL_PATH}...")

    try:
        import urllib.request
        urllib.request.urlretrieve(MODEL_URL, str(MODEL_PATH))
        logger.info(f"Model downloaded: {MODEL_PATH.stat().st_size / 1024 / 1024:.1f}MB")
        return True
    except Exception as e:
        logger.error(f"Model download failed: {e}")
        return False


def _get_llm():
    """Get or initialize the LLM instance."""
    global _llm
    if _llm is not None:
        return _llm

    try:
        from llama_cpp import Llama
    except ImportError:
        logger.warning("llama-cpp-python not installed. LLM features disabled.")
        return None

    if not _download_model():
        return None

    try:
        _llm = Llama(
            model_path=str(MODEL_PATH),
            n_ctx=2048,       # Context window
            n_threads=4,      # CPU threads
            n_batch=256,      # Batch size for prompt processing
            verbose=False,
        )
        logger.info("LLM loaded successfully")
        return _llm
    except Exception as e:
        logger.error(f"Failed to load LLM: {e}")
        return None


def is_available() -> bool:
    """Check if LLM is available (model downloaded and loadable)."""
    return _get_llm() is not None


def restructure_cv(cv_text: str, job_description: str = "") -> dict[str, Any] | None:
    """Use LLM to intelligently restructure raw CV text into proper sections.

    Args:
        cv_text: Raw extracted CV text (possibly poorly formatted from PDF)
        job_description: Optional JD for context (helps LLM prioritize relevant content)

    Returns:
        Dict with structured CV data (contact, summary, experience, education, skills, projects, certifications)
        or None if LLM is unavailable.
    """
    llm = _get_llm()
    if llm is None:
        return None

    # Build the prompt
    jd_context = f"\nTarget job: {job_description[:200]}" if job_description else ""

    prompt = f"""<|im_start|>system
You are a CV parser. Extract structured data from the raw CV text below. Return ONLY valid JSON with this exact structure:
{{
  "name": "full name",
  "email": "email",
  "phone": "phone",
  "location": "location",
  "title": "professional title",
  "summary": "professional summary (1-2 sentences)",
  "experience": [
    {{"job_title": "title", "company": "company", "start_date": "start", "end_date": "end", "bullets": ["achievement 1", "achievement 2"]}}
  ],
  "education": [
    {{"degree": "degree", "institution": "institution", "start_date": "start", "end_date": "end", "gpa": "", "details": []}}
  ],
  "skills": {{"Category1": ["skill1", "skill2"], "Category2": ["skill3"]}},
  "projects": [
    {{"name": "project name", "technologies": "tech1, tech2", "bullets": ["description 1"]}}
  ],
  "certifications": [{{"name": "cert name"}}],
  "languages": ["Language1 (Level)"]
}}
<|im_end|>
<|im_start|>user
Parse this CV:{jd_context}

{cv_text[:2000]}
<|im_end|>
<|im_start|>assistant
"""

    try:
        output = llm(
            prompt,
            max_tokens=1500,
            temperature=0.1,
            stop=["<|im_end|>"],
            echo=False,
        )

        response_text = output["choices"][0]["text"].strip()

        # Try to extract JSON from response
        # Sometimes LLM wraps in markdown code block
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]

        # Find the JSON object
        start = response_text.find("{")
        end = response_text.rfind("}") + 1
        if start >= 0 and end > start:
            json_str = response_text[start:end]
            data = json.loads(json_str)
            return _normalize_llm_output(data)

        logger.warning(f"LLM returned non-JSON: {response_text[:100]}")
        return None

    except json.JSONDecodeError as e:
        logger.warning(f"LLM JSON parse error: {e}")
        return None
    except Exception as e:
        logger.error(f"LLM inference error: {e}")
        return None


def _normalize_llm_output(data: dict) -> dict[str, Any]:
    """Normalize LLM output into the standard CV structure expected by the generator."""
    return {
        "contact": {
            "full_name": data.get("name", ""),
            "email": data.get("email", ""),
            "phone": data.get("phone", ""),
            "location": data.get("location", ""),
            "linkedin": data.get("linkedin", ""),
            "website": data.get("website", ""),
            "title": data.get("title", ""),
        },
        "summary": data.get("summary", ""),
        "experience": [
            {
                "job_title": e.get("job_title", e.get("title", "")),
                "company": e.get("company", ""),
                "location": e.get("location", ""),
                "start_date": e.get("start_date", e.get("start", "")),
                "end_date": e.get("end_date", e.get("end", "")),
                "bullets": e.get("bullets", e.get("achievements", [])),
            }
            for e in data.get("experience", [])
        ],
        "education": [
            {
                "degree": e.get("degree", ""),
                "institution": e.get("institution", e.get("school", "")),
                "location": e.get("location", ""),
                "start_date": e.get("start_date", e.get("start", "")),
                "end_date": e.get("end_date", e.get("end", "")),
                "gpa": e.get("gpa", ""),
                "details": e.get("details", []),
            }
            for e in data.get("education", [])
        ],
        "skills": data.get("skills", {}),
        "projects": [
            {
                "name": p.get("name", p.get("title", "")),
                "technologies": p.get("technologies", p.get("tech", "")),
                "description": p.get("description", ""),
                "url": p.get("url", ""),
                "bullets": p.get("bullets", []),
            }
            for p in data.get("projects", [])
        ],
        "certifications": [
            {"name": c.get("name", c) if isinstance(c, dict) else str(c), "issuer": c.get("issuer", "") if isinstance(c, dict) else "", "date": c.get("date", "") if isinstance(c, dict) else "", "url": ""}
            for c in data.get("certifications", [])
        ],
        "languages": data.get("languages", []),
        "interests": data.get("interests", []),
        "custom_sections": {},
    }


def enhance_cv_for_job(cv_data: dict, job_description: str) -> dict[str, Any] | None:
    """Use LLM to enhance/rewrite CV bullets to better match a job description.

    This takes already-parsed CV data and rewrites it to be more relevant.
    """
    llm = _get_llm()
    if llm is None:
        return None

    # Build a concise representation of current CV
    exp_text = ""
    for e in cv_data.get("experience", []):
        exp_text += f"\n{e.get('job_title', '')} at {e.get('company', '')}:\n"
        for b in e.get("bullets", []):
            exp_text += f"- {b}\n"

    prompt = f"""<|im_start|>system
You are a CV optimization expert. Rewrite the experience bullets to better match the target job description. Keep facts truthful but use relevant keywords and action verbs. Return ONLY the rewritten bullets as a JSON array of objects.
<|im_end|>
<|im_start|>user
Target Job: {job_description[:300]}

Current Experience:
{exp_text[:1000]}

Rewrite each job's bullets to better match the target job. Return JSON:
[{{"job_title": "...", "company": "...", "bullets": ["rewritten bullet 1", ...]}}]
<|im_end|>
<|im_start|>assistant
"""

    try:
        output = llm(
            prompt,
            max_tokens=1000,
            temperature=0.2,
            stop=["<|im_end|>"],
            echo=False,
        )

        response_text = output["choices"][0]["text"].strip()
        start = response_text.find("[")
        end = response_text.rfind("]") + 1
        if start >= 0 and end > start:
            enhanced = json.loads(response_text[start:end])
            # Merge back into cv_data
            result = dict(cv_data)
            for i, entry in enumerate(enhanced):
                if i < len(result.get("experience", [])):
                    result["experience"][i]["bullets"] = entry.get("bullets", result["experience"][i]["bullets"])
            return result

        return None
    except Exception as e:
        logger.warning(f"CV enhancement failed: {e}")
        return None


def generate_optimized_cv(cv_data: dict[str, Any], job_description: str) -> dict[str, Any] | None:
    """Use the dedicated generation model to rewrite CV content safely.

    The model may rewrite summaries and bullets, but the merge is constrained to
    existing entries so it cannot invent employers, dates, metrics, skills, or
    projects. The deterministic optimizer remains the fallback.
    """
    llm = _get_llm()
    if llm is None:
        return None

    source = {
        "summary": cv_data.get("summary", ""),
        "experience": [
            {"job_title": e.get("job_title", ""), "company": e.get("company", ""), "bullets": e.get("bullets", [])}
            for e in cv_data.get("experience", []) if isinstance(e, dict)
        ],
        "projects": [
            {"name": p.get("name", ""), "technologies": p.get("technologies", ""), "bullets": p.get("bullets", []), "description": p.get("description", "")}
            for p in cv_data.get("projects", []) if isinstance(p, dict)
        ],
    }
    prompt = f"""<|im_start|>system
You are a senior CV editor. Rewrite the supplied CV content for the target job. Keep every fact truthful: do not add skills, employers, dates, numbers, tools, projects, or achievements that are not already present. Improve clarity, action verbs, technical wording, and relevance. Return ONLY JSON with keys summary, experience, projects. Keep exactly the same number of experience and project entries and bullets unless a bullet is empty.
<|im_end|>
<|im_start|>user
Target job:
{job_description[:1800]}

Existing CV content:
{json.dumps(source, ensure_ascii=False)[:6000]}
<|im_end|>
<|im_start|>assistant
"""
    try:
        output = llm(prompt, max_tokens=1800, temperature=0.25, stop=["<|im_end|>"], echo=False)
        text = output["choices"][0]["text"].strip()
        start, end = text.find("{"), text.rfind("}") + 1
        if start < 0 or end <= start:
            return None
        generated = json.loads(text[start:end])
        result = dict(cv_data)
        if isinstance(generated.get("summary"), str) and generated["summary"].strip():
            result["summary"] = generated["summary"].strip()
        for key in ("experience", "projects"):
            source_items = result.get(key, [])
            generated_items = generated.get(key, [])
            if not isinstance(generated_items, list) or len(generated_items) != len(source_items):
                continue
            merged = []
            for original, rewritten in zip(source_items, generated_items):
                if not isinstance(original, dict) or not isinstance(rewritten, dict):
                    merged.append(original)
                    continue
                item = dict(original)
                if isinstance(rewritten.get("bullets"), list):
                    item["bullets"] = [str(b).strip() for b in rewritten["bullets"] if str(b).strip()]
                if key == "projects" and isinstance(rewritten.get("description"), str):
                    item["description"] = rewritten["description"].strip()
                merged.append(item)
            result[key] = merged
        return result
    except Exception as exc:
        logger.warning("Dedicated CV generation failed: %s", exc)
        return None
