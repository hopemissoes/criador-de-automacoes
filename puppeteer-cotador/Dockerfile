# Puppeteer Cotador - Hapvida
# Usa imagem com Puppeteer pré-instalado
FROM ghcr.io/puppeteer/puppeteer:23.11.1

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
