#!/usr/bin/env bash
#
# start.sh — Build (with layer caching) and start the full AI-Hiring stack.
#
# Unlike the old script, this version:
#   - Uses Docker layer caching (no --no-cache) so only changed layers rebuild
#   - Does NOT remove containers on start — just stops them if running
#   - Faster startup because npm/pip packages are cached across runs
#
# Usage:
#   ./start.sh                 # build (cached) + start
#   ./start.sh --logs          # same, then follow logs
#   ./start.sh --training      # also start the ai-trainer container
#   ./start.sh --fresh         # also wipe data volumes (DB/Redis) for a clean slate
#   ./start.sh --rebuild       # force a full rebuild (no cache) — use when deps change
#
set -euo pipefail

cd "$(dirname "$0")"

COMPOSE_FILE="docker-compose.local.yml"

# ---- Detect docker compose flavour (v2 plugin vs legacy binary) ----
if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC=(docker-compose)
else
  echo "ERROR: Docker Compose not found. Install Docker Compose v2 (docker compose) or docker-compose." >&2
  exit 1
fi

# ---- Parse flags ----
FOLLOW_LOGS=0
WITH_TRAINING=0
FRESH=0
REBUILD=0
for arg in "$@"; do
  case "$arg" in
    --logs)     FOLLOW_LOGS=1 ;;
    --training) WITH_TRAINING=1 ;;
    --fresh)    FRESH=1 ;;
    --rebuild)  REBUILD=1 ;;
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

echo "==> Using: ${DC[*]} -f $COMPOSE_FILE"

# ---- Stop any running stack first (clean restart, but keep containers) ----
echo "==> Stopping existing stack (containers kept)..."
if [[ "$FRESH" -eq 1 ]]; then
  echo "    --fresh set: removing data volumes too (DB + Redis + runtime will be wiped)."
  "${DC[@]}" -f "$COMPOSE_FILE" "${PROFILE_ARGS[@]}" down --remove-orphans -v
else
  # Just stop, don't remove containers — preserves container state & volumes
  "${DC[@]}" -f "$COMPOSE_FILE" "${PROFILE_ARGS[@]}" stop
fi

# ---- Build images (with layer caching by default) ----
if [[ "$REBUILD" -eq 1 ]]; then
  echo "==> Rebuilding images from scratch (--rebuild)..."
  "${DC[@]}" -f "$COMPOSE_FILE" "${PROFILE_ARGS[@]}" build --no-cache --pull
else
  echo "==> Building images (using Docker layer cache)..."
  "${DC[@]}" -f "$COMPOSE_FILE" "${PROFILE_ARGS[@]}" build
fi

# ---- Bring the stack up ----
echo "==> Starting stack..."
"${DC[@]}" -f "$COMPOSE_FILE" "${PROFILE_ARGS[@]}" up -d

echo ""
echo "==================================================="
echo " Full stack is up."
echo "---------------------------------------------------"
echo "  Frontend (Next.js) : http://localhost:3000"
echo "  Backend  (FastAPI) : http://localhost:8000"
echo "  API Docs (Swagger) : http://localhost:8000/docs"
echo "  PostgreSQL         : localhost:5432"
echo "  Redis              : localhost:6379"
echo "==================================================="
echo ""
echo "  Logs : ${DC[*]} -f $COMPOSE_FILE logs -f"
echo "  Stop : ./stop.sh"
echo "  Delete (full clean) : ./delete.sh"
echo ""

if [[ "$FOLLOW_LOGS" -eq 1 ]]; then
  echo "==> Following logs (Ctrl-C to detach; containers keep running)..."
  "${DC[@]}" -f "$COMPOSE_FILE" "${PROFILE_ARGS[@]}" logs -f
fi
