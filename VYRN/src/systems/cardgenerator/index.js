// src/systems/cardGenerator.js
const { createCanvas, loadImage } = require("canvas");

// Domyślne tło (możesz tu wstawić link do lokalnego pliku lub URL do domyślnego tła)
const DEFAULT_BG = "https://imgur.com/uG9XEQh.png"; // Przykładowe ciemne tło

/**
 * Generuje wizualną kartę profilu gracza
 * @param {Object} member - Obiekt użytkownika Discorda (np. interaction.user)
 * @param {Object} stats - Dane zebrane z systemów ekonomii i aktywności
 * @returns {Promise<Buffer>} Zwraca bufor obrazu gotowy do wysłania
 */
async function generateProfileCard(member, stats) {
  // 1. Inicjalizacja płótna (wymiary 800x250)
  const canvas = createCanvas(800, 250);
  const ctx = canvas.getContext("2d");

  // 2. Rysowanie tła
  try {
    const background = await loadImage(DEFAULT_BG);
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  } catch (err) {
    // Fallback: Jeśli obrazek tła nie zadziała, rysujemy ciemnoszary prostokąt
    ctx.fillStyle = "#1E1E24";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Przyciemnienie tła dla lepszej czytelności tekstu
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Rysowanie awatara (okrągłego)
  const avatarSize = 150;
  const avatarX = 50;
  const avatarY = 50;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();

  const avatarUrl = member.displayAvatarURL({ extension: "png", size: 256 });
  const avatar = await loadImage(avatarUrl);
  ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  ctx.restore();

  // Złota obramówka wokół awatara
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
  ctx.strokeStyle = "#FFD700"; // VYRN Gold
  ctx.lineWidth = 6;
  ctx.stroke();

  // 4. Rysowanie Tekstu (Nazwa użytkownika)
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText(member.username, 240, 90);

  // Ranga i Level
  ctx.fillStyle = "#FFD700";
  ctx.font = "24px sans-serif";
  ctx.fillText(`Rank: ${stats.rankName}  |  Level: ${stats.level}`, 240, 130);

  // Ekonomia (Monety)
  ctx.fillStyle = "#A0A0A0";
  ctx.font = "20px sans-serif";
  ctx.fillText(`Wealth: ${stats.coins.toLocaleString()} Coins`, 240, 165);

  // 5. Rysowanie Paska Postępu (XP)
  const barX = 240;
  const barY = 190;
  const barWidth = 500;
  const barHeight = 25;
  const radius = 12;

  // Obliczenia % XP
  const progress = Math.max(0, Math.min(1, stats.xp / stats.nextXP));

  // Tło paska
  ctx.fillStyle = "#333333";
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, radius);
  ctx.fill();

  // Wypełnienie paska (Tylko jeśli jest więcej niż 0 XP, żeby nie rysować błędu)
  if (progress > 0) {
    ctx.fillStyle = "#FFD700"; // Złoty pasek
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * progress, barHeight, radius);
    ctx.fill();
  }

  // Tekst na pasku (np. "450 / 1000 XP")
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${stats.xp.toLocaleString()} / ${stats.nextXP.toLocaleString()} XP`, barX + barWidth / 2, barY + 17);

  // 6. Eksport gotowego obrazka
  return canvas.toBuffer("image/png");
}

module.exports = { generateProfileCard };
