from __future__ import annotations

import json
import hashlib
import os
from pathlib import Path
from typing import Any

try:
    import numpy as np
except Exception:  # pragma: no cover - numpy only needed when semantic enabled
    np = None  # type: ignore


ROOT = Path(__file__).resolve().parents[2]
EMBED_DIR = ROOT / "runtime" / "embeddings"
EMBED_DIR.mkdir(parents=True, exist_ok=True)


def _key_for_text(text: str) -> str:
    h = hashlib.sha256()
    h.update(text.encode("utf-8"))
    return h.hexdigest()


def _candidate_paths(key: str) -> list[Path]:
    return [EMBED_DIR / f"{key}.npy", EMBED_DIR / f"{key}.json"]


def _embedding_path(key: str) -> Path:
    if np is not None:
        return EMBED_DIR / f"{key}.npy"
    return EMBED_DIR / f"{key}.json"


def load_embedding_from_disk(key: str) -> Any | None:
    for path in _candidate_paths(key):
        if not path.exists():
            continue
        try:
            if path.suffix == ".npy" and np is not None:
                return np.load(str(path))
            with path.open("r", encoding="utf-8") as handle:
                return json.load(handle)
        except Exception:
            try:
                path.unlink()
            except Exception:
                pass
    return None


def save_embedding_to_disk(key: str, embedding: Any) -> None:
    try:
        path = _embedding_path(key)
        if np is not None:
            np.save(str(path), embedding)
            return
        with path.open("w", encoding="utf-8") as handle:
            json.dump(list(embedding), handle)
    except Exception:
        if path.exists():
            try:
                path.unlink()
            except Exception:
                pass


def cached_encode(model: Any, text: str):
    """Encode `text` with `model`, caching to disk by sha256 key.

    Returns a single embedding vector (numpy array or list), or None.
    """
    key = _key_for_text(text)
    emb = load_embedding_from_disk(key)
    if emb is not None:
        return emb
    try:
        embedding = model.encode([text], normalize_embeddings=True)
        # Unwrap single-element result regardless of type
        if hasattr(embedding, "shape") and len(embedding) == 1:
            embedding = embedding[0]
        elif isinstance(embedding, (list, tuple)) and len(embedding) == 1:
            embedding = embedding[0]
    except Exception:
        return None
    save_embedding_to_disk(key, embedding)
    return embedding


def precompute_embeddings(model: Any, texts: list[str]) -> list[dict[str, object]]:
    results: list[dict[str, object]] = []
    for text in texts:
        key = _key_for_text(text)
        cached = load_embedding_from_disk(key)
        if cached is None:
            cached = cached_encode(model, text)
        results.append(
            {
                "key": key,
                "cached": cached is not None,
                "length": len(text),
            }
        )
    return results
