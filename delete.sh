#!/usr/bin/env bash
#
# delete.sh — Remove ALL containers and (optionally) data volumes.
#
# Unlike stop.sh which just stops containers, this removes them entirely.
# Use this when you want a completely clean slate (e.g., after config changes,
# Dockerfile restructuring, or debugging).
#
# Usage:
#   ./delete.sh              # remove containers (volumes preserved)
#   ./delete.sh --volumes    # remove containers AND data volumes (DB/Redis wiped)
#   ./delete.sh --training   # also include the ai-trainer container
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
for arg in "$@"; do
  case "$arg" in
    --volumes|-v) REMOVE_VOLUMES=1 ;;
    --training)   WITH_TRAINING=1 ;;
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

echo "==> Removing all stack containers..."
if [[ "$REMOVE_VOLUMES" -eq 1 ]]; then
  echo "    --volumes set: data volumes will also be removed."
  "${DC[@]}" -f "$COMPOSE_FILE" "${PROFILE_ARGS[@]}" down --remove-orphans -v
  echo "==> Containers and data volumes removed."
else
  "${DC[@]}" -f "$COMPOSE_FILE" "${PROFILE_ARGS[@]}" down --remove-orphans
  echo "==> Containers removed. Data volumes preserved."
fi

echo ""
echo "To rebuild and start fresh:"
echo "  ./start.sh"
echo ""

# Also prune any dangling images if containers were removed
echo "==> Pruning dangling images..."
docker image prune -f 2>/dev/null || true

echo "==> Done."
