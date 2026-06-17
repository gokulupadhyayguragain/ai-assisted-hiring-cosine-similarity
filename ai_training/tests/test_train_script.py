import tempfile
from pathlib import Path

from ai_training import train_sbert


def test_train_sbert_dry_run_creates_package(tmp_path: Path):
    outdir = tmp_path / "model_out"
    path = train_sbert.run_training(data_dir=None, output_dir=str(outdir), epochs=1, dry_run=True)
    assert outdir.exists()
    assert (outdir / "model.bin").exists()
    assert (outdir / "config.json").exists()