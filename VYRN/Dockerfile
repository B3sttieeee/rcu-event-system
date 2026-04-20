FROM node:22-slim

# Zainstaluj ffmpeg (bardzo ważne dla audio)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Skopiuj package.json i zainstaluj zależności
COPY package*.json ./
RUN npm ci --only=production

# Skopiuj kod bota
COPY bot.js ./

# Bezpieczeństwo: uruchom jako nie-root
RUN useradd -m -u 1001 botuser
USER botuser

ENV NODE_ENV=production

CMD ["node", "bot.js"]
