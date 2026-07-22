# AIHire Deployment Architecture

> **Version:** 1.0.0 | **Last Updated:** June 17, 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [VM 1 — Backend API](#2-vm-1--backend-api)
3. [VM 2 — AI Model Server](#3-vm-2--ai-model-server)
4. [Cloudflare Pages — Frontend](#4-cloudflare-pages--frontend)
5. [Networking & DNS](#5-networking--dns)
6. [Environment Variables](#6-environment-variables)
7. [Deployment Pipeline](#7-deployment-pipeline)
8. [Monitoring & Maintenance](#8-monitoring--maintenance)
9. [Scaling Considerations](#9-scaling-considerations)
10. [Security](#10-security)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Cloudflare Pages                         │
│                     (Frontend — Next.js via OpenNext)            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Static Assets (JS, CSS, Images) ── CDN Edge Cache ──────  │ │
│  │  Worker Runtime (API calls, SSR, middleware)                │ │
│  └──────────────────────┬──────────────────────────────────────┘ │
└─────────────────────────┼────────────────────────────────────────┘
                          │ HTTPS
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                      VM 1 — Backend (1 GB RAM, 1 vCPU AMD)       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  FastAPI (uvicorn, port 8000)                               │ │
│  │  ├── Auth (SSO token verification, JWT generation)          │ │
│  │  ├── Resume screening (matching engine orchestration)       │ │
│  │  ├── CV optimization (orchestration — delegates AI to VM 2) │ │
│  │  ├── Job board imports (Adzuna, Greenhouse)                 │ │
│  │  └── Reporting (CSV exports, PDF generation)                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐              │
│  │  Postgres 16 Alpine   │  │  Redis 7 Alpine       │             │
│  │  ~150 MB RAM          │  │  ~40 MB RAM           │             │
│  │  Port 5432            │  │  Port 6379            │             │
│  └──────────────────────┘  └──────────────────────┘              │
│                                                                  │
│  Approx RAM: 500–550 MB │ Free: ~450 MB                          │
└──────────────────────────────────────────────────────────────────┘
                          │ HTTPS (LAN / internal network)
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                  VM 2 — AI Model Server (1 GB RAM, 1 vCPU AMD)    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  AI Inference Service (port 8080)                           │ │
│  │                                                             │ │
│  │  ┌───────────────────────────────────────────────────────┐  │ │
│  │  │  BGE Small EN (BAAI/bge-small-en-v1.5)                │  │ │
│  │  │  • 33M parameters                                      │  │ │
│  │  │  • ~130 MB on disk                                     │  │ │
│  │  │  • ~450 MB at inference                                 │  │ │
│  │  │  • Embedding dimension: 384                             │  │ │
│  │  │  • Max sequence length: 512 tokens                      │  │ │
│  │  │  • Inference time: ~100–200 ms per text                 │  │ │
│  │  │  • Downloaded from Hugging Face on first run            │  │ │
│  │  └───────────────────────────────────────────────────────┘  │ │
│  │                                                             │ │
│  │  Optional (requires >1 GB RAM):                             │ │
│  │  ┌───────────────────────────────────────────────────────┐  │ │
│  │  │  all-MiniLM-L6-v2 (22M params, ~300 MB inference)     │  │ │
│  │  │  • Use when headroom is tight                         │  │ │
│  │  │  • Set EMBEDDING_MODEL env var to switch              │  │ │
│  │  └───────────────────────────────────────────────────────┘  │ │
│  │                                                             │ │
│  │  torch CPU runtime: ~200–300 MB loaded RAM                  │ │
│  │  Python serving layer: ~50 MB                               │ │
│  │  OS overhead: ~200 MB                                       │ │
│  │                                                             │ │
│  │  Approx RAM: 850 MB – 1.1 GB (use swap for headroom)       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Traffic Flow

```
User Browser
    │
    ├──→ Cloudflare Pages ──→ Edge CDN (static assets)
    │         │
    │         └──→ Cloudflare Worker (API proxy)
    │                    │
    │                    ├──→ VM 1 Backend (api.aihire.dev:443)
    │                    │         │
    │                    │         └──→ VM 2 AI (internal:8080)
    │                    │
    │                    └──→ Google/Microsoft SSO (direct from browser)
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Separate AI VM** | Embedding model + torch use ~800 MB RAM. Without isolation, they'd OOM alongside Postgres/Redis. |
| **Cloudflare Pages frontend** | Zero server management, global CDN, DDoS protection. OpenNext adapts Next.js to Workers runtime. |
| **BGE Small EN** | Best accuracy-to-RAM ratio for English resume matching (33M params, 384-dim embeddings). |
| **No LLM on 1 GB VMs** | Qwen2.5 3B requires ~6 GB on CPU. Disabled by default. Enable only with larger VMs. |
| **Postgres + Redis on backend VM** | Each is lightweight (<200 MB combined). Avoids network latency for DB calls. |

---

## 2. VM 1 — Backend API

### Specs

| Resource | Value |
|----------|-------|
| **Provider** | Any (AWS t2.micro, Hetzner CX22, DigitalOcean $6 droplet) |
| **RAM** | 1 GB |
| **vCPU** | 1 × AMD |
| **Storage** | 20–30 GB SSD |
| **OS** | Ubuntu 24.04 LTS (or Debian 12) |
| **Estimated cost** | ~$4–8/month |

### Services

| Service | Role | RAM | Port |
|---------|------|-----|------|
| **FastAPI (uvicorn)** | REST API server | ~50 MB | 8000 |
| **PostgreSQL 16** | Relational database | ~150 MB (tuned) | 5432 |
| **Redis 7** | Cache, session store, rate limiting | ~40 MB | 6379 |
| **Nginx** (optional) | Reverse proxy, SSL termination | ~20 MB | 80/443 |
| **OS + system** | — | ~200 MB | — |

### Postgres Tuning for 1 GB

Set these in `/etc/postgresql/16/main/postgresql.conf`:

```ini
shared_buffers = 256MB
effective_cache_size = 512MB
work_mem = 8MB
maintenance_work_mem = 64MB
random_page_cost = 1.1     # SSD-optimised
effective_io_concurrency = 200
wal_buffers = 4MB
max_connections = 20        # Keep low for 1 GB
```

### Installation

```bash
# System packages
apt update && apt install -y postgresql-16 redis-server nginx python3.12-venv

# Application
git clone https://github.com/your-org/aihire.git /opt/aihire
cd /opt/aihire/backend

# Python environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# NOTE: Do NOT install torch or sentence-transformers on this VM.
# The AI model runs on VM 2. This VM only has the API orchestration layer.
# If the Dockerfile is used, strip the torch/sentence-transformers layers.

# Database setup
createdb hiring
psql -d hiring -f /opt/aihire/infra/postgres/init.sql
```

### Systemd Service (`/etc/systemd/system/aihire-backend.service`)

```ini
[Unit]
Description=AIHire Backend API
After=network.target postgresql.service redis.service
Requires=postgresql.service redis.service

[Service]
Type=simple
User=aihire
WorkingDirectory=/opt/aihire/backend
Environment=APP_ENV=production
Environment=DATABASE_URL=postgresql://hiring:password@localhost:5432/hiring
Environment=REDIS_URL=redis://localhost:6379/0
Environment=JWT_SECRET=<generate-a-strong-secret>
Environment=RESEND_API_KEY=<your-resend-key>
Environment=NEXT_PUBLIC_API_BASE=https://api.aihire.dev
Environment=NEXT_PUBLIC_AI_API_BASE=https://ai.aihire.dev
# AI is NOT loaded on this VM — calls go to VM 2
Environment=AI_SERVER_URL=http://<vm-2-internal-ip>:8080
Environment=EMBEDDING_MODEL=none
Environment=ENABLE_SBERT=0
Environment=ENABLE_LLM=0

ExecStart=/opt/aihire/backend/.venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## 3. VM 2 — AI Model Server

### Specs

| Resource | Value |
|----------|-------|
| **Provider** | Any (matching VM 1 for simplicity) |
| **RAM** | 1 GB (with 512 MB–1 GB swap) |
| **vCPU** | 1 × AMD |
| **Storage** | 20 GB SSD (model files are only ~130 MB) |
| **OS** | Ubuntu 24.04 LTS (or Debian 12) |

### AI Model Details

#### Primary Model: BAAI/bge-small-en-v1.5

| Property | Value |
|----------|-------|
| **Type** | Sentence Transformer (BERT-family) |
| **Parameters** | 33.4 million |
| **Disk size** | ~130 MB (downloads from Hugging Face) |
| **Inference RAM** | ~400–600 MB |
| **Embedding dimension** | 384 |
| **Max tokens** | 512 |
| **Language** | English |
| **License** | MIT |
| **Hugging Face** | [BAAI/bge-small-en-v1.5](https://huggingface.co/BAAI/bge-small-en-v1.5) |
| **MTEB Score** | 63.0 (average) |
| **Inference time** | ~100–200 ms per text (1 vCPU) |

#### Lighter Alternative: all-MiniLM-L6-v2

| Property | Value |
|----------|-------|
| **Parameters** | 22.7 million |
| **Disk size** | ~90 MB |
| **Inference RAM** | ~250–350 MB |
| **Embedding dimension** | 384 |
| **MTEB Score** | 58.8 (slightly lower but uses ~200 MB less RAM) |

#### Why Not Larger Models

| Model | Params | RAM | Verdict on 1 GB VM |
|-------|--------|-----|---------------------|
| BGE Small EN | 33M | ~500 MB | ✅ Fits |
| all-MiniLM-L6-v2 | 22M | ~300 MB | ✅ Comfortable |
| BGE Base EN | 110M | ~1.2 GB | ❌ OOM |
| BGE Large EN | 330M | ~2.5 GB | ❌ OOM |
| Qwen2.5 3B (LLM) | 3B | ~6 GB | ❌ OOM |

### AI Inference Service

The AI server is a lightweight FastAPI app that loads the embedding model and exposes a single endpoint:

**`POST /embed`**
- **Input:** `{ "texts": ["string", ...] }`
- **Output:** `{ "embeddings": [[float, ...], ...], "model": "BAAI/bge-small-en-v1.5", "dimension": 384 }`
- **Batch size:** Up to 32 texts per request
- **Cache:** In-process LRU cache for frequent texts

**`GET /health`**
- **Output:** `{ "status": "ok", "model": "BAAI/bge-small-en-v1.5", "uptime": 3600 }`

### Docker-based Setup

```dockerfile
# ai-server/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install only what's needed for inference (no Postgres/Redis drivers, no FastAPI extras)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install torch + sentence-transformers (CPU-optimised)
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    torch>=2.0.0 \
    sentence-transformers>=3.0.0 \
    fastapi uvicorn

COPY server.py .

EXPOSE 8080

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
```

```python
# ai-server/server.py
"""Minimal AI inference server — runs standalone on VM 2."""
from __future__ import annotations

import os
import time
from functools import lru_cache

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="AIHire AI Server", version="1.0.0")

_MODEL = None
_MODEL_NAME = None
_START_TIME = time.time()


class EmbedRequest(BaseModel):
    texts: list[str]


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    model: str
    dimension: int


def load_model():
    global _MODEL, _MODEL_NAME
    if _MODEL is not None:
        return _MODEL, _MODEL_NAME

    from sentence_transformers import SentenceTransformer

    model_name = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
    print(f"Loading model: {model_name}")
    model = SentenceTransformer(model_name)
    _MODEL = model
    _MODEL_NAME = model_name
    print(f"Model loaded: {model_name}")
    return model, model_name


@lru_cache(max_size=1000)
def _cached_encode(text: str) -> tuple[float, ...]:
    model, _ = load_model()
    emb = model.encode(text, normalize_embeddings=True)
    return tuple(float(v) for v in emb)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": _MODEL_NAME or "loading",
        "uptime": int(time.time() - _START_TIME),
    }


@app.post("/embed", response_model=EmbedResponse)
def embed(payload: EmbedRequest):
    if not payload.texts:
        raise HTTPException(status_code=400, detail="texts is required")
    if len(payload.texts) > 32:
        raise HTTPException(status_code=400, detail="max 32 texts per request")

    model, model_name = load_model()
    dim = model.get_sentence_embedding_dimension()

    embeddings = []
    for text in payload.texts:
        emb = _cached_encode(text)
        embeddings.append(list(emb))

    return EmbedResponse(embeddings=embeddings, model=model_name, dimension=dim)


@app.on_event("startup")
def startup():
    load_model()
    print("AI server ready")
```

### Systemd Service (`/etc/systemd/system/aihire-ai.service`)

```ini
[Unit]
Description=AIHire AI Model Server
After=network.target

[Service]
Type=simple
User=aihire
WorkingDirectory=/opt/aihire/ai-server
Environment=EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
Environment=HF_HOME=/opt/aihire/ai-server/cache
ExecStart=/opt/aihire/ai-server/.venv/bin/uvicorn server:app --host 0.0.0.0 --port 8080 --workers 1
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### VM 2 Hardening

```bash
# Allocate swap (critical for model loading spikes)
fallocate -l 1G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Reduce swappiness
echo 'vm.swappiness=10' >> /etc/sysctl.conf

# OOM protection for the AI process
echo -1000 > /proc/self/oom_score_adj
```

### Resource Monitoring

```bash
# Watch RAM usage
watch -n 2 'ps aux --sort=-%mem | grep -E "sentence|torch|uvicorn" | head -5'

# Check swap usage
free -h

# Model load time (first request after restart)
curl -s -o /dev/null -w '%{time_total}s' -X POST http://localhost:8080/embed \
  -H 'Content-Type: application/json' \
  -d '{"texts":["Warmup"]}'
```

---

## 4. Cloudflare Pages — Frontend

### Setup

The frontend uses **OpenNext** (`@opennextjs/cloudflare`) to deploy Next.js to Cloudflare Pages.

#### Prerequisites

```bash
# Install the adapter
cd frontend
npm install @opennextjs/cloudflare@latest
npm install -D wrangler@latest

# Log in to Cloudflare
npx wrangler login
```

#### Configuration Files

**`wrangler.jsonc`** (project root):
```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "main": ".open-next/worker.js",
  "name": "aihire",
  "compatibility_date": "2026-06-17",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

**`open-next.config.ts`** (project root):
```typescript
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig({});
```

**`next.config.mjs`**:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // No "output: standalone" — OpenNext handles this
};

export default nextConfig;
```

**`package.json` scripts**:
```json
{
  "scripts": {
    "dev": "next dev -H 0.0.0.0",
    "build": "next build",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    "lint": "next lint"
  }
}
```

#### Environment Variables in Cloudflare Dashboard

| Variable | Where to Set | Value |
|----------|-----------|-------|
| `NEXT_PUBLIC_API_BASE` | Build variables + Runtime | `https://api.aihire.dev` |
| `NEXT_PUBLIC_AI_API_BASE` | Build variables + Runtime | `https://ai.aihire.dev` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Build variables | Your Google OAuth client ID |
| `NEXT_PUBLIC_MICROSOFT_CLIENT_ID` | Build variables | Your Microsoft Entra client ID |

> **Important:** All `NEXT_PUBLIC_*` vars must be in **Build variables** (they get inlined at build time). Non-public vars go in **Runtime** secrets.

#### Deploy

```bash
# Preview locally
npm run preview

# Deploy to Cloudflare Pages
npm run deploy

# Or for a specific environment
npm run deploy -- --env staging
```

### Worker Limits

| Limit | Free Plan | Paid Plan |
|-------|-----------|-----------|
| **Worker size (compressed)** | 3 MiB | 10 MiB |
| **CPU time per request** | 10 ms free, then 50 ms | 30 ms free, then 50 ms |
| **Memory per Worker** | 128 MB | 128 MB |

OpenNext reports compressed size after build — verify you're within limits:

```bash
# Check compressed size
ls -lh .open-next/worker.js
```

### Build-time Pruning

To keep the Worker under the size limit, add to `package.json`:

```json
{
  "scripts": {
    "deploy": "opennextjs-cloudflare build && npx wrangler deploy --minify"
  }
}
```

---

## 5. Networking & DNS

### DNS Setup

| Record | Type | Value |
|--------|------|-------|
| `aihire.dev` | CNAME | Cloudflare Pages hostname |
| `api.aihire.dev` | A | VM 1 public IP |
| `ai.aihire.dev` | A | VM 2 public IP |

### Firewall Rules

**VM 1 (Backend):**
- Allow 22 (SSH) from your IP
- Allow 443 (HTTPS) from Cloudflare IP ranges
- Allow 5432 (Postgres) — only from itself (localhost)
- Allow 6379 (Redis) — only from itself (localhost)
- Allow outbound to VM 2 port 8080

**VM 2 (AI):**
- Allow 22 (SSH) from your IP
- Allow 8080 from VM 1's private IP only
- Deny all other inbound

### SSL/TLS

**Cloudflare Pages**: Automatic SSL (Edge Certificates or Universal SSL).

**Backend VM**: Use Let's Encrypt with Nginx reverse proxy:

```nginx
# /etc/nginx/sites-available/api.aihire.dev
server {
    listen 443 ssl;
    server_name api.aihire.dev;

    ssl_certificate /etc/letsencrypt/live/api.aihire.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.aihire.dev/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name api.aihire.dev;
    return 301 https://$server_name$request_uri;
}
```

```bash
certbot --nginx -d api.aihire.dev
```

**AI VM**: Not directly exposed to the internet. Use internal networking or Tailscale WireGuard tunnel between VMs.

---

## 6. Environment Variables

### Global

| Variable | Description | Required |
|----------|-------------|----------|
| `APP_ENV` | `production` / `development` | ✅ |
| `JWT_SECRET` | JWT signing key (generate via `openssl rand -hex 32`) | ✅ |

### VM 1 — Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Postgres connection string | `postgresql://hiring:hiring@localhost:5432/hiring` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `RESEND_API_KEY` | Email verification via Resend | — |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | — |
| `MICROSOFT_CLIENT_ID` | Microsoft Entra client ID | — |
| `AI_SERVER_URL` | VM 2 inference endpoint | `http://<vm2>:8080` |
| `ADZUNA_APP_ID` | Adzuna job board (optional) | — |
| `ADZUNA_API_KEY` | Adzuna job board (optional) | — |

### VM 2 — AI Server

| Variable | Description | Default |
|----------|-------------|---------|
| `EMBEDDING_MODEL` | Hugging Face model name | `BAAI/bge-small-en-v1.5` |
| `HF_HOME` | Hugging Face cache directory | `/opt/aihire/ai-server/cache` |

### Cloudflare Pages — Frontend

| Variable | Type | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_API_BASE` | Build + Runtime | Backend API URL (`https://api.aihire.dev`) |
| `NEXT_PUBLIC_AI_API_BASE` | Build + Runtime | AI server URL (`https://ai.aihire.dev`) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Build | Google OAuth client ID |
| `NEXT_PUBLIC_MICROSOFT_CLIENT_ID` | Build | Microsoft Entra client ID |

---

## 7. Deployment Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
        working-directory: frontend
      - run: npm run deploy
        working-directory: frontend
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          NEXT_PUBLIC_API_BASE: ${{ vars.NEXT_PUBLIC_API_BASE }}
          NEXT_PUBLIC_AI_API_BASE: ${{ vars.NEXT_PUBLIC_AI_API_BASE }}
          NEXT_PUBLIC_GOOGLE_CLIENT_ID: ${{ vars.NEXT_PUBLIC_GOOGLE_CLIENT_ID }}
          NEXT_PUBLIC_MICROSOFT_CLIENT_ID: ${{ vars.NEXT_PUBLIC_MICROSOFT_CLIENT_ID }}

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to VM 1 via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VM1_HOST }}
          username: ${{ secrets.VM1_USER }}
          key: ${{ secrets.VM1_SSH_KEY }}
          script: |
            cd /opt/aihire
            git pull origin main
            cd backend
            source .venv/bin/activate
            pip install -r requirements.txt
            sudo systemctl restart aihire-backend

  deploy-ai:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to VM 2 via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VM2_HOST }}
          username: ${{ secrets.VM2_USER }}
          key: ${{ secrets.VM2_SSH_KEY }}
          script: |
            cd /opt/aihire/ai-server
            git pull origin main
            source .venv/bin/activate
            pip install -r requirements.txt
            sudo systemctl restart aihire-ai
```

### Local Build Verification

```bash
# Before deploying, always verify:
cd frontend && npm run build && cd ..
cd backend && python -m pytest && cd ..
cd ai-server && python -m pytest && cd ..
```

---

## 8. Monitoring & Maintenance

### Health Checks

```bash
# Frontend
curl -s -o /dev/null -w '%{http_code}' https://aihire.dev/health
# Expected: 200

# Backend
curl -s https://api.aihire.dev/health
# Expected: {"status":"ok","semantic_enabled":false,"semantic_model":"none"}

# AI Server
curl -s https://ai.aihire.dev/health
# Expected: {"status":"ok","model":"BAAI/bge-small-en-v1.5","uptime":1234}
```

### Backup Strategy

| Data | Frequency | Method | Retention |
|------|-----------|--------|-----------|
| Postgres | Daily | `pg_dump` to S3/Backblaze B2 | 30 days |
| Uploaded files | Hourly | Rsync to backup server | 7 days |
| AI model cache | Weekly | `tar -czf cache-backup.tar.gz cache/` | 3 months |

### Logging

```bash
# Backend logs
journalctl -u aihire-backend -f

# AI server logs
journalctl -u aihire-ai -f

# Nginx access logs
tail -f /var/log/nginx/access.log
```

### Alerting

Set up simple uptime monitoring with:
- **Uptime Kuma** (self-hosted on a free-tier VM)
- **Better Uptime** (free tier, 5 monitors)
- **Cron script** that emails you on failure:

```bash
#!/bin/bash
# /opt/aihire/scripts/health-check.sh
ENDPOINTS=(
  "https://aihire.dev"
  "https://api.aihire.dev/health"
  "https://ai.aihire.dev/health"
)

for url in "${ENDPOINTS[@]}"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$url" --max-time 5)
  if [ "$code" != "200" ]; then
    echo "ALERT: $url returned $code" | mail -s "AIHire Alert" admin@aihire.dev
  fi
done
```

### Performance Benchmarks

| Operation | Expected Time | Notes |
|-----------|-----------|-------|
| **Embedding a resume** | ~100–200 ms | First request is slower (~2–5s, model loading) |
| **Screening 10 resumes** | ~2–4 s | TF-IDF + BM25 + embeddings |
| **Screening 100 resumes** | ~20–40 s | Scales linearly |
| **CV optimization** | ~0.5–1 s | No embedding needed |
| **API response (no AI)** | <50 ms | Cached routes, auth checks |
| **Page load (Cloudflare)** | <100 ms | Edge-cached assets |

---

## 9. Scaling Considerations

### When to Scale Up

| Symptom | Action |
|---------|--------|
| AI server swap usage >50% | Upgrade to 2 GB VM or switch to all-MiniLM-L6-v2 |
| Backend API latency >500 ms | Add a second backend VM with load balancer |
| Concurrent users >50 | Move Postgres to separate VM (2 GB minimum) |
| Concurrent users >200 | Add connection pooling (PgBouncer), read replicas |

### Vertical Scaling (Simple)

```bash
# Upgrade to 2 GB VMs (~$12–15/month each)
# This allows:
#   - Running BGE Base EN (110M params) for better accuracy
#   - Running LLM (Qwen2.5 3B) for AI summaries
#   - More Postgres connections
#   - Higher Redis memory for caching
```

### Horizontal Scaling (Advanced)

```
                   ┌──────────────┐
                   │  Cloudflare   │
                   │   Load Balancer│
                   └──────┬───────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
         ┌─────────┐ ┌─────────┐ ┌─────────┐
         │ Worker 1│ │ Worker 2│ │ Worker N│  (same code, no state)
         └─────────┘ └─────────┘ └─────────┘
              │           │           │
              └───────────┼───────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │  PostgreSQL   │
                   │  (standalone) │
                   └──────────────┘
```

---

## 10. Security

| Layer | Measure |
|-------|---------|
| **SSO only** | No passwords stored. Google/Microsoft OAuth with token verification. |
| **Network** | VM 2 not publicly exposed. Internal network or WireGuard. |
| **API** | JWT-based auth on all sensitive endpoints. Rate limiting via Redis. |
| **Data at rest** | Postgres TDE if available, or app-level encryption for sensitive fields. |
| **Data in transit** | TLS 1.3 for all external traffic. Internal traffic over LAN. |
| **PII handling** | Resumes anonymized before processing. Stored encrypted. |
| **DDoS** | Cloudflare edge (free plan includes DDoS mitigation). |
| **Secrets** | Environment variables via systemd. No hardcoded credentials. |
| **Updates** | Monthly `apt update && apt upgrade`. Weekly Postgres VACUUM. |

---

## 11. Troubleshooting

### AI Server OOM

**Symptom:** `Killed` in journalctl, process disappears.

**Fix:**
```bash
# Check if OOM killer was triggered
dmesg | grep -i "killed process"

# Increase swap
sudo fallocate -l 2G /swapfile && sudo swapon /swapfile

# Switch to lighter model
sudo sed -i 's/BAAI\/bge-small-en-v1.5/sentence-transformers\/all-MiniLM-L6-v2/' /etc/systemd/system/aihire-ai.service
sudo systemctl daemon-reload && sudo systemctl restart aihire-ai
```

### Backend Can't Reach AI Server

**Symptom:** 502 errors on screening endpoints.

**Fix:**
```bash
# Test connectivity
curl -s http://<vm2-ip>:8080/health

# Check firewall
sudo ufw status

# Check DNS resolution
getent hosts ai-server
```

### Cloudflare Worker Size Exceeded

**Symptom:** `Error: Worker size exceeds limit` during deploy.

**Fix:**
```json
// package.json — add analyze script
{
  "scripts": {
    "analyze": "opennextjs-cloudflare build && npx wrangler deploy --dry-run"
  }
}

// Then prune:
// 1. Remove unused npm packages
// 2. Lazy-load heavy components
// 3. Use dynamic imports for large libraries
```

### Postgres Connection Exhaustion

**Symptom:** `FATAL: remaining connection slots are reserved for non-replication superuser connections`

**Fix:**
```sql
-- In psql
ALTER SYSTEM SET max_connections = 30;
-- Requires restart
```

---

## Appendix A: Cost Estimate

| Service | Component | Estimated Monthly Cost |
|---------|-----------|----------------------|
| **VM 1** (Backend + DB) | 1 GB RAM, 1 vCPU, 25 GB SSD | ~$4–8 |
| **VM 2** (AI Model) | 1 GB RAM, 1 vCPU, 20 GB SSD | ~$4–8 |
| **Cloudflare Pages** | Free tier (500 GB bandwidth) | $0 |
| **Cloudflare DNS** | Free | $0 |
| **Domain** | .dev or .com | ~$10–12/yr |
| **Resend** | Email verification (free tier, 100/day) | $0 |
| **Google OAuth** | Free | $0 |
| **Microsoft Entra** | Free | $0 |
| **Total** | | **~$8–16/month** |

## Appendix B: Architecture Decision Record (ADR)

### ADR-001: Separate AI Model Server

**Decision:** Run the embedding model on a dedicated VM separate from the API/database.

**Context:** The BGE Small EN model + torch runtime use ~700–900 MB RAM. Combined with Postgres (~150 MB), Redis (~40 MB), and the Python API server (~50 MB), total RAM exceeds 1 GB.

**Consequences:** +1 VM cost (~$4–8/month) but prevents OOM crashes, allows independent scaling, and keeps AI inference isolated from API traffic spikes.

### ADR-002: Cloudflare Pages over Vercel/Railway

**Decision:** Deploy Next.js frontend to Cloudflare Pages via OpenNext.

**Context:** Need global CDN, zero server management, and compatibility with the 2 VM architecture. Vercel is excellent but costs more for equivalent CDN coverage.

**Consequences:** Must use `@opennextjs/cloudflare` adapter. Worker size limit (3 MiB free) requires build-time optimization. No Node.js server runtime — only Edge/Workers runtime.

### ADR-003: BGE Small EN as Default Embedding Model

**Decision:** Use BAAI/bge-small-en-v1.5 (33M params) as the primary embedding model.

**Context:** 1 GB RAM budget on the AI VM. Larger models (BGE Base: 110M params ~1.2 GB, BGE Large: 330M params ~2.5 GB) exceed capacity. Smaller models (all-MiniLM-L6-v2: 22M params) offer slightly lower accuracy.

**Consequences:** Good accuracy (MTEB 63.0) within 1 GB budget. Can switch to all-MiniLM-L6-v2 for more headroom, or upgrade VM to 2 GB for BGE Base.

---

## Appendix C: Quick-Start Commands

```bash
# === VM 1 — Backend ===
ssh root@<vm1-ip>
apt update && apt install -y postgresql-16 redis-server git python3.12-venv
git clone https://github.com/your-org/aihire.git /opt/aihire
cd /opt/aihire/backend && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# (Skip torch, sentence-transformers here — no AI on this VM)
systemctl enable --now postgresql redis

# === VM 2 — AI Server ===
ssh root@<vm2-ip>
apt update && apt install -y git python3.12-venv
fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
git clone https://github.com/your-org/aihire.git /opt/aihire
cd /opt/aihire/ai-server && python3.12 -m venv .venv && source .venv/bin/activate
pip install torch sentence-transformers fastapi uvicorn
# Model downloads on first request (~2–5s)

# === Cloudflare Pages — Frontend ===
cd frontend
npm install @opennextjs/cloudflare wrangler
npx wrangler login
npm run deploy
```
