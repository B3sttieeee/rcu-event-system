# Użyj obrazu Node.js jako podstawy
FROM node:22

# Ustaw katalog roboczy
WORKDIR /app

# Skopiuj package.json i package-lock.json (jeśli istnieje)
COPY package*.json ./

# Zainstaluj zależności
RUN npm install --only=production

# Skopiuj resztę plików z projektu
COPY . .

# Ustaw polecenie startowe
CMD ["node", "bot.js"]
