#!/usr/bin/env python3
"""
Tiny local training runner for Resumate.

Trains a small MiniBERT model (10M params) on the preprocessed data
for a quick end-to-end validation of the pipeline.

Usage:
  python backend/tools/train_tiny.py                                     # uses default paths
  python backend/tools/train_tiny.py --data runtime/training_data --model-size 10m
  python backend/tools/train_tiny.py --quick-test --epochs 1             # fastest test
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader


# ---------------------------------------------------------------------------
# Model configs
# ---------------------------------------------------------------------------

MODEL_CONFIGS: dict[str, dict[str, Any]] = {
    "10m": {
        "name": "Resumate-10M",
        "vocab_size": 30522,
        "hidden_dim": 256,
        "num_layers": 6,
        "num_heads": 4,
        "max_seq_len": 128,
        "batch_size": 16,
        "lr": 3e-4,
        "epochs": 3,
    },
    "50m": {
        "name": "Resumate-50M",
        "vocab_size": 30522,
        "hidden_dim": 512,
        "num_layers": 8,
        "num_heads": 8,
        "max_seq_len": 256,
        "batch_size": 8,
        "lr": 3e-4,
        "epochs": 5,
    },
}


# ---------------------------------------------------------------------------
# MiniBERT model
# ---------------------------------------------------------------------------

class MiniBERT(nn.Module):
    """Lightweight BERT-like model for resume-job similarity."""

    def __init__(self, vocab_size: int, hidden_dim: int, num_layers: int,
                 num_heads: int, max_seq_len: int):
        super().__init__()
        self.hidden_dim = hidden_dim
        self.max_seq_len = max_seq_len

        self.token_embedding = nn.Embedding(vocab_size, hidden_dim)
        self.position_embedding = nn.Embedding(max_seq_len, hidden_dim)
        self.layer_norm = nn.LayerNorm(hidden_dim)
        self.dropout = nn.Dropout(0.1)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim, nhead=num_heads,
            dim_feedforward=hidden_dim * 4, dropout=0.1,
            activation="gelu", batch_first=True,
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.pooler = nn.Sequential(nn.Linear(hidden_dim, hidden_dim), nn.Tanh())

    def forward(self, input_ids: torch.Tensor,
                attention_mask: torch.Tensor | None = None) -> torch.Tensor:
        seq_len = input_ids.size(1)
        positions = torch.arange(seq_len, device=input_ids.device).unsqueeze(0)
        x = self.token_embedding(input_ids) + self.position_embedding(positions)
        x = self.layer_norm(x)
        x = self.dropout(x)
        src_key_padding_mask = (attention_mask == 0) if attention_mask is not None else None
        x = self.encoder(x, src_key_padding_mask=src_key_padding_mask)
        return self.pooler(x[:, 0, :])

    def encode_pair(self, resume_ids, job_ids, resume_mask=None, job_mask=None):
        r_emb = self.forward(resume_ids, resume_mask)
        j_emb = self.forward(job_ids, job_mask)
        r_norm = r_emb / (r_emb.norm(dim=1, keepdim=True) + 1e-8)
        j_norm = j_emb / (j_emb.norm(dim=1, keepdim=True) + 1e-8)
        return (r_norm * j_norm).sum(dim=1)


# ---------------------------------------------------------------------------
# Dataset
# ---------------------------------------------------------------------------

class ResumeJobDataset(Dataset):
    def __init__(self, df: pd.DataFrame, tokenizer: Any, max_len: int):
        self.resumes = df["resume_text"].fillna("").astype(str).tolist()
        self.jobs = df.get("job_text", df["resume_text"]).fillna("").astype(str).tolist()
        self.labels = pd.to_numeric(df.get("label", pd.Series([0.5] * len(df))),
                                    errors="coerce").fillna(0.5).tolist()
        self.tokenizer = tokenizer
        self.max_len = max_len

    def __len__(self) -> int:
        return len(self.resumes)

    def __getitem__(self, idx: int) -> dict[str, torch.Tensor]:
        def encode(text: str):
            return self.tokenizer(
                text[:512], padding="max_length", truncation=True,
                max_length=self.max_len, return_tensors="pt",
            )
        r = encode(self.resumes[idx])
        j = encode(self.jobs[idx])
        return {
            "resume_ids": r["input_ids"].squeeze(0),
            "resume_mask": r["attention_mask"].squeeze(0),
            "job_ids": j["input_ids"].squeeze(0),
            "job_mask": j["attention_mask"].squeeze(0),
            "label": torch.tensor(self.labels[idx], dtype=torch.float),
        }


# ---------------------------------------------------------------------------
# Training loop
# ---------------------------------------------------------------------------

def train_model(
    data_dir: Path,
    output_dir: Path,
    model_size: str,
    epochs: int | None = None,
    quick_test: bool = False,
) -> Path:
    """Train a MiniBERT model on preprocessed data. Returns model path."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    cfg = MODEL_CONFIGS[model_size].copy()
    if epochs is not None:
        cfg["epochs"] = epochs
    if quick_test:
        cfg["epochs"] = 1
        cfg["batch_size"] = 8

    print(f"\nConfig:")
    for k, v in cfg.items():
        print(f"  {k}: {v}")
    print()

    # ---- Load tokenizer ----
    try:
        from transformers import AutoTokenizer
    except ImportError:
        print("Installing transformers...")
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "-q",
                        "transformers"], check=False)
        from transformers import AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
    print(f"Tokenizer loaded: bert-base-uncased")

    # ---- Load data ----
    pairs_path = data_dir / "training_pairs.csv"
    consolidated_path = data_dir / "consolidated_resumes.csv"

    if pairs_path.exists():
        print(f"Loading training pairs: {pairs_path}")
        df = pd.read_csv(pairs_path, encoding="utf-8", on_bad_lines="skip")
        print(f"  {len(df)} pairs loaded")
    elif consolidated_path.exists():
        print(f"No pairs found. Using consolidated data: {consolidated_path}")
        df = pd.read_csv(consolidated_path, encoding="utf-8", on_bad_lines="skip")
        # Create synthetic labels for non-paired data
        df["label"] = df.get("label", 0.5)
        # Use job_text if available, otherwise duplicate resume_text
        if "job_text" not in df.columns:
            df["job_text"] = df["resume_text"]
        print(f"  {len(df)} rows loaded")
    else:
        print("ERROR: No training data found in", data_dir)
        print("Run preprocess_full.py first.")
        sys.exit(1)

    # ---- Build model ----
    model = MiniBERT(
        vocab_size=cfg["vocab_size"],
        hidden_dim=cfg["hidden_dim"],
        num_layers=cfg["num_layers"],
        num_heads=cfg["num_heads"],
        max_seq_len=cfg["max_seq_len"],
    )
    total_params = sum(p.numel() for p in model.parameters())
    print(f"\nModel: MiniBERT-like ({total_params:,} params)")
    model = model.to(device)

    # ---- DataLoaders ----
    dataset = ResumeJobDataset(df, tokenizer, cfg["max_seq_len"])
    split = int(len(dataset) * 0.9)
    train_ds = torch.utils.data.Subset(dataset, range(split))
    val_ds = torch.utils.data.Subset(dataset, range(split, len(dataset)))
    train_loader = DataLoader(train_ds, batch_size=cfg["batch_size"], shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=cfg["batch_size"])
    print(f"Train: {len(train_ds)} | Val: {len(val_ds)}")

    # ---- Training ----
    optimizer = optim.AdamW(model.parameters(), lr=cfg["lr"], weight_decay=0.01)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=cfg["epochs"] * len(train_loader))
    criterion = nn.MSELoss()

    print(f"\nTraining for {cfg['epochs']} epoch(s)...")
    t_start = time.time()

    for epoch in range(cfg["epochs"]):
        model.train()
        total_loss = 0
        for batch in train_loader:
            r_ids = batch["resume_ids"].to(device)
            r_mask = batch["resume_mask"].to(device)
            j_ids = batch["job_ids"].to(device)
            j_mask = batch["job_mask"].to(device)
            labels = batch["label"].to(device)

            optimizer.zero_grad()
            scores = model.encode_pair(r_ids, j_ids, r_mask, j_mask)
            loss = criterion(scores, labels)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()
            total_loss += loss.item()

        # Validation
        model.eval()
        val_loss = 0
        with torch.no_grad():
            for batch in val_loader:
                r_ids = batch["resume_ids"].to(device)
                r_mask = batch["resume_mask"].to(device)
                j_ids = batch["job_ids"].to(device)
                j_mask = batch["job_mask"].to(device)
                labels = batch["label"].to(device)
                scores = model.encode_pair(r_ids, j_ids, r_mask, j_mask)
                val_loss += criterion(scores, labels).item()

        avg_loss = total_loss / max(1, len(train_loader))
        avg_val = val_loss / max(1, len(val_loader))
        elapsed = time.time() - t_start
        print(f"  Epoch {epoch+1}/{cfg['epochs']} | Loss: {avg_loss:.4f} | "
              f"Val: {avg_val:.4f} | {elapsed:.1f}s")

    total_time = time.time() - t_start
    print(f"\nTraining completed in {total_time:.1f}s")

    # ---- Save model ----
    model_dir = output_dir / cfg["name"]
    model_dir.mkdir(parents=True, exist_ok=True)

    torch.save({
        "model_state_dict": model.state_dict(),
        "config": {k: cfg[k] for k in ["vocab_size", "hidden_dim", "num_layers",
                                        "num_heads", "max_seq_len"]},
        "model_name": cfg["name"],
        "params": total_params,
        "trained_at": datetime.now().isoformat(),
    }, model_dir / "pytorch_model.bin")

    tokenizer.save_pretrained(model_dir)

    with open(model_dir / "config.json", "w") as f:
        json.dump({
            "model_name": cfg["name"],
            "model_type": "MiniBERT",
            "hidden_dim": cfg["hidden_dim"],
            "num_layers": cfg["num_layers"],
            "num_heads": cfg["num_heads"],
            "max_seq_len": cfg["max_seq_len"],
            "total_params": total_params,
            "embedding_dim": cfg["hidden_dim"],
        }, f, indent=2)

    print(f"Model saved to: {model_dir}")

    # ---- Quick evaluation ----
    print("\n--- Quick Evaluation ---")
    model.eval()
    test_resumes = [
        "Python developer with FastAPI, PostgreSQL, Docker, and AWS experience.",
        "Data scientist skilled in TensorFlow, PyTorch, and machine learning.",
        "Frontend engineer with React, TypeScript, and CSS expertise.",
    ]
    test_job = "Backend engineer with Python, FastAPI, SQL, and cloud experience."
    with torch.no_grad():
        for resume in test_resumes:
            r = tokenizer(resume, padding="max_length", truncation=True,
                          max_length=cfg["max_seq_len"], return_tensors="pt").to(device)
            j = tokenizer(test_job, padding="max_length", truncation=True,
                          max_length=cfg["max_seq_len"], return_tensors="pt").to(device)
            score = model.encode_pair(r["input_ids"], j["input_ids"],
                                      r["attention_mask"], j["attention_mask"])
            print(f"  {resume[:45]:45s} -> {score.item():.3f}")

    return model_dir


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Train a tiny MiniBERT model for resume-job matching"
    )
    parser.add_argument(
        "--data",
        type=str,
        default=str(Path(__file__).resolve().parents[1] / "runtime" / "training_data"),
        help="Directory with preprocessed data (consolidated_resumes.csv or training_pairs.csv)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=str(Path(__file__).resolve().parents[1] / "runtime" / "models"),
        help="Output directory for trained model",
    )
    parser.add_argument(
        "--model-size",
        type=str,
        default="10m",
        choices=list(MODEL_CONFIGS.keys()),
        help="Model size to train",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=None,
        help="Override number of epochs",
    )
    parser.add_argument(
        "--quick-test",
        action="store_true",
        help="Train for 1 epoch with smaller batch",
    )
    args = parser.parse_args()

    data_dir = Path(args.data)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    model_dir = train_model(
        data_dir=data_dir,
        output_dir=output_dir,
        model_size=args.model_size,
        epochs=args.epochs,
        quick_test=args.quick_test,
    )

    print(f"\nDone! Model at: {model_dir}")
    print(f"Upload to backend: curl -X POST http://localhost:8000/api/models/upload "
          f"-F \"file=@{model_dir}.zip\"")


if __name__ == "__main__":
    main()
