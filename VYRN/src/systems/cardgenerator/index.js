// src/systems/cardgenerator/index.js
// Zauważ, że pobieramy teraz z @napi-rs/canvas!
const { createCanvas, loadImage } = require("@napi-rs/canvas");

// Domyślne tło (możesz tu wstawić link do lokalnego pliku lub URL do domyślnego tła)
const DEFAULT_BG = "https://imgur.com/uG9XEQh.png"; 

/**
 * Generuje wizualną kartę profilu gracza
 * @param {Object} member - Obiekt użytkownika Discorda
 * @param {Object} stats - Dane zebrane z systemów
 * @returns {Promise<Buffer>} Zwraca bufor obrazu
 */
async function generateProfileCard(member, stats) {
  const canvas = createCanvas(800, 250);
  const ctx = canvas.getContext("2d");

  // 1. Rysowanie tła
  try {
    const background = await loadImage(DEFAULT_BG);
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  } catch (err) {
    ctx.fillStyle = "#1E1E24";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Przyciemnienie tła dla lepszej czytelności tekstu
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Rysowanie awatara
  const avatarSize = 150;
  const avatarX = 50;
  const avatarY = 50;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();

  // Pobieranie awatara z Discorda
  const avatarUrl = member.displayAvatarURL({ extension: "png", size: 256 });
  try {
    const avatar = await loadImage(avatarUrl);
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  } catch (e) {
    // Awaryjne szare tło, jeśli Discord nie zwróci obrazka
    ctx.fillStyle = "#333333";
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
  }
  ctx.restore();

  // Złota obramówka awatara
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
  ctx.strokeStyle = "#FFD700"; 
  ctx.lineWidth = 6;
  ctx.stroke();

  // 3. Tekst (Nazwa użytkownika)
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText(member.username, 240, 90);

  // Ranga i Level
  ctx.fillStyle = "#FFD700";
  ctx.font = "24px sans-serif";
  ctx.fillText(`Rank: ${stats.rankName}  |  Level: ${stats.level}`, 240, 130);

  // Ekonomia 
  ctx.fillStyle = "#A0A0A0";
  ctx.font = "20px sans-serif";
  ctx.fillText(`Wealth: ${stats.coins.toLocaleString()} Coins`, 240, 165);

  // 4. Pasek Postępu
  const barX = 240;
  const barY = 190;
  const barWidth = 500;
  const barHeight = 25;
  const radius = 12;
  
  // Bezpieczne dzielenie (zapobiega błędowi NaN, gdyby nextXP wynosiło 0)
  const nextXPSafe = stats.nextXP && stats.nextXP > 0 ? stats.nextXP : 100;
  const progress = Math.max(0, Math.min(1, stats.xp / nextXPSafe));

  // Tło paska
  ctx.fillStyle = "#333333";
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, radius);
  ctx.fill();

  // Wypełnienie paska (tylko jeśli gracz ma jakieś XP)
  if (progress > 0) {
    ctx.fillStyle = "#FFD700"; 
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * progress, barHeight, radius);
    ctx.fill();
  }

  // Tekst na pasku (na środku)
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${stats.xp.toLocaleString()} / ${nextXPSafe.toLocaleString()} XP`, barX + barWidth / 2, barY + 17);

  // 5. Zwracanie obrazka (W @napi-rs/canvas używamy wydajnej metody encode)
  return await canvas.encode("png");
}

module.exports = { generateProfileCard };
