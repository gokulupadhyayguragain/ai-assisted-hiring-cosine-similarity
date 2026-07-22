FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DEFAULT_TIMEOUT=300

WORKDIR /app

# ---- System dependencies ----
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# ---- Upgrade pip ----
RUN pip install --upgrade pip

# ---- Copy just the requirements file (for Docker layer caching) ----
COPY requirements.txt .

# ---- Core ML deps: torch + sentence-transformers + scikit-learn ----
# torch is installed separately with CPU index to avoid pulling CUDA deps
# --prefer-binary avoids compiling from source (huge time saver for packages like llama-cpp-python)
RUN pip install --no-cache-dir --timeout 300 --retries 5 --prefer-binary \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    torch>=2.0.0

# ---- Remaining Python dependencies (will be cached unless requirements.txt changes) ----
RUN pip install --no-cache-dir --timeout 300 --retries 5 --prefer-binary -r requirements.txt

# ---- spaCy model (lightweight, ~12 MB) ----
RUN python -m spacy download en_core_web_sm

# ---- Copy application code (this layer invalidates most, so keep it last) ----
COPY backend ./backend

# ---- Make startup script executable ----
RUN chmod +x /app/backend/startup.sh

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
