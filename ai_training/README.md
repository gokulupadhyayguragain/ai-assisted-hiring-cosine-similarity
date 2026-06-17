# AI Training Module

This module is **separate** from the backend and frontend. It handles everything related to:
- Dataset download & extraction
- Data cleaning & preprocessing
- Training models (from scratch and fine-tuning)
- Evaluation & packaging

## Pipeline Steps

Run all steps at once:
```bash
bash ai_training/run_pipeline.sh          # full pipeline (10m model)
bash ai_training/run_pipeline.sh 50m       # 50m model
bash ai_training/run_pipeline.sh 300m      # fine-tune 300m
bash ai_training/run_pipeline.sh --quick-test  # quick validation
```

Or run individual steps:

### Step 1: Dataset Download
Use the Kaggle Colab notebook to download datasets:
```
notebooks/kaggle_colab_train.ipynb
```
Or use local datasets/ folder directly.

### Step 2: Preprocess (Extract + Clean + Consolidate)
```bash
python ai_training/preprocess_full.py \
  --input datasets/ \
  --output ai_training/runtime/training_data
```

### Step 3: Train Model
From scratch (10m, 50m, 100m, 150m):
```bash
python ai_training/train_tiny.py --data ai_training/runtime/training_data
```

Fine-tune (300m):
```bash
python ai_training/train_300m_sbert.py --data ai_training/runtime/training_data/training_pairs.csv
```

### Step 4: Package for Backend
After training, the model is saved to `ai_training/runtime/models/`. Upload it to the backend:
```bash
curl -X POST http://localhost:8000/api/models/upload -F "file=@model.zip"
```

## Structure

```
ai_training/
  run_pipeline.sh                  # Orchestrator (runs all steps)
  preprocess_full.py               # Data cleaning & consolidation
  train_tiny.py                    # From-scratch MiniBERT training
  train_300m_sbert.py              # SentenceTransformer fine-tuning
  train_sbert.py                   # Basic SBERT training scaffold
  generate_synthetic_dataset.py    # Synthetic data generator
  unpack_archive.py                # Archive extraction utility
  requirements.txt                 # Heavy training deps (torch, etc.)
  Dockerfile                       # Training container
  scripts/                         # Kaggle scraping tools
  tests/                           # Training tests
