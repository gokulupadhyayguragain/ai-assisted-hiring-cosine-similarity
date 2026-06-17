FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install CPU-optimised torch + sentence-transformers (for BGE Small EN embeddings)
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    torch>=2.0.0 \
    sentence-transformers>=3.0.0

# Install spaCy model (lightweight, ~12 MB)
RUN python -m spacy download en_core_web_sm

# Install Qwen2.5 dependencies (for LLM-powered candidate summaries)
# Note: 4-bit quantization via bitsandbytes requires GPU.
# On CPU, the model loads in float16 (uses ~6 GB RAM, within 8 GB budget).
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    transformers>=4.30.0 \
    accelerate>=0.25.0

COPY backend ./backend

# Make startup script executable
RUN chmod +x /app/backend/startup.sh

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
