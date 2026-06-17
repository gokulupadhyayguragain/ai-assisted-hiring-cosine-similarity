"""Lightweight SBERT training scaffold and packaging helper.

This script intentionally provides a safe, container-friendly dry-run mode
that does not require heavy dependencies. When `sentence-transformers` is
available inside the container, the script can be extended to run a real
training loop; until then it creates a packaged dummy model that the
application can load via `/api/models/upload` for testing.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import tempfile
import shutil


def create_dummy_model(output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    # write a tiny metadata file that our server can detect as a packaged model
    (output_dir / "README.txt").write_text("Packaged SBERT-compatible placeholder model.\n")
    (output_dir / "config.json").write_text(json.dumps({"dummy": True}))
    # dummy binary to simulate model files
    (output_dir / "model.bin").write_bytes(b"DUMMY-MODEL")
    return output_dir


def run_training(data_dir: str | None, output_dir: str | None, epochs: int = 1, dry_run: bool = True) -> Path:
    """Run a dry training or packaging flow.

    - If `dry_run` is True, create a dummy packaged model at `output_dir`.
    - Returns the path to the created packaged model directory.
    """
    if output_dir is None:
        tmp = tempfile.mkdtemp(prefix="sbert-model-")
        output_dir = tmp
    out = Path(output_dir)
    if dry_run:
        return create_dummy_model(out)

    # Attempt to run a real training flow if sentence_transformers is installed.
    try:
        from sentence_transformers import SentenceTransformer, InputExample, losses
        from torch.utils.data import DataLoader
    except Exception as exc:  # pragma: no cover - heavy deps optional
        return create_dummy_model(out)

    # Real training branch (left intentionally minimal and safe):
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    # load training data if provided
    examples = []
    if data_dir:
        # Expect TSV with "text\tlabel" or similar — user must supply format
        for path in Path(data_dir).glob('**/*'):
            if path.is_file() and path.suffix in {'.txt', '.tsv'}:
                for line in path.read_text(encoding='utf-8', errors='ignore').splitlines():
                    if not line.strip():
                        continue
                    parts = line.split('\t')
                    examples.append(InputExample(texts=[parts[0]]))

    if not examples:
        # fallback to a tiny synthetic example so training API always works
        examples = [InputExample(texts=["Example sentence A", "Example sentence B"]) ]

    train_dataloader = DataLoader(examples, shuffle=True, batch_size=8)
    train_loss = losses.MultipleNegativesRankingLoss(model)
    model.fit(train_objectives=[(train_dataloader, train_loss)], epochs=epochs, show_progress_bar=False)

    # save model
    model.save(str(out))
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="SBERT training scaffold (dry-run safe)")
    parser.add_argument("--data", type=str, default=None, help="Path to training data")
    parser.add_argument("--output", type=str, default=None, help="Path to output model directory")
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--dry-run", action="store_true", help="Create a dummy packaged model and exit")
    args = parser.parse_args(argv)

    out = run_training(data_dir=args.data, output_dir=args.output, epochs=args.epochs, dry_run=args.dry_run)
    print(f"Model packaged at: {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
