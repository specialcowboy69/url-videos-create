FROM node:22-slim AS deps

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    chromium \
    ffmpeg \
    fonts-dejavu \
    fonts-liberation \
    fonts-noto-color-emoji \
    fontconfig \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMIUM_PATH=/usr/bin/chromium
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV PUPPETEER_CACHE_DIR=/opt/puppeteer

COPY package.json package-lock.json* ./
RUN npm install
RUN npx --yes @puppeteer/browsers install chrome-headless-shell@stable --path /opt/puppeteer \
  && browser_bin="$(find /opt/puppeteer -type f -name chrome-headless-shell | head -n 1)" \
  && mkdir -p /opt/chrome-headless-shell \
  && cp -a "$(dirname "$browser_bin")/." /opt/chrome-headless-shell/

FROM deps AS builder
COPY . .
RUN npm run build

FROM node:22-slim AS runner

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    chromium \
    ffmpeg \
    fonts-dejavu \
    fonts-liberation \
    fonts-noto-color-emoji \
    fontconfig \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMIUM_PATH=/usr/bin/chromium
ENV HYPERFRAMES_BROWSER_PATH=/opt/chrome-headless-shell/chrome-headless-shell
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV PUPPETEER_CACHE_DIR=/opt/puppeteer

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /opt/puppeteer /opt/puppeteer
COPY --from=builder /opt/chrome-headless-shell /opt/chrome-headless-shell

EXPOSE 3000

CMD ["npm", "run", "start"]
