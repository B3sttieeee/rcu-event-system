// src/systems/cardgenerator/index.js
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");

// Ładowanie czcionki (upewnij się, że plik Roboto-Bold.ttf cały czas tam jest)
GlobalFonts.registerFromPath(path.join(__dirname, 'Roboto-Bold.ttf'), 'Roboto');

async function generateProfileCard(member, stats) {
  // Powiększony rozmiar dla lepszych proporcji
  const width = 800;
  const height = 280;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // ==========================================
  // 1. ZAOKRĄGLONE ROGI CAŁEJ KARTY
  // ==========================================
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 25); // Zaokrąglenie o promieniu 25px
  ctx.clip(); // Wszystko co narysujemy poniżej, nie wyjdzie poza te rogi!

  // ==========================================
  // 2. TŁO (Mroczny Gradient + Złota Poświata)
  // ==========================================
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, "#101116"); // Bardzo głęboki granat/czerń
  bgGradient.addColorStop(1, "#1A1C23"); // Odrobine jaśniejszy na dole
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Centralna, bardzo subtelna złota poświata
  const glow = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, 400);
  glow.addColorStop(0, "rgba(255, 215, 0, 0.08)");
  glow.addColorStop(1, "rgba(255, 215, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Subtelny Znak Wodny (Watermark) w tle
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
  ctx.font = "bold 140px Roboto";
  ctx.textAlign = "right";
  ctx.fillText("VYRN", width + 20, height - 20);
  ctx.restore();

  // ==========================================
  // 3. AWATAR GRACZA Z EFEKTEM 3D
  // ==========================================
  const avatarSize = 160;
  const avatarX = 50;
  const avatarY = 60; // Wyśrodkowany w pionie
  const avatarCenter = avatarX + avatarSize / 2;
  const avatarMiddle = avatarY + avatarSize / 2;

  // Rysowanie cienia pod awatarem
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 10;
  ctx.beginPath();
  ctx.arc(avatarCenter, avatarMiddle, avatarSize / 2, 0, Math.PI * 2, true);
  ctx.fillStyle = "#000000";
  ctx.fill();
  ctx.restore();

  // Wycinanie i rysowanie awatara
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCenter, avatarMiddle, avatarSize / 2, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();

  const avatarUrl = member.displayAvatarURL({ extension: "png", size: 256 });
  try {
    const avatar = await loadImage(avatarUrl);
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  } catch (e) {
    ctx.fillStyle = "#2A2A35";
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
  }
  ctx.restore();

  // Złota obramówka awatara (Premium Ring)
  ctx.beginPath();
  ctx.arc(avatarCenter, avatarMiddle, avatarSize / 2, 0, Math.PI * 2, true);
  ctx.strokeStyle = "#FFD700"; 
  ctx.lineWidth = 6;
  ctx.stroke();

  // Druga, subtelniejsza obramówka wewnątrz (dodaje głębi)
  ctx.beginPath();
  ctx.arc(avatarCenter, avatarMiddle, (avatarSize / 2) - 4, 0, Math.PI * 2, true);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)"; 
  ctx.lineWidth = 2;
  ctx.stroke();

  // ==========================================
  // 4. TEKSTY (Z Cieniami)
  // ==========================================
  const textX = 250; // Odsunięcie tekstu od awatara

  // Globalny cień dla tekstów
  ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;

  // Nazwa użytkownika
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 42px Roboto"; // Nieco większy font
  ctx.textAlign = "left";
  ctx.fillText(member.username, textX, 100);

  // Ranga i Level
  ctx.fillStyle = "#FFD700";
  ctx.font = "26px Roboto";
  ctx.fillText(`Rank: ${stats.rankName}   •   Level: ${stats.level}`, textX, 145);

  // Ekonomia (Monety)
  ctx.fillStyle = "#B0B3C0"; // Szaro-niebieski odcień złota, bardzo nowoczesny
  ctx.font = "22px Roboto";
  ctx.fillText(`Wealth: ${stats.coins.toLocaleString()} Coins`, textX, 180);

  // Resetujemy cień, żeby nie popsuł paska XP
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // ==========================================
  // 5. PASEK POSTĘPU XP (Ultra-Sleek)
  // ==========================================
  const barX = textX;
  const barY = 210;
  const barWidth = 490; // Dopasowane do nowej szerokości
  const barHeight = 28; // Nieco grubszy
  const radius = 14; // Idealnie okrągłe końce
  
  const nextXPSafe = stats.nextXP && stats.nextXP > 0 ? stats.nextXP : 100;
  const progress = Math.max(0, Math.min(1, stats.xp / nextXPSafe));

  // Tło paska (Głębokie wcięcie)
  ctx.fillStyle = "#15161C"; 
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, radius);
  ctx.fill();
  
  // Wewnętrzny obrys tła paska (Inner Stroke)
  ctx.strokeStyle = "#2A2D3A";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Wypełnienie paska XP (Złoty Gradient z połyskiem)
  if (progress > 0) {
    const xpGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    xpGradient.addColorStop(0, "#FFB800"); // Ciepłe złoto
    xpGradient.addColorStop(1, "#FF8C00"); // Pomarańcz

    ctx.fillStyle = xpGradient;
    ctx.beginPath();
    // Zabezpieczenie przed błędem rysowania zbyt krótkiego paska z zaokrąglonymi rogami
    const currentBarWidth = Math.max(radius * 2, barWidth * progress); 
    ctx.roundRect(barX, barY, currentBarWidth, barHeight, radius);
    ctx.fill();
  }

  // Tekst na pasku (Na środku)
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 4;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 15px Roboto";
  ctx.textAlign = "center";
  
  // Dodajemy mały margines pionowy (+19) by wyśrodkować tekst w grubszym pasku
  ctx.fillText(`${stats.xp.toLocaleString()} / ${nextXPSafe.toLocaleString()} XP`, barX + barWidth / 2, barY + 19);

  // ==========================================
  // 6. EKSPORT GRAFIKI
  // ==========================================
  return await canvas.encode("png");
}

module.exports = { generateProfileCard };
