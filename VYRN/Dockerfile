# ========================
# Stage 1: Builder
# ========================
FROM node:22-slim AS builder

WORKDIR /app

# Skopiuj pliki package i zainstaluj WSZYSTKIE zależności (w tym dev jeśli potrzebne)
COPY package*.json ./
RUN npm ci --include=dev

# Skopiuj resztę kodu
COPY . .

# ========================
# Stage 2: Production
# ========================
FROM node:22-slim

# Zainstaluj ffmpeg (wymagany do odtwarzania audio w @discordjs/voice)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Skopiuj tylko niezbędne pliki z buildera
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/bot.js ./
# Jeśli masz inne foldery (np. commands, events) – dodaj je
# COPY --from=builder /app/ ./

# Zainstaluj tylko produkcyjne zależności
RUN npm ci --only=production && npm cache clean --force

# Utwórz użytkownika nie-root dla bezpieczeństwa
RUN useradd -m -u 1001 botuser
USER botuser

# Zmienne środowiskowe
ENV NODE_ENV=production

# Uruchom bota
CMD ["node", "bot.js"]
