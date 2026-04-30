// src/systems/cardgenerator/index.js
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");

// ========================================================
// ⚠️ TUTAJ ŁADUJEMY CZCIONKĘ (ABY TEKST BYŁ WIDOCZNY)
// Musisz pobrać plik np. Roboto-Bold.ttf i wrzucić do tego samego folderu
// Odkomentuj poniższą linijkę, gdy to zrobisz:
// GlobalFonts.registerFromPath(path.join(__dirname, 'Roboto-Bold.ttf'), 'Roboto');
// ========================================================

async function generateProfileCard(member, stats) {
  const canvas = createCanvas(800, 250);
  const ctx = canvas.getContext("2d");

  // 1. Rysowanie Tła (Niezawodny Gradient zamiast Imgura)
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

  // 2. Rysowanie Awatara
  const avatarSize = 150;
  const avatarX = 50;
  const avatarY = 50;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();

  const avatarUrl = member.displayAvatarURL({ extension: "png", size: 256 });
  try {
    const avatar = await loadImage(avatarUrl);
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  } catch (e) {
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

  // UWAGA: Kiedy wgrasz plik z czcionką, zmień "sans-serif" poniżej na "Roboto"

  // 3. Tekst
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 36px sans-serif"; 
  ctx.fillText(member.username, 240, 90);

  ctx.fillStyle = "#FFD700";
  ctx.font = "24px sans-serif";
  ctx.fillText(`Rank: ${stats.rankName}  |  Level: ${stats.level}`, 240, 130);

  ctx.fillStyle = "#A0A0A0";
  ctx.font = "20px sans-serif";
  ctx.fillText(`Wealth: ${stats.coins.toLocaleString()} Coins`, 240, 165);

  // 4. Pasek Postępu
  const barX = 240;
  const barY = 190;
  const barWidth = 500;
  const barHeight = 25;
  const radius = 12;
  
  const nextXPSafe = stats.nextXP && stats.nextXP > 0 ? stats.nextXP : 100;
  const progress = Math.max(0, Math.min(1, stats.xp / nextXPSafe));

  // Tło paska
  ctx.fillStyle = "#2A2A35"; // Ciemniejsze, ładniejsze tło paska
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, radius);
  ctx.fill();

  if (progress > 0) {
    // Gradient paska XP
    const xpGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    xpGradient.addColorStop(0, "#FFD700");
    xpGradient.addColorStop(1, "#FF8C00"); // Od żółtego do pomarańczowego
    
    ctx.fillStyle = xpGradient;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * progress, barHeight, radius);
    ctx.fill();
  }

  // Tekst na pasku
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${stats.xp.toLocaleString()} / ${nextXPSafe.toLocaleString()} XP`, barX + barWidth / 2, barY + 17);

  return await canvas.encode("png");
}

module.exports = { generateProfileCard };
