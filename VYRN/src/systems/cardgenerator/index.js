// src/systems/cardgenerator/index.js
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");

// 1. ŁADOWANIE CZCIONKI Z PLIKU OBOK
// Upewnij się, że plik nazywa się dokładnie "Roboto-Bold.ttf"
GlobalFonts.registerFromPath(path.join(__dirname, 'Roboto-Bold.ttf'), 'Roboto');

/**
 * Generuje wizualną kartę profilu gracza
 * @param {Object} member - Obiekt użytkownika Discorda
 * @param {Object} stats - Dane zebrane z systemów
 * @returns {Promise<Buffer>} Zwraca bufor obrazu
 */
async function generateProfileCard(member, stats) {
  const canvas = createCanvas(800, 250);
  const ctx = canvas.getContext("2d");

  // ==========================================
  // 1. TŁO KARTY (Mroczny Gradient + Złota Poświata)
  // ==========================================
  const bgGradient = ctx.createLinearGradient(0, 0, 800, 250);
  bgGradient.addColorStop(0, "#14151C"); // Ciemny granatowy/czarny
  bgGradient.addColorStop(1, "#1E2029"); // Nieco jaśniejszy odcień
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, 800, 250);

  // Złota poświata za awatarem
  const glow = ctx.createRadialGradient(125, 125, 50, 125, 125, 200);
  glow.addColorStop(0, "rgba(255, 215, 0, 0.15)");
  glow.addColorStop(1, "rgba(255, 215, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 800, 250);

  // ==========================================
  // 2. AWATAR GRACZA
  // ==========================================
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
    // Awaryjne szare tło, jeśli Discord ma problemy
    ctx.fillStyle = "#333333";
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
  }
  ctx.restore();

  // Złota obramówka
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
  ctx.strokeStyle = "#FFD700"; 
  ctx.lineWidth = 6;
  ctx.stroke();

  // ==========================================
  // 3. TEKSTY (Używamy nowej czcionki "Roboto")
  // ==========================================
  
  // Nazwa użytkownika
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 36px Roboto"; 
  ctx.fillText(member.username, 240, 90);

  // Ranga i Level
  ctx.fillStyle = "#FFD700";
  ctx.font = "24px Roboto";
  ctx.fillText(`Rank: ${stats.rankName}  |  Level: ${stats.level}`, 240, 130);

  // Ekonomia (Monety)
  ctx.fillStyle = "#A0A0A0";
  ctx.font = "20px Roboto";
  ctx.fillText(`Wealth: ${stats.coins.toLocaleString()} Coins`, 240, 165);

  // ==========================================
  // 4. PASEK POSTĘPU XP
  // ==========================================
  const barX = 240;
  const barY = 190;
  const barWidth = 500;
  const barHeight = 25;
  const radius = 12;
  
  // Bezpieczne dzielenie (zapobiega błędom matematycznym)
  const nextXPSafe = stats.nextXP && stats.nextXP > 0 ? stats.nextXP : 100;
  const progress = Math.max(0, Math.min(1, stats.xp / nextXPSafe));

  // Tło paska
  ctx.fillStyle = "#2A2A35";
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, radius);
  ctx.fill();

  // Wypełnienie paska (Złoty gradient)
  if (progress > 0) {
    const xpGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    xpGradient.addColorStop(0, "#FFD700");
    xpGradient.addColorStop(1, "#FF8C00"); // Przejście do pomarańczowego
    
    ctx.fillStyle = xpGradient;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * progress, barHeight, radius);
    ctx.fill();
  }

  // Tekst na pasku (Na środku)
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 14px Roboto";
  ctx.textAlign = "center";
  ctx.fillText(`${stats.xp.toLocaleString()} / ${nextXPSafe.toLocaleString()} XP`, barX + barWidth / 2, barY + 17);

  // ==========================================
  // 5. EKSPORT GOTOWEJ GRAFIKI
  // ==========================================
  return await canvas.encode("png");
}

module.exports = { generateProfileCard };
