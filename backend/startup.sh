#!/bin/sh
# ===========================================================================
# AIHire Backend Startup Script
# ===========================================================================
# The recommended stack uses:
#   - BGE Small EN (via sentence-transformers, downloaded on first analysis)
#   - spaCy (en_core_web_sm downloaded in Dockerfile)
#   - TF-IDF + BM25 + Cosine Similarity
#   - Optional: Qwen2.5 0.5B Instruct (GGUF) for LLM-powered summaries
#
# Models are downloaded on demand and cached in the HuggingFace cache
# (backed by the huggingface-cache Docker volume for persistence).
# The engine initialises lazily on first use so uvicorn starts immediately.
# ===========================================================================

echo "==> Starting uvicorn (embedding model loads on first analysis)..."

# Start the backend server
exec uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
