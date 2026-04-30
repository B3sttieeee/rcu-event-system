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
    const rankUrl = RANK_ICONS[rankName] || RANK_ICONS["BRONZE"]; // Jeśli nie znajdzie rangi, da brąz

    // Ładujemy wszystkie obrazy naraz dla lepszej wydajności
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

    // Jednolita, złota ramka wokół awatara
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, avatarSize / 2 + 5, 0, Math.PI * 2);
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 5;
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)"; 
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.stroke();
    ctx.restore();

    // Rysowanie grafiki awatara
    if (avatarImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, avatarSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();
    }

    // --- 5. TEKST Z CIENIEM (CZYTELNOŚĆ) ---
    const textX = 240;

    const applyTextShadow = () => {
        ctx.shadowColor = "rgba(0, 0, 0, 1)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
    };

    const clearShadow = () => {
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    };

    // --- NAZWA UŻYTKOWNIKA ---
    ctx.font = "bold 46px Cinzel";
    ctx.fillStyle = "#FFFFFF";
    applyTextShadow();
    ctx.fillText(member.username.toUpperCase(), textX, 100);
    clearShadow(); 

    // --- DEKORACYJNA ZŁOTA LINIA ---
    const lineGrad = ctx.createLinearGradient(textX, 0, textX + 500, 0);
    lineGrad.addColorStop(0, "#FFD700");
    lineGrad.addColorStop(1, "transparent");
    ctx.fillStyle = lineGrad;
    ctx.fillRect(textX, 115, 500, 2);

    // --- RANGA (Z IKONKĄ IMGUR) ---
    // Najpierw rysujemy ikonkę rangi
    if (rankImg) {
        // Dodaję subtelny cień pod ikonkę, żeby nie zlewała się z tłem
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 5;
        ctx.drawImage(rankImg, textX, 131, 28, 28);
        clearShadow();
    }
    
    ctx.font = "bold 24px Cinzel";
    applyTextShadow();
    ctx.fillStyle = "#FFD700";
    ctx.fillText("RANK: ", textX + 35, 155);
    const rankLabelWidth = ctx.measureText("RANK: ").width;
    
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(rankName, textX + 35 + rankLabelWidth, 155);
    clearShadow();

    // --- STATYSTYKI (LVL i VAULT Z IKONKĄ KASY) ---
    ctx.font = "bold 20px Cinzel";
    const statsY = 195;

    applyTextShadow();
    // LVL
    ctx.fillStyle = "#E0E0E0"; 
    ctx.fillText("LVL:", textX, statsY);
    ctx.fillStyle = "#FFFFFF"; 
    ctx.fillText(` ${stats.level}`, textX + 45, statsY);

    // VAULT
    const vaultX = textX + 150;
    ctx.fillStyle = "#E0E0E0";
    ctx.fillText("VAULT:", vaultX, statsY);
    const vaultLabelWidth = ctx.measureText("VAULT: ").width;
    
    const vaultValue = ` ${stats.coins.toLocaleString()}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(vaultValue, vaultX + vaultLabelWidth, statsY);
    clearShadow();
    
    // Rysowanie ikony kasy
    if (coinImg) {
        const vaultValueWidth = ctx.measureText(vaultValue).width;
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 5;
        // Ustawiamy odpowiednie przesunięcie dla ikony monet
        ctx.drawImage(coinImg, vaultX + vaultLabelWidth + vaultValueWidth + 8, statsY - 18, 24, 24);
        clearShadow();
    }

    // --- 6. CZYSTY PASEK POSTĘPU ---
    const nextXPSafe = stats.nextXP || 100;
    const progress = Math.min(stats.xp / nextXPSafe, 1);
    const barX = textX;
    const barY = 220;
    const barWidth = 500;
    const barHeight = 28;
    const barRadius = barHeight / 2;

    // Ciemne tło paska
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, barRadius);
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; 
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 215, 0, 0.3)"; 
    ctx.lineWidth = 1;
    ctx.stroke();

    // Złote wypełnienie paska
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

    // Tekst na pasku postępu
    const progressText = `${stats.xp.toLocaleString()} / ${nextXPSafe.toLocaleString()} XP`;
    ctx.font = "bold 15px Cinzel";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    applyTextShadow();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(progressText, barX + barWidth / 2, barY + barHeight / 2 + 1);
    clearShadow();

    return await canvas.encode("png");
}

module.exports = { generateProfileCard };
