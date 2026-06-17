#!/usr/bin/env bash
set -euo pipefail

# Automates running the Puppeteer Kaggle scraper on the host (uses host npm/node)
# - Ensures Node 22 via nvm if current node < 22
# - Installs puppeteer and minimist into a local tooling folder
# - Runs the scraper in headless mode to collect dataset refs
# Usage: bash backend/tools/run_collect_kaggle_host.sh --limit 656 --query resume

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}/../.."
OUT_FILE="${REPO_ROOT}/dataset.txt"
TMP_NODE_DIR="${SCRIPT_DIR}/.puppeteer_node"

LIMIT=656
QUERY="resume"
HEADLESS=true

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --limit) LIMIT="$2"; shift 2 ;;
    --query) QUERY="$2"; shift 2 ;;
    --headful) HEADLESS=false; shift ;;
    --out) OUT_FILE="$2"; shift 2 ;;
    -h|--help) echo "Usage: $0 [--limit N] [--query term] [--headful] [--out path]"; exit 0 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

echo "Running Kaggle scraper: query='${QUERY}' limit=${LIMIT} out='${OUT_FILE}' headless=${HEADLESS}"

# Helper: compare major node version
node_major_version() {
  if ! command -v node >/dev/null 2>&1; then
    echo 0
    return
  fi
  node -v | sed -E 's/^v([0-9]+).*$/\1/'
}

NEED_NODE22=false
if [ $(node_major_version) -lt 22 ]; then
  NEED_NODE22=true
fi

if [ "$NEED_NODE22" = true ]; then
  echo "Node >=22 required for latest Puppeteer. Installing nvm+Node 22..."
  if [ -d "$HOME/.nvm" ]; then
    echo "nvm detected; sourcing $HOME/.nvm/nvm.sh"
    # shellcheck disable=SC1090
    source "$HOME/.nvm/nvm.sh"
  else
    echo "Installing nvm..."
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.6/install.sh | bash
    # shellcheck disable=SC1090
    source "$HOME/.nvm/nvm.sh"
  fi
  nvm install 22
  nvm use 22
  echo "Using node $(node -v)"
else
  echo "Detected node $(node -v); proceeding"
fi

# Prepare local node_modules
mkdir -p "$TMP_NODE_DIR"
cat > "$TMP_NODE_DIR/package.json" <<'JSON'
{ "name": "gokul-puppeteer-tool", "private": true, "license": "MIT" }
JSON

cd "$TMP_NODE_DIR"
# install compatible puppeteer: try latest, fallback to 19 if engine fails
set +e
npm install --no-audit --no-fund puppeteer@latest minimist 2>&1 | tee install.log
RET=$?
set -e
if [ $RET -ne 0 ]; then
  echo "npm install of puppeteer@latest failed; attempting puppeteer@19 for Node 18 compatibility"
  npm install --no-audit --no-fund puppeteer@19 minimist
fi

# Run the scraper
cd "$REPO_ROOT"
NODE_PATH="$TMP_NODE_DIR/node_modules" node "$SCRIPT_DIR/scrape_kaggle_puppeteer.js" --query "$QUERY" --limit "$LIMIT" --out "$OUT_FILE" $( [ "$HEADLESS" = true ] && echo --headless )

echo "Done — see $OUT_FILE"

echo "Top 40 lines of $OUT_FILE:"
head -n 40 "$OUT_FILE" || true
