# Browser Use - Cotador Hapvida
FROM python:3.11-slim

# Instala dependências do sistema para o Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
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
    && rm -rf /var/lib/apt/lists/*

# Diretório de trabalho
WORKDIR /app

# Copia os arquivos
COPY requirements.txt .
COPY cotador.py .
COPY server.py .

# Instala dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Instala o Chromium para Playwright
RUN playwright install chromium

# Expõe porta para API
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["python", "server.py"]
