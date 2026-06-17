Puppeteer Kaggle scraper (Docker)

This folder provides a Dockerfile to run `backend/tools/scrape_kaggle_puppeteer.js` inside a container.

Build (from repository root):

```bash
docker build -t kaggle-puppeteer -f backend/tools/puppeteer.Dockerfile .
```

Run headless (recommended, requires Kaggle creds or public access):

```bash
# mount dataset.txt to receive appended entries
docker run --rm -v "$PWD/dataset.txt:/app/dataset.txt" kaggle-puppeteer --query resume --limit 200 --headless
```

Run interactive (headful) with X11 display forwarded (Linux host):

```bash
# allow connections from local X server (one-time):
xhost +local:docker

docker run --rm -it \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  -v "$PWD/dataset.txt:/app/dataset.txt" \
  --shm-size=1gb \
  kaggle-puppeteer --query resume --limit 200

# when finished, restrict access again:
xhost -local:docker
```

Notes
- Headless is suitable for automated runs but requires you to provide Kaggle credentials (use the Kaggle API or cookies) or rely on publicly accessible content.
- Headful mode opens a Chromium window inside the container forwarded to your host X server; use this if you want to log in interactively.
- On macOS/Windows, X11 forwarding is different — consider running the script directly with Node on your host instead.
- Be mindful of Kaggle's terms of service when scraping.
