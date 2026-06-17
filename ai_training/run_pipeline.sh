#!/usr/bin/env bash
# =============================================================================
# Resumate - AI Training Pipeline Orchestrator
# =============================================================================
# Run all steps from data download through model packaging.
#
# Usage:
#   bash run_pipeline.sh              # full pipeline with 10m model
#   bash run_pipeline.sh 50m          # train a 50m model
#   bash run_pipeline.sh 300m         # fine-tune 300m BGE model
#   bash run_pipeline.sh --quick-test # fast validation with 1 epoch
#
# Steps:
#   1. DOWNLOAD  - Fetch datasets from Kaggle (or use local datasets/)
#   2. EXTRACT   - Unpack any .zip archives
#   3. PREPROCESS - Clean, normalize, extract text from all formats
#   4. GENERATE   - Create resume-job training pairs for SBERT
#   5. TRAIN      - Train the model (from-scratch or fine-tune)
#   6. EVALUATE   - Quick similarity test
#   7. PACKAGE    - Zip model for backend upload
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."

MODEL_SIZE="${1:-10m}"
EPOCHS="${EPOCHS:-}"
DEFAULT_DATA_DIR="${SCRIPT_DIR}/runtime/training_data"
DEFAULT_MODEL_DIR="${SCRIPT_DIR}/runtime/models"

# Validate model size
case "${MODEL_SIZE}" in
    10m|50m|100m|150m|300m) ;;
    *) echo "Error: Invalid model size '${MODEL_SIZE}'. Use: 10m, 50m, 100m, 150m, or 300m" >&2; exit 1 ;;
esac

QUICK_TEST=false
if [ "${MODEL_SIZE}" = "--quick-test" ]; then
    QUICK_TEST=true
    MODEL_SIZE="10m"
fi

echo ""
echo "===================================================="
echo "  Resumate AI Training Pipeline"
echo "  Model: ${MODEL_SIZE} | Quick test: ${QUICK_TEST}"
echo "===================================================="
echo ""

# ------- Step 1: Ensure datasets are available -------
if [ -d "${ROOT_DIR}/datasets" ]; then
    echo "[1/7] Datasets found at ${ROOT_DIR}/datasets/"
else
    echo "[1/7] No local datasets/ found. Use the Kaggle Colab notebook to download datasets first."
    echo "      See: ${ROOT_DIR}/notebooks/kaggle_colab_train.ipynb"
    exit 1
fi

# ------- Step 2: Preprocess (extract + clean + consolidate) -------
echo ""
echo "[2/7] Preprocessing all datasets (extract -> clean -> consolidate)..."
mkdir -p "${DEFAULT_DATA_DIR}"

if [ "${QUICK_TEST}" = true ]; then
    python "${SCRIPT_DIR}/preprocess_full.py" --input "${ROOT_DIR}/datasets" --output "${DEFAULT_DATA_DIR}" --quick-test --max-pairs 3
else
    python "${SCRIPT_DIR}/preprocess_full.py" --input "${ROOT_DIR}/datasets" --output "${DEFAULT_DATA_DIR}"
fi

echo "[2/7] Preprocessing complete!"

# ------- Step 3: Generate training pairs -------
# (built into preprocess_full.py --skip if already done)
# If you want to regenerate pairs with different settings:
# python "${SCRIPT_DIR}/preprocess_full.py" --input "${ROOT_DIR}/datasets" --output "${DEFAULT_DATA_DIR}" --skip-pairs
# Then run pair generation separately if needed

# ------- Step 4: Train model -------
echo ""
echo "[3/7] Training ${MODEL_SIZE} model..."
mkdir -p "${DEFAULT_MODEL_DIR}"

EPOCHS_FLAG=""
if [ -n "${EPOCHS}" ]; then
    EPOCHS_FLAG="--epochs ${EPOCHS}"
fi

if [ "${MODEL_SIZE}" = "300m" ]; then
    # Fine-tune SentenceTransformer
    if [ "${QUICK_TEST}" = true ]; then
        python "${SCRIPT_DIR}/train_300m_sbert.py" --data "${DEFAULT_DATA_DIR}/training_pairs.csv" --output "${DEFAULT_MODEL_DIR}/resume-matcher-300m" --epochs 1 --batch-size 2 --quick-test
    else
        python "${SCRIPT_DIR}/train_300m_sbert.py" --data "${DEFAULT_DATA_DIR}/training_pairs.csv" --output "${DEFAULT_MODEL_DIR}/resume-matcher-300m" ${EPOCHS_FLAG}
    fi
else
    # From-scratch MiniBERT training
    if [ "${QUICK_TEST}" = true ]; then
        python "${SCRIPT_DIR}/train_tiny.py" --data "${DEFAULT_DATA_DIR}" --output "${DEFAULT_MODEL_DIR}" --model-size "${MODEL_SIZE}" --quick-test
    else
        python "${SCRIPT_DIR}/train_tiny.py" --data "${DEFAULT_DATA_DIR}" --output "${DEFAULT_MODEL_DIR}" --model-size "${MODEL_SIZE}" ${EPOCHS_FLAG}
    fi
fi

echo "[3/7] Training complete!"

# ------- Step 5: Package model for backend -------
echo ""
echo "[4/7] Packaging trained model for backend upload..."

# Find the most recently created model directory
LATEST_MODEL=$(ls -td "${DEFAULT_MODEL_DIR}"/*/ 2>/dev/null | head -1)
if [ -n "${LATEST_MODEL}" ]; then
    MODEL_NAME=$(basename "${LATEST_MODEL}")
    ZIP_PATH="${DEFAULT_MODEL_DIR}/${MODEL_NAME}.zip"
    cd "${DEFAULT_MODEL_DIR}" && zip -r "${ZIP_PATH}" "${MODEL_NAME}" > /dev/null 2>&1
    echo "  Packaged: ${ZIP_PATH}"
    echo "  Size: $(du -h "${ZIP_PATH}" | cut -f1)"
    echo ""
    echo "  Upload to backend:"
    echo "  curl -X POST http://localhost:8000/api/models/upload -F \"file=@${ZIP_PATH}\""
else
    echo "  No trained model found to package."
fi

echo ""
echo "===================================================="
echo "  Pipeline Complete!"
echo "===================================================="
echo ""
echo "Model size:   ${MODEL_SIZE}"
echo "Training data: ${DEFAULT_DATA_DIR}"
echo "Model output:  ${DEFAULT_MODEL_DIR}"
echo ""
