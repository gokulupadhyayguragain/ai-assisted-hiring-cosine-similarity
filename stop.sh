#!/usr/bin/env bash
#
# stop.sh — Stop the full AI-Hiring stack without removing containers.
#
# Containers are kept so the next ./start.sh is fast — just rebuilt layers
# get rebuilt and containers start quickly.
#
# Usage:
#   ./stop.sh                    # stop containers (keep them + data volumes)
#   ./stop.sh --volumes          # stop AND remove data volumes (DB/Redis wiped)
#   ./stop.sh --training         # include the ai-trainer (training profile) container
#   ./stop.sh --clean            # stop, remove containers AND volumes (same as ./delete.sh)
#
set -euo pipefail

cd "$(dirname "$0")"

COMPOSE_FILE="docker-compose.local.yml"

# ---- Detect docker compose flavour ----
if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC=(docker-compose)
else
  echo "ERROR: Docker Compose not found." >&2
  exit 1
fi

REMOVE_VOLUMES=0
WITH_TRAINING=0
CLEAN=0
for arg in "$@"; do
  case "$arg" in
    --volumes|-v) REMOVE_VOLUMES=1 ;;
    --training)   WITH_TRAINING=1 ;;
    --clean)      CLEAN=1 ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

PROFILE_ARGS=()
if [[ "$WITH_TRAINING" -eq 1 ]]; then
  PROFILE_ARGS=(--profile training)
fi

if [[ "$CLEAN" -eq 1 ]]; then
  echo "==> Stopping stack and removing ALL containers..."
  "${DC[@]}" -f "$COMPOSE_FILE" "${PROFILE_ARGS[@]}" down --remove-orphans
  echo "==> Containers removed."
elif [[ "$REMOVE_VOLUMES" -eq 1 ]]; then
  echo "==> Stopping stack and REMOVING data volumes..."
  "${DC[@]}" -f "$COMPOSE_FILE" "${PROFILE_ARGS[@]}" down --volumes --remove-orphans
  echo "==> Stack stopped. Data volumes removed."
else
  echo "==> Stopping stack (containers & data preserved)..."
  "${DC[@]}" -f "$COMPOSE_FILE" "${PROFILE_ARGS[@]}" stop
  echo "==> Stack stopped. Start again with ./start.sh"
fi
