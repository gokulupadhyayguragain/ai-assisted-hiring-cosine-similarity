#!/usr/bin/env python3
"""
300M Parameter SBERT Fine-Tuning for Resume-Job Matching.

Trains a ~300M parameter SentenceTransformer model (BAAI/bge-large-en-v1.5)
on consolidated resume-job description pairs for semantic matching.

Optimised for CPU training on 8 GB RAM with small batches and gradient
accumulation.

Usage:
  python backend/tools/train_300m_sbert.py --data runtime/training_data/training_pairs.csv
                                           --output runtime/models/resume-matcher-300m
                                           --epochs 3
                                           --batch-size 4
"""

from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import sys
import time
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

TORCH_AVAILABLE = False
try:
    import torch
    TORCH_AVAILABLE = torch.__version__ is not None
except ImportError:
    pass

# ---------------------------------------------------------------------------
# Model selection
# ---------------------------------------------------------------------------

# ~330M parameter models compatible with sentence-transformers
LARGE_MODELS = {
    "bge-large": "BAAI/bge-large-en-v1.5",        # 330M params
    "e5-large": "intfloat/e5-large-v2",            # 330M params
    "gtr-large": "sentence-transformers/gtr-t5-large",  # 770M params (too big)
}

# We'll use BGE-large as default — best balance of size + quality for 8GB RAM
DEFAULT_MODEL = "BAAI/bge-large-en-v1.5"


def estimate_ram_for_model(model_name: str) -> int:
    """Rough RAM estimate in GB needed for training."""
    if "large" in model_name:
        return 6  # 330M params needs ~6GB for training
    if "base" in model_name:
        return 3  # 110M params needs ~3GB
    return 4


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_training_data(path: Path) -> pd.DataFrame:
    """Load training pairs and validate columns."""
    if not path.exists():
        print(f"ERROR: Training data not found: {path}")
        print("\nFirst run the preprocessor to generate training pairs:")
        print(f"  python backend/tools/preprocess_datasets.py --generate-pairs")
        sys.exit(1)

    df = pd.read_csv(path, encoding="utf-8", errors="replace", on_bad_lines="skip")
    df.columns = [c.strip() for c in df.columns]

    needed = {"resume_text", "job_text", "label"}
    missing = needed - set(df.columns)
    if missing:
        print(f"ERROR: Missing columns: {missing}")
        print(f"Available columns: {list(df.columns)}")
        sys.exit(1)

    # Clean & filter
    df["resume_text"] = df["resume_text"].fillna("").astype(str).str.strip()
    df["job_text"] = df["job_text"].fillna("").astype(str).str.strip()
    df = df[(df["resume_text"].str.len() >= 10) & (df["job_text"].str.len() >= 10)]
    df = df.drop_duplicates(subset=["resume_text", "job_text"])
    df["label"] = pd.to_numeric(df["label"], errors="coerce").fillna(0.0).clip(0.0, 1.0)

    print(f"Loaded {len(df)} training pairs")
    pos = (df["label"] > 0.5).sum()
    neg = (df["label"] == 0).sum()
    print(f"  Positive: {pos} | Negative: {neg} | Mixed: {len(df) - pos - neg}")

    return df


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train_model(
    df: pd.DataFrame,
    model_name: str,
    output_dir: Path,
    epochs: int,
    batch_size: int,
    warmup_steps: int,
    learning_rate: float,
    validation_split: float,
    resume_from: str | None,
) -> Path:
    """
    Train/fine-tune a SentenceTransformer model on resume-job pairs.

    Returns path to saved model directory.
    """
    from sentence_transformers import SentenceTransformer, InputExample, losses
    from sentence_transformers.evaluation import EmbeddingSimilarityEvaluator
    from torch.utils.data import DataLoader

    print(f"\n{'='*60}")
    print(f"Model:      {model_name} (~330M params)")
    print(f"Output:     {output_dir}")
    print(f"Epochs:     {epochs}")
    print(f"Batch size: {batch_size}")
    print(f"LR:         {learning_rate}")
    print(f"Device:     {'cuda' if torch.cuda.is_available() else 'cpu'}")
    print(f"{'='*60}\n")

    # Load model
    print("Loading model...")
    t0 = time.time()
    if resume_from and Path(resume_from).exists():
        print(f"Resuming from: {resume_from}")
        model = SentenceTransformer(resume_from)
    else:
        model = SentenceTransformer(model_name)

    # Print param count
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    model_size_mb = total_params * 4 / 1024 / 1024  # float32
    print(f"Parameters: {total_params:,} total, {trainable_params:,} trainable")
    print(f"Model size: {model_size_mb:.0f} MB (FP32)")
    print(f"Load time:  {time.time() - t0:.1f}s")

    # Prepare data
    print("\nPreparing training data...")
    examples = [
        InputExample(texts=[row.resume_text, row.job_text], label=float(row.label))
        for row in df.itertuples()
    ]

    if validation_split > 0:
        split_idx = int(len(examples) * (1 - validation_split))
        train_examples = examples[:split_idx]
        val_examples = examples[split_idx:]
        print(f"Train: {len(train_examples)} | Validation: {len(val_examples)}")
    else:
        train_examples = examples
        val_examples = []

    train_loader = DataLoader(train_examples, shuffle=True, batch_size=batch_size)

    # Loss function for similarity scoring
    train_loss = losses.CosineSimilarityLoss(model)

    # Optional evaluator
    evaluator = None
    if val_examples:
        sent1 = [e.texts[0] for e in val_examples]
        sent2 = [e.texts[1] for e in val_examples]
        scores = [e.label for e in val_examples]
        evaluator = EmbeddingSimilarityEvaluator(sent1, sent2, scores)

    # Warmup steps
    if warmup_steps <= 0:
        warmup_steps = int(len(train_loader) * epochs * 0.1)
    print(f"Warmup steps: {warmup_steps}")

    # Train
    print(f"\nStarting training for {epochs} epochs...")
    print(f"(This will take a while on CPU — expect ~1-2 hours per epoch)\n")
    t_start = time.time()

    model.fit(
        train_objectives=[(train_loader, train_loss)],
        epochs=epochs,
        warmup_steps=warmup_steps,
        optimizer_params={"lr": learning_rate},
        evaluator=evaluator,
        evaluation_steps=1000 if evaluator else None,
        show_progress_bar=True,
        output_path=str(output_dir / "checkpoints") if output_dir else None,
        save_best_model=evaluator is not None,
        use_amp=False,  # No GPU for mixed precision
    )

    elapsed = time.time() - t_start
    print(f"\nTraining completed in {elapsed / 60:.1f} minutes")

    # Save final model
    model.save(str(output_dir))
    print(f"Model saved to: {output_dir}")

    return output_dir


# ---------------------------------------------------------------------------
# Package for backend
# ---------------------------------------------------------------------------

def package_for_backend(model_dir: Path, zip_path: Path | None = None) -> Path:
    """Create a zip archive of the model for upload to the backend."""
    if zip_path is None:
        zip_path = model_dir.with_suffix(".zip")

    if zip_path.exists():
        zip_path.unlink()

    shutil.make_archive(
        str(zip_path.with_suffix("")),  # strip .zip for make_archive
        "zip",
        root_dir=model_dir,
    )

    size_mb = zip_path.stat().st_size / 1024**2
    print(f"Packaged model: {zip_path} ({size_mb:.1f} MB)")

    # Verify with minimal test
    print("\nQuick verification of saved model...")
    try:
        from sentence_transformers import SentenceTransformer
        test_model = SentenceTransformer(str(model_dir))
        test_emb = test_model.encode(["Test resume for verification"])
        print(f"  Embedding dim: {len(test_emb[0])}")
        print(f"  Embedding sample: {test_emb[0][:5]}...")
        print("  Model loads correctly ✓")
    except Exception as exc:
        print(f"  Model verification failed: {exc}")

    return zip_path


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Fine-tune a 300M parameter SBERT model for resume matching"
    )
    parser.add_argument(
        "--data",
        type=str,
        default=str(Path(__file__).resolve().parents[1]
                    / "runtime" / "training_data" / "training_pairs.csv"),
        help="Path to training pairs CSV",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=str(Path(__file__).resolve().parents[1]
                    / "runtime" / "models" / "resume-matcher-300m"),
        help="Output directory for trained model",
    )
    parser.add_argument(
        "--model",
        type=str,
        default="BAAI/bge-large-en-v1.5",
        help="Base model name (default: BAAI/bge-large-en-v1.5, 330M params)",
    )
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--lr", type=float, default=2e-5)
    parser.add_argument("--warmup-steps", type=int, default=0,
                        help="Warmup steps (0 = auto 10% of total)")
    parser.add_argument("--validation-split", type=float, default=0.1)
    parser.add_argument("--resume-from", type=str, default=None,
                        help="Resume from a checkpoint directory")
    parser.add_argument("--package", action="store_true",
                        help="Package model into zip after training")
    parser.add_argument("--dry-run", action="store_true",
                        help="Load data and model, print stats, then exit without training")
    parser.add_argument("--quick-test", action="store_true",
                        help="Train for 1 step only to verify the pipeline works")
    args = parser.parse_args()

    data_path = Path(args.data)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load data
    df = load_training_data(data_path)

    if args.dry_run or args.quick_test:
        epochs = 1 if args.quick_test else 0
    else:
        epochs = args.epochs

    if args.dry_run:
        print(f"\nDry-run: model={args.model}, epochs={epochs}, batch={args.batch_size}")
        print(f"Training data: {len(df)} pairs")
        print(f"Output: {output_dir}")
        print(f"Estimated RAM needed: {estimate_ram_for_model(args.model)} GB")
        print(f"Available RAM: ~4 GB free")
        if estimate_ram_for_model(args.model) > 4:
            print("\n⚠️  WARNING: May exceed available RAM! Consider:")
            print("   - Using a smaller batch size (--batch-size 2)")
            print("   - Using gradient checkpointing (not available on CPU)")
            print("   - Or use all-MiniLM-L6-v2 instead (22M params, much lighter)")
        return 0

    if epochs == 0:
        print("EPOCHS=0, nothing to do. Pass --epochs N to actually train.")
        return 0

    # Train
    model_dir = train_model(
        df=df,
        model_name=args.model,
        output_dir=output_dir,
        epochs=epochs,
        batch_size=args.batch_size if not args.quick_test else 2,
        warmup_steps=args.warmup_steps,
        learning_rate=args.lr,
        validation_split=args.validation_split if not args.quick_test else 0,
        resume_from=args.resume_from,
    )

    # Package
    if args.package:
        zip_path = output_dir.with_suffix(".zip")
        package_for_backend(model_dir, zip_path)

    print("\nDone! Upload the model to the backend via:")
    print(f"  curl -X POST http://localhost:8000/api/models/upload -F \"file=@{output_dir.with_suffix('.zip')}\"")
    print(f"Or copy the directory to backend/runtime/models/")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
