import importlib
import io
import zipfile
from pathlib import Path

from fastapi.testclient import TestClient


def make_dummy_package_bytes() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("README.txt", "Dummy packaged SBERT model for tests")
        zf.writestr("config.json", "{\"dummy\": true}")
        zf.writestr("model.bin", "DUMMY")
    return buf.getvalue()


def test_upload_packaged_model_and_reload_engine(monkeypatch, tmp_path: Path):
    # ensure server will attempt to use packaged models
    monkeypatch.setenv("ENABLE_SBERT", "1")

    main = importlib.import_module("backend.app.main")
    importlib.reload(main)

    client = TestClient(main.app)

    data = make_dummy_package_bytes()
    files = {"file": ("example-model.zip", data, "application/zip")}
    response = client.post("/api/models/upload", files=files)
    assert response.status_code == 200
    payload = response.json()
    assert payload.get("uploaded") is True
    path = Path(payload.get("path"))
    # server returned a path relative to backend runtime; it should exist on disk
    assert path.exists()

    # recreate ENGINE so it notices packaged models (if sentence-transformers available)
    main.ENGINE = importlib.import_module("backend.app.services.matching").MatchingEngine()
    health = client.get("/health").json()
    assert health["semantic_enabled"] is True
    # semantic_model may be local fallback if sentence-transformers missing; ensure key present
    assert "semantic_model" in health