FROM node:22-bullseye-slim

# Install Chromium dependencies for Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libc6 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    wget \
    unzip \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# copy the scraper
COPY backend/tools/scrape_kaggle_puppeteer.js /app/scrape_kaggle_puppeteer.js

# Install runtime deps
RUN npm install --no-audit --no-fund puppeteer@latest minimist

# default command runs scraper (args can be provided)
ENTRYPOINT ["node","/app/scrape_kaggle_puppeteer.js"]
