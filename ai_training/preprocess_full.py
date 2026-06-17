#!/usr/bin/env python3
"""
Unified data preprocessor for Resumate.

Cleans and converts all ~21 GB of raw Kaggle datasets into clean,
maximally-extracted text data suitable for training.

Pipeline:
  1. Extract any .zip archives inside dataset directories
  2. Scan all files, sort by type (txt, md, pdf, docx, xlsx, csv, json, jsonl)
  3. Convert everything to text via the appropriate parser
  4. Consolidate into a single CSV with columns: [resume_text, job_text, category, skills, source, file_type]
  5. Generate resume-job training pairs for SBERT

Usage:
  python backend/tools/preprocess_full.py                           # uses datasets/ and outputs to runtime/training_data/
  python backend/tools/preprocess_full.py --input /path/to/datasets --output /path/to/out
  python backend/tools/preprocess_full.py --quick-test              # only processes 10 datasets
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import shutil
import sys
import time
import traceback
import zipfile
from pathlib import Path
from typing import Any, Iterator

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Column normalisation maps
# ---------------------------------------------------------------------------

RESUME_COL_KEYS = {
    "resume", "resume_text", "resume_str", "cv", "cv_text", "text",
    "document_text", "raw_text", "feature", "Resume",
    "Resume_str", "Resume_html", "Transcript",
}
JOB_COL_KEYS = {
    "job", "job_text", "jd", "job_description", "description",
    "Job Description", "job_desc", "requirements",
    "Target_Job_Description",
}
CATEGORY_COL_KEYS = {
    "category", "job_role", "role", "label", "Category",
    "Job Role", "current_title", "JobRole",
}
SKILL_COL_KEYS = {
    "skills", "skill", "required_skills", "Skills",
    "skill_set", "technical_skills", "Key Skills",
    "programming_languages",
}


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Rename columns to our standard schema."""
    mapping = {}
    for col in df.columns:
        key = str(col).strip().lower()
        if key in {v.lower() for v in RESUME_COL_KEYS}:
            mapping[col] = "resume_text"
        elif key in {v.lower() for v in JOB_COL_KEYS}:
            mapping[col] = "job_text"
        elif key in {v.lower() for v in CATEGORY_COL_KEYS}:
            mapping[col] = "category"
        elif key in {v.lower() for v in SKILL_COL_KEYS}:
            mapping[col] = "skills"
    return df.rename(columns=mapping).copy()


def clean_text(text: Any) -> str:
    if not isinstance(text, str):
        text = str(text) if text is not None else ""
    text = text.replace("\r", " ").replace("\n", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ---------------------------------------------------------------------------
# Step 1: Extract zip archives
# ---------------------------------------------------------------------------

def extract_zips(root: Path) -> list[Path]:
    """Extract all .zip files inside each dataset directory."""
    extracted = []
    for d in root.iterdir():
        if not d.is_dir() or d.name.startswith("."):
            continue
        for zf in d.glob("*.zip"):
            extract_dir = d / zf.stem
            if extract_dir.exists():
                continue
            try:
                print(f"  [ZIP] Extracting {d.name}/{zf.name}...", end=" ")
                with zipfile.ZipFile(zf, "r") as z:
                    z.extractall(extract_dir)
                extracted.append(extract_dir)
                print(f"-> {extract_dir.name}/")
            except Exception as e:
                print(f"FAILED: {e}")
    return extracted


# ---------------------------------------------------------------------------
# Step 2: Sort files by type
# ---------------------------------------------------------------------------

FILE_CATEGORIES = {
    "csv":   {".csv"},
    "xlsx":  {".xlsx", ".xls"},
    "json":  {".json", ".jsonl"},
    "txt":   {".txt"},
    "md":    {".md"},
    "pdf":   {".pdf"},
    "docx":  {".docx"},
    "other": set(),  # everything else
}


def classify_file(path: Path) -> str:
    """Return the category name for a file."""
    for cat, exts in FILE_CATEGORIES.items():
        if path.suffix.lower() in exts:
            return cat
    return "other"


def scan_files(root: Path, max_dirs: int | None = None) -> dict[str, list[Path]]:
    """Scan all dataset dirs and return files grouped by category."""
    grouped: dict[str, list[Path]] = {cat: [] for cat in FILE_CATEGORIES}
    subdirs = sorted([
        d for d in root.iterdir()
        if d.is_dir() and not d.name.startswith(".")
    ])
    if max_dirs:
        subdirs = subdirs[:max_dirs]

    for d in subdirs:
        for fp in d.rglob("*"):
            if not fp.is_file() or fp.name.startswith("."):
                continue
            # Skip files > 200 MB
            if fp.stat().st_size > 200 * 1024 * 1024:
                continue
            cat = classify_file(fp)
            grouped.setdefault(cat, []).append(fp)
    return grouped


# ---------------------------------------------------------------------------
# Step 3: Tabular file loaders
# ---------------------------------------------------------------------------

def load_csv(path: Path) -> pd.DataFrame | None:
    for sep in [",", ";", "\t", "|"]:
        try:
            df = pd.read_csv(path, sep=sep, nrows=5, encoding="utf-8",
                             errors="replace", on_bad_lines="skip")
            if df.shape[1] >= 2:
                return pd.read_csv(path, sep=sep, encoding="utf-8",
                                   errors="replace", on_bad_lines="skip",
                                   low_memory=False)
        except Exception:
            continue
    return None


def load_json(path: Path) -> pd.DataFrame | None:
    try:
        return pd.read_json(path, lines=False)
    except ValueError:
        try:
            return pd.read_json(path, lines=True)
        except Exception:
            return None
    except Exception:
        return None


def load_tabular(path: Path) -> pd.DataFrame | None:
    ext = path.suffix.lower()
    try:
        if ext == ".csv":
            return load_csv(path)
        if ext in (".json", ".jsonl"):
            return load_json(path)
        if ext == ".parquet":
            return pd.read_parquet(path)
        if ext in (".xlsx", ".xls"):
            return pd.read_excel(path)
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# Step 3b: PDF / DOCX extraction
# ---------------------------------------------------------------------------

def extract_pdf(path: Path) -> str | None:
    try:
        from pypdf import PdfReader
        reader = PdfReader(str(path))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        return clean_text(text)
    except Exception:
        return None


def extract_docx(path: Path) -> str | None:
    try:
        from docx import Document
        doc = Document(str(path))
        text = "\n".join(p.text for p in doc.paragraphs)
        return clean_text(text)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Step 3c: Extract rows from a DataFrame
# ---------------------------------------------------------------------------

def extract_rows_from_df(df: pd.DataFrame, source_name: str,
                         file_type: str) -> list[dict]:
    """Yield dicts with cleaned resume/job/skills/category fields."""
    df = normalize_columns(df)
    rows: list[dict] = []

    if "resume_text" not in df.columns:
        text_cols = df.select_dtypes(include=["object", "string"]).columns.tolist()
        if text_cols:
            best = max(text_cols, key=lambda c: df[c].astype(str).str.len().max())
            df = df.rename(columns={best: "resume_text"})
    if "resume_text" not in df.columns:
        return rows

    for _, row in df.iterrows():
        rtext = clean_text(row.get("resume_text", ""))
        if len(rtext.split()) < 10:
            continue
        entry: dict = {
            "resume_text": rtext,
            "source": source_name,
            "file_type": file_type,
        }
        if "job_text" in df.columns:
            jt = clean_text(row.get("job_text", ""))
            if jt:
                entry["job_text"] = jt
        if "category" in df.columns:
            entry["category"] = str(row.get("category", "")).strip()
        if "skills" in df.columns:
            sk = row.get("skills", "")
            if isinstance(sk, str):
                entry["skills"] = sk.strip()
            elif isinstance(sk, (list, np.ndarray)):
                entry["skills"] = ", ".join(str(s) for s in sk)
        rows.append(entry)
    return rows


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def run_pipeline(
    input_dir: Path,
    output_dir: Path,
    quick_test: bool = False,
    skip_pairs: bool = False,
    max_pairs_per_resume: int = 5,
) -> dict[str, Any]:
    """Run the full preprocessing pipeline. Returns stats dict."""
    stats: dict[str, Any] = {
        "started_at": time.time(),
        "input_dir": str(input_dir),
        "output_dir": str(output_dir),
        "datasets_processed": 0,
        "files_by_type": {},
        "total_files": 0,
        "extracted_rows": 0,
        "final_rows": 0,
        "pairs_generated": 0,
    }

    output_dir.mkdir(parents=True, exist_ok=True)

    # ---- Step 1: Extract zips ----
    if not quick_test:
        print("\n" + "=" * 60)
        print("STEP 1: Extracting .zip archives")
        print("=" * 60)
        extracted = extract_zips(input_dir)
        print(f"  Extracted {len(extracted)} zip archives\n")

    # ---- Step 2: Scan & sort files ----
    print("=" * 60)
    print("STEP 2: Scanning & sorting files by type")
    print("=" * 60)
    max_dirs = 10 if quick_test else None
    grouped = scan_files(input_dir, max_dirs=max_dirs)
    for cat, files in grouped.items():
        if cat == "other":
            continue
        stats["files_by_type"][cat] = len(files)
        stats["total_files"] += len(files)
        print(f"  {cat}: {len(files)} files")
    print(f"  other: {len(grouped.get('other', []))} files (skipped)")
    print(f"  Total supported: {stats['total_files']}")
    datasets_processed = len([
        d for d in input_dir.iterdir() if d.is_dir() and not d.name.startswith(".")
    ])
    if max_dirs:
        datasets_processed = min(datasets_processed, max_dirs)
    stats["datasets_processed"] = datasets_processed
    print(f"  Datasets scanned: {datasets_processed}\n")

    # ---- Step 3: Extract text from all files ----
    print("=" * 60)
    print("STEP 3: Extracting text content")
    print("=" * 60)
    all_rows: list[dict] = []

    # 3a: Tabular files (CSV, XLSX, JSON, JSONL)
    for cat in ("csv", "xlsx", "json"):
        for fp in grouped.get(cat, []):
            rel = Path(*fp.relative_to(input_dir).parts[-2:])
            df = load_tabular(fp)
            if df is not None and len(df) > 0:
                rows = extract_rows_from_df(df, str(rel), cat)
                if rows:
                    all_rows.extend(rows)

    # 3b: Plain text files (TXT, MD) — treat each file as a resume
    for cat in ("txt", "md"):
        for fp in grouped.get(cat, []):
            rel = Path(*fp.relative_to(input_dir).parts[-2:])
            try:
                text = clean_text(fp.read_text(encoding="utf-8", errors="replace"))
                if text and len(text.split()) >= 10:
                    all_rows.append({
                        "resume_text": text,
                        "source": str(rel),
                        "file_type": cat,
                    })
            except Exception:
                pass

    # 3c: PDF files
    for fp in grouped.get("pdf", []):
        rel = Path(*fp.relative_to(input_dir).parts[-2:])
        text = extract_pdf(fp)
        if text and len(text.split()) >= 10:
            all_rows.append({
                "resume_text": text,
                "source": str(rel),
                "file_type": "pdf",
            })

    # 3d: DOCX files
    for fp in grouped.get("docx", []):
        rel = Path(*fp.relative_to(input_dir).parts[-2:])
        text = extract_docx(fp)
        if text and len(text.split()) >= 10:
            all_rows.append({
                "resume_text": text,
                "source": str(rel),
                "file_type": "docx",
            })

    stats["extracted_rows"] = len(all_rows)
    print(f"  Total rows extracted: {len(all_rows)}\n")

    if not all_rows:
        print("  No data extracted! Generating synthetic fallback...")
        SAMPLE_SKILLS = ['Python', 'Java', 'SQL', 'React', 'Docker', 'AWS',
                         'Machine Learning', 'Kubernetes', 'PostgreSQL',
                         'MongoDB', 'FastAPI', 'TensorFlow']
        SAMPLE_TITLES = ['Software Engineer', 'Data Scientist', 'DevOps Engineer',
                         'ML Engineer', 'Backend Developer', 'Full Stack Developer']
        for i in range(200):
            skills = ', '.join(np.random.choice(SAMPLE_SKILLS, size=np.random.randint(3, 8), replace=False))
            title = np.random.choice(SAMPLE_TITLES)
            resume = f"{title} with expertise in {skills}. "
            resume += f"Experienced in building scalable applications using {skills}."
            job = f"We are hiring a {title} with skills in {', '.join(np.random.choice(SAMPLE_SKILLS, size=4))}."
            all_rows.append({
                "resume_text": resume,
                "job_text": job,
                "source": "synthetic",
                "file_type": "synthetic",
                "category": title,
                "skills": skills,
            })
        print(f"  Generated {len(all_rows)} synthetic rows\n")

    # ---- Step 4: Consolidate & Deduplicate ----
    print("=" * 60)
    print("STEP 4: Consolidating & Deduplicating")
    print("=" * 60)
    df = pd.DataFrame(all_rows)
    df = df.drop_duplicates(subset=["resume_text"])
    stats["final_rows"] = len(df)
    print(f"  Before dedup: {len(all_rows)}")
    print(f"  After dedup:  {len(df)}")

    # Save consolidated CSV
    consolidated_path = output_dir / "consolidated_resumes.csv"
    df.to_csv(consolidated_path, index=False, quoting=csv.QUOTE_ALL)
    size_mb = os.path.getsize(consolidated_path) / 1024**2
    print(f"  Saved: {consolidated_path} ({size_mb:.1f} MB)")

    # Print column stats
    print(f"\n  Columns: {list(df.columns)}")
    for col in ["job_text", "category", "skills"]:
        if col in df.columns:
            print(f"  With {col}: {df[col].notna().sum()}")
    df_size = df.memory_usage(deep=True).sum() / 1024**2
    print(f"  DataFrame size: {df_size:.1f} MB\n")

    # ---- Step 5: Save text-only corpus ----
    print("=" * 60)
    print("STEP 4b: Saving plain text corpus")
    print("=" * 60)
    corpus_path = output_dir / "corpus.txt"
    with open(corpus_path, "w", encoding="utf-8") as f:
        for text in df["resume_text"].tolist():
            f.write(text + "\n")
        if "job_text" in df.columns:
            for text in df["job_text"].dropna().tolist():
                f.write(str(text) + "\n")
    corpus_mb = os.path.getsize(corpus_path) / 1024**2
    print(f"  Saved: {corpus_path} ({corpus_mb:.1f} MB)")
    stats["corpus_size_mb"] = corpus_mb

    # ---- Step 6: Generate training pairs ----
    if not skip_pairs and len(all_rows) >= 50:
        print("\n" + "=" * 60)
        print("STEP 5: Generating Resume-Job Training Pairs")
        print("=" * 60)
        pairs = generate_pairs(all_rows, max_pairs_per_resume)
        if pairs:
            pairs_df = pd.DataFrame(pairs)
            pairs_df = pairs_df.drop_duplicates(subset=["resume_text", "job_text"])
            pairs_path = output_dir / "training_pairs.csv"
            pairs_df.to_csv(pairs_path, index=False, quoting=csv.QUOTE_ALL)
            stats["pairs_generated"] = len(pairs_df)
            print(f"  Saved: {pairs_path} ({len(pairs_df)} pairs)")
            print(f"  Positive (label>0.5): {(pairs_df['label'] > 0.5).sum()}")
            print(f"  Negative (label==0):  {(pairs_df['label'] == 0).sum()}")
        else:
            print("  No pairs generated (not enough categorized data)")
    else:
        print("\nSkipping pair generation")

    # Stats summary
    stats["elapsed_seconds"] = time.time() - stats["started_at"]
    stats["consolidated_size_mb"] = size_mb

    print("\n" + "=" * 60)
    print("PREPROCESSING COMPLETE")
    print("=" * 60)
    print(f"  Datasets scanned:  {stats['datasets_processed']}")
    print(f"  Files processed:   {stats['total_files']}")
    print(f"  Rows extracted:    {stats['extracted_rows']}")
    print(f"  After dedup:       {stats['final_rows']}")
    if stats["pairs_generated"]:
        print(f"  Training pairs:    {stats['pairs_generated']}")
    print(f"  Corpus size:       {stats.get('corpus_size_mb', 0):.1f} MB")
    print(f"  Elapsed:           {stats['elapsed_seconds']:.1f}s")
    print("=" * 60)

    return stats


# ---------------------------------------------------------------------------
# Training pair generation
# ---------------------------------------------------------------------------

SKILL_KEYWORDS = [
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
    "react", "angular", "vue", "node.js", "django", "flask", "fastapi",
    "spring", "spring boot", "sql", "postgresql", "mysql", "mongodb",
    "redis", "docker", "kubernetes", "aws", "azure", "gcp",
    "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy",
    "machine learning", "deep learning", "nlp", "computer vision",
    "tableau", "power bi", "git", "linux", "rest api", "graphql",
    "html", "css", "tailwind", "bootstrap",
    "agile", "scrum", "jira", "ci/cd", "jenkins",
    "data science", "data analysis", "data engineering",
    "devops", "mlops", "frontend", "backend", "full stack",
]


def extract_skills(text: str) -> set[str]:
    lower = f" {text.lower()} "
    matched = set()
    for skill in SKILL_KEYWORDS:
        if re.search(r"(?<!\w)" + re.escape(skill) + r"(?!\w)", lower):
            matched.add(skill)
    return matched


def generate_pairs(
    rows: list[dict],
    max_pairs_per_resume: int = 5,
) -> list[dict]:
    """Create resume-job description training pairs for SBERT."""
    by_category: dict[str, list[dict]] = {}
    for r in rows:
        cat = r.get("category", "").strip()
        if cat:
            by_category.setdefault(cat, []).append(r)

    pairs: list[dict] = []
    seen: set[tuple[str, str]] = set()

    def add_pair(res: dict, job: dict, label: float):
        key = (res.get("resume_text", "")[:100], job.get("resume_text", "")[:100])
        if key in seen:
            return
        seen.add(key)
        pairs.append({
            "resume_text": res["resume_text"],
            "job_text": job["resume_text"],
            "label": label,
        })

    # Positive pairs: same category
    for cat, cat_rows in by_category.items():
        if len(cat_rows) < 2:
            continue
        for i, res in enumerate(cat_rows):
            candidates = [r for j, r in enumerate(cat_rows) if j != i]
            for job in candidates[:max_pairs_per_resume]:
                add_pair(res, job, 1.0)

    # Positive pairs: skills overlap
    for i, res in enumerate(rows):
        res_skills = extract_skills(res["resume_text"])
        if not res_skills:
            continue
        candidates = 0
        for j in range(i + 1, len(rows)):
            if candidates >= max_pairs_per_resume:
                break
            job = rows[j]
            job_skills = extract_skills(job["resume_text"])
            if not job_skills:
                continue
            overlap = len(res_skills & job_skills) / max(1, len(res_skills | job_skills))
            if overlap >= 0.3:
                add_pair(res, job, overlap)
                candidates += 1

    # Negative pairs: different categories
    cats = list(by_category.keys())
    for i, cat1 in enumerate(cats):
        for cat2 in cats[i + 1:]:
            neg_count = 0
            for res in by_category[cat1][:10]:
                for job in by_category[cat2][:10]:
                    if neg_count >= max_pairs_per_resume * 2:
                        break
                    add_pair(res, job, 0.0)
                    neg_count += 1

    return pairs


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Resumate data preprocessor: clean, convert, and consolidate ~21 GB of resume datasets"
    )
    parser.add_argument(
        "--input",
        type=str,
        default=str(Path(__file__).resolve().parents[1] / "datasets"),
        help="Path to datasets directory",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=str(Path(__file__).resolve().parents[1] / "runtime" / "training_data"),
        help="Output directory for preprocessed data",
    )
    parser.add_argument(
        "--quick-test",
        action="store_true",
        help="Process only 10 datasets for quick validation",
    )
    parser.add_argument(
        "--max-pairs",
        type=int,
        default=5,
        help="Max training pairs per resume",
    )
    parser.add_argument(
        "--skip-pairs",
        action="store_true",
        help="Skip training pair generation",
    )
    args = parser.parse_args()

    input_dir = Path(args.input)
    output_dir = Path(args.output)

    if not input_dir.exists():
        print(f"ERROR: Input directory not found: {input_dir}")
        sys.exit(1)

    stats = run_pipeline(
        input_dir=input_dir,
        output_dir=output_dir,
        quick_test=args.quick_test,
        skip_pairs=args.skip_pairs,
        max_pairs_per_resume=args.max_pairs,
    )

    # Save stats as JSON
    stats_path = output_dir / "preprocess_stats.json"
    with open(stats_path, "w") as f:
        json.dump(stats, f, indent=2, default=str)
    print(f"Stats saved: {stats_path}")


if __name__ == "__main__":
    main()
