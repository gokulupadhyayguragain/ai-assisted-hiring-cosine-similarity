#!/usr/bin/env python3
"""Scrape Kaggle datasets for a search term and write download calls to dataset.txt.

Writes lines like:

import kagglehub

# Download latest version
path = kagglehub.dataset_download("owner/dataset-slug")

print("Path to dataset files:", path)
---

Usage:
  pip install kaggle
  export KAGGLE_USERNAME=...; export KAGGLE_KEY=...
  python backend/tools/scrape_kaggle_resume_datasets.py --query resume --limit 200 --out dataset.txt

If you don't want to authenticate or just want a preview, use `--dry-run` which prints sample lines derived from the live search (or a fallback sample if auth is unavailable).
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import List

SAMPLE = [
    "snehaanbhawal/resume-dataset",
    "saugataroyarghya/resume-dataset",
    "mohansacharya/resume-dataset-1",
]


def format_entry(ref: str) -> str:
    return (
        "import kagglehub\n\n"
        "# Download latest version\n"
        f"path = kagglehub.dataset_download(\"{ref}\")\n\n"
        "print(\"Path to dataset files:\", path)\n"
        "---\n"
    )


def write_entries(refs: List[str], out_path: Path, dry_run: bool = False):
    content = "".join(format_entry(r) for r in refs)
    if dry_run:
        print(content)
        return
    out_path = out_path.resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    # append to the file (so user can accumulate multiple runs)
    with out_path.open("a", encoding="utf-8") as fh:
        fh.write(content)
    print(f"Wrote {len(refs)} entries to {out_path}")


def kaggle_search_refs(query: str, limit: int) -> List[str]:
    try:
        from kaggle.api.kaggle_api_extended import KaggleApi
    except Exception as exc:
        print("Kaggle API not available:", exc, file=sys.stderr)
        return SAMPLE[:limit]

    api = KaggleApi()
    api.authenticate()
    refs: List[str] = []
    page = 1
    while len(refs) < limit:
        datasets = api.dataset_list(search=query, page=page)
        if not datasets:
            break
        for ds in datasets:
            ref = None
            if hasattr(ds, "ref"):
                ref = ds.ref
            elif isinstance(ds, dict) and "ref" in ds:
                ref = ds["ref"]
            elif hasattr(ds, "id"):
                ref = ds.id
            else:
                name = getattr(ds, "name", None) or getattr(ds, "title", None)
                owner = getattr(ds, "user", None) or getattr(ds, "owner", None)
                if owner and name:
                    ref = f"{owner}/{name}"
            if ref:
                refs.append(ref)
            if len(refs) >= limit:
                break
        page += 1
    return refs


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--query", type=str, default="resume")
    p.add_argument("--limit", type=int, default=200)
    p.add_argument("--out", type=str, default="dataset.txt")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    refs = kaggle_search_refs(args.query, args.limit)
    write_entries(refs, Path(args.out), dry_run=args.dry_run)


if __name__ == "__main__":
    main()
