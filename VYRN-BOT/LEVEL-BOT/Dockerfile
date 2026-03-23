FROM node:18

# Instalacja wymaganych bibliotek do canvas
RUN apt-get update && apt-get install -y \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  build-essential \
  g++ \
  pkg-config

# Folder aplikacji
WORKDIR /app

# Kopiuj package.json
COPY package*.json ./

# Instaluj zależności
RUN npm install

# Kopiuj resztę plików
COPY . .

# Uruchom bota
CMD ["node", "bot.js"]
