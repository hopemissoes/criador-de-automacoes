# Puppeteer Cotador - Hapvida
FROM node:20-slim

# Instala Chromium e dependências
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    fonts-noto-color-emoji \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Encontra o caminho do Chromium
RUN which chromium || which chromium-browser || echo "Chromium not found"

# Define variáveis para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copia arquivos
COPY package.json .
COPY server.js .
COPY cotador.js .

# Instala dependências
RUN npm install --production

# Porta
EXPOSE 80

# Inicia servidor
CMD ["node", "server.js"]
