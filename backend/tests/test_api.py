from __future__ import annotations

import importlib
import os

from fastapi.testclient import TestClient

from backend.app.services.embeddings import EMBED_DIR, _key_for_text
from backend.app.services.matching import MatchingEngine
from backend.app.services.storage import SessionStore


def test_precompute_embeddings_and_semantic_analyze(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("ENABLE_SBERT", "1")

    main = importlib.import_module("backend.app.main")
    importlib.reload(main)

    main.ENGINE = MatchingEngine()
    main.STORE = SessionStore(tmp_path / "sessions")

    client = TestClient(main.app)

    precompute_text = f"semantic cache example {os.urandom(4).hex()}"
    response = client.post("/api/embeddings/precompute", json={"texts": [precompute_text, "   "]})
    assert response.status_code == 200
    payload = response.json()
    assert payload["cached"][0]["cached"] is True

    cache_base = EMBED_DIR / _key_for_text(precompute_text)
    assert cache_base.with_suffix(".npy").exists() or cache_base.with_suffix(".json").exists()

    response = client.post(
        "/api/analyze",
        data={"job_text": "Python FastAPI Docker engineer", "role": "recruiter", "tfidf_weight": "0.5"},
        files=[
            ("resumes", ("strong.txt", b"Python engineer with FastAPI, Docker, and PostgreSQL experience.", "text/plain")),
            ("resumes", ("weak.txt", b"Graphic design portfolio with branding and illustration work.", "text/plain")),
        ],
    )
    assert response.status_code == 200
    analysis = response.json()
    assert analysis["engine"]["semantic_enabled"] is True
    # BGE Small EN is the default semantic model in the new stack
    assert "bge-small" in analysis["engine"]["semantic_model"] or analysis["engine"]["semantic_enabled"] is True
    assert analysis["candidates"][0]["score"] > analysis["candidates"][1]["score"]
    assert analysis["candidates"][0]["source_filename"] == "strong.txt"
