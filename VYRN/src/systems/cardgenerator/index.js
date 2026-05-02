const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");

// Rejestracja czcionki
GlobalFonts.registerFromPath(path.join(__dirname, 'Cinzel-Bold.ttf'), 'Cinzel');

// ==========================================
// KONFIGURACJA IKON Z IMGUR
// ==========================================
const RANK_ICONS = {
    "BRONZE": "https://i.imgur.com/4SGN8tf.png",
    "SILVER": "https://i.imgur.com/sbVx2oT.png",
    "GOLD": "https://i.imgur.com/rZFNUMd.png",
    "PLATINUM": "https://i.imgur.com/tHDiY6h.png",
    "DIAMOND": "https://i.imgur.com/akK0M5T.png"
};

const COIN_ICON = "https://i.imgur.com/LAf2i7P.png";

// ==========================================
// GŁÓWNA FUNKCJA
// ==========================================
async function generateProfileCard(member, stats) {
    const width = 800;
    const height = 280;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // --- 1. ZAAOKRĄGLENIE KARTY ---
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 30);
    ctx.clip();

    // --- 2. BEZPIECZNE ŁADOWANIE ZDJĘĆ ---
    const rankName = stats.rankName.toUpperCase();
    const rankUrl = RANK_ICONS[rankName] || RANK_ICONS["BRONZE"];

    const [background, avatarImg, rankImg, coinImg] = await Promise.all([
        loadImage("https://i.imgur.com/RAC3GWt.png").catch(() => null),
        loadImage(member.displayAvatarURL({ extension: "png", size: 256 })).catch(() => null),
        loadImage(rankUrl).catch(() => null),
        loadImage(COIN_ICON).catch(() => null)
    ]);

    // --- 3. TŁO ---
    if (background) {
        const ratio = Math.max(width / background.width, height / background.height);
        const bgW = background.width * ratio;
        const bgH = background.height * ratio;
        ctx.drawImage(background, (width - bgW) / 2, (height - bgH) / 2, bgW, bgH);
    } else {
        ctx.fillStyle = "#111111";
        ctx.fillRect(0, 0, width, height);
    }

    // --- 4. AWATAR ---
    const avatarSize = 160;
    const avatarX = 40;
    const avatarY = height / 2 - avatarSize / 2;
    const centerX = avatarX + avatarSize / 2;
    const centerY = avatarY + avatarSize / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, avatarSize / 2 + 5, 0, Math.PI * 2);
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 5;
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)"; 
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.stroke();
    ctx.restore();

    if (avatarImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, avatarSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();
    }

    // ==========================================
    // 5. TEKST PREMIUM (OBRYS + CIEŃ)
    // ==========================================
    const textX = 240;

    // Uniwersalna funkcja generująca "niezniszczalny" tekst
    const drawTextPremium = (text, x, y, color = "#FFFFFF") => {
        ctx.save();
        // Cień przesunięty w prawo i dół
        ctx.shadowColor = "rgba(0, 0, 0, 1)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        
        // Gruby czarny obrys litery
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#000000";
        ctx.strokeText(text, x, y);
        
        // Czysty kolor w środku (wyłączamy cień, żeby nie brudził wnętrza)
        ctx.shadowColor = "transparent";
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        ctx.restore();
    };

    // --- NAZWA UŻYTKOWNIKA ---
    ctx.font = "bold 46px Cinzel";
    drawTextPremium(member.username.toUpperCase(), textX, 100, "#FFFFFF");

    // --- DEKORACYJNA ZŁOTA LINIA ---
    const lineGrad = ctx.createLinearGradient(textX, 0, textX + 500, 0);
    lineGrad.addColorStop(0, "#FFD700");
    lineGrad.addColorStop(1, "transparent");
    ctx.fillStyle = lineGrad;
    // Cień pod linią
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.fillRect(textX, 115, 500, 2);
    ctx.shadowColor = "transparent"; // reset cienia po narysowaniu linii

    // --- RANGA (Z IKONKĄ IMGUR) ---
    if (rankImg) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
        ctx.shadowBlur = 6;
        ctx.drawImage(rankImg, textX, 131, 28, 28);
        ctx.shadowColor = "transparent";
    }
    
    ctx.font = "bold 24px Cinzel";
    drawTextPremium("RANK: ", textX + 35, 155, "#FFD700");
    const rankLabelWidth = ctx.measureText("RANK: ").width;
    drawTextPremium(rankName, textX + 35 + rankLabelWidth, 155, "#FFFFFF");

    // --- STATYSTYKI (LVL i VAULT) ---
    ctx.font = "bold 20px Cinzel";
    const statsY = 195;

    // LVL
    drawTextPremium("LVL:", textX, statsY, "#C0C0C0"); // Jasnoszary
    const lvlLabelWidth = ctx.measureText("LVL: ").width;
    drawTextPremium(` ${stats.level}`, textX + lvlLabelWidth, statsY, "#FFFFFF");

    // VAULT
    const vaultX = textX + 150;
    drawTextPremium("VAULT:", vaultX, statsY, "#C0C0C0");
    const vaultLabelWidth = ctx.measureText("VAULT: ").width;
    
    const vaultValue = ` ${stats.coins.toLocaleString()}`;
    drawTextPremium(vaultValue, vaultX + vaultLabelWidth, statsY, "#FFFFFF");
    
    // Ikona kasy
    if (coinImg) {
        const vaultValueWidth = ctx.measureText(vaultValue).width;
        ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
        ctx.shadowBlur = 6;
        ctx.drawImage(coinImg, vaultX + vaultLabelWidth + vaultValueWidth + 8, statsY - 18, 24, 24);
        ctx.shadowColor = "transparent";
    }

    // --- 6. PASEK POSTĘPU ---
    const nextXPSafe = stats.nextXP || 100;
    const progress = Math.min(stats.xp / nextXPSafe, 1);
    const barX = textX;
    const barY = 220;
    const barWidth = 500;
    const barHeight = 28;
    const barRadius = barHeight / 2;

    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, barRadius);
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; 
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 215, 0, 0.3)"; 
    ctx.lineWidth = 1;
    ctx.stroke();

    const fillWidth = Math.max(barWidth * progress, barRadius * 2); 
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillWidth, barHeight, barRadius);
    ctx.clip(); 
    
    const fillGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    fillGrad.addColorStop(0, "#D4AF37"); 
    fillGrad.addColorStop(0.5, "#FFDF00"); 
    fillGrad.addColorStop(1, "#F8E076"); 
    ctx.fillStyle = fillGrad;
    ctx.fillRect(barX, barY, fillWidth, barHeight);
    ctx.restore();

    // Tekst na pasku postępu (też korzysta z nowej funkcji premium!)
    const progressText = `${stats.xp.toLocaleString()} / ${nextXPSafe.toLocaleString()} XP`;
    ctx.font = "bold 15px Cinzel";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle"; // Ustawienie pośrodku dla paska
    
    drawTextPremium(progressText, barX + barWidth / 2, barY + barHeight / 2 + 1, "#FFFFFF");
    
    ctx.textBaseline = "alphabetic"; // Reset

    return await canvas.encode("png");
}

module.exports = { generateProfileCard };
