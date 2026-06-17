FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install system dependencies for torch and sentence-transformers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY ai_training/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ai_training ./ai_training

RUN mkdir -p /app/runtime/training_data /app/runtime/models

WORKDIR /app/ai_training

CMD ["python", "train_tiny.py", "--quick-test"]
