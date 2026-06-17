#!/bin/sh
# ===========================================================================
# Resumate Backend Startup Script
# ===========================================================================
# The new recommended stack uses:
#   - BGE Small EN (via sentence-transformers, downloaded on first use)
#   - spaCy (en_core_web_sm downloaded in Dockerfile)
#   - TF-IDF + BM25 + Cosine Similarity
#   - Optional: Qwen2.5 3B Instruct (4-bit) for LLM-powered summaries
#
# No custom model files need to be copied — all models download on demand.
# ===========================================================================

# Start the backend server
exec uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
