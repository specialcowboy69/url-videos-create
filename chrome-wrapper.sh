#!/bin/bash
# Wrapper para Chrome/Chromium en entornos con poca RAM (como contenedores de Docker)
# Añade flags para evitar bloqueos por Out-Of-Memory (OOM).

# El primer argumento será la ruta real a Chrome si es pasado por puppeteer o si lo renombramos,
# pero en nuestro caso Puppeteer/HyperFrames usará este script como executable path.

# Dependiendo de la imagen base, el binario podría llamarse de varias formas:
CHROME_BIN="/opt/chrome-headless-shell/chrome-headless-shell"
if [ ! -x "$CHROME_BIN" ]; then
  CHROME_BIN="/usr/bin/google-chrome-stable"
fi
if [ ! -x "$CHROME_BIN" ]; then
  CHROME_BIN="/usr/bin/chromium"
fi
if [ ! -x "$CHROME_BIN" ]; then
  CHROME_BIN="/usr/bin/chromium-browser"
fi

exec "$CHROME_BIN" --disable-dev-shm-usage --disable-gpu --js-flags="--max-old-space-size=2048" "$@"
