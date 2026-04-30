const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");

// Rejestracja czcionki
GlobalFonts.registerFromPath(path.join(__dirname, 'Cinzel-Bold.ttf'), 'Cinzel');

// ==========================================
// FUNKCJE POMOCNICZE
// ==========================================

function drawDiamond(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size / 1.5, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size / 1.5, 0);
    ctx.closePath();
    
    ctx.fillStyle = "#FFD700";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)"; // Cień samego diamentu
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.restore();
}

function drawCoin(ctx, x, y, radius) {
    ctx.save();
    ctx.translate(x, y);
    
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#FFD700";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 4;
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = "#000000"; // Wycięcie w środku monety
    ctx.fill();
    
    ctx.restore();
}

// ==========================================
// GŁÓWNA FUNKCJA
// ==========================================

async function generateProfileCard(member, stats) {
    const width = 800;
    const height = 280;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // --- 1. ZAOKRĄGLENIE KARTY ---
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 30);
    ctx.clip();

    // --- 2. CZYSTE TŁO (BEZ ŻADNYCH PANELI) ---
    try {
        const background = await loadImage("https://imgur.com/RAC3GWt.png");
        const ratio = Math.max(width / background.width, height / background.height);
        const bgW = background.width * ratio;
        const bgH = background.height * ratio;
        ctx.drawImage(background, (width - bgW) / 2, (height - bgH) / 2, bgW, bgH);
    } catch (err) {
        ctx.fillStyle = "#111111";
        ctx.fillRect(0, 0, width, height);
    }

    // --- 3. AWATAR ---
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
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)"; // Cień odrzucany przez ramkę
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.stroke();
    ctx.restore();

    // Wycinanie i ładowanie grafiki awatara
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    const avatarImg = await loadImage(member.displayAvatarURL({ extension: "png", size: 256 }));
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // --- 4. TEKST Z CIENIEM BEZPOŚREDNIM (Rozwiązanie Pkt. 1) ---
    const textX = 240;

    // Funkcja nakładająca mocny, czarny cień na litery
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
    clearShadow(); // Zawsze czyścimy cień po tekście, by nie psuł innych elementów!

    // --- DEKORACYJNA ZŁOTA LINIA ---
    const lineGrad = ctx.createLinearGradient(textX, 0, textX + 500, 0);
    lineGrad.addColorStop(0, "#FFD700");
    lineGrad.addColorStop(1, "transparent");
    ctx.fillStyle = lineGrad;
    ctx.fillRect(textX, 115, 500, 2);

    // --- RANGA ---
    ctx.font = "bold 24px Cinzel";
    
    // Rysowanie diamentu
    drawDiamond(ctx, textX + 5, 147, 8); 
    
    applyTextShadow();
    ctx.fillStyle = "#FFD700";
    ctx.fillText("RANK: ", textX + 25, 155);
    const rankLabelWidth = ctx.measureText("RANK: ").width;
    
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(stats.rankName.toUpperCase(), textX + 25 + rankLabelWidth, 155);
    clearShadow();

    // --- STATYSTYKI (LVL i VAULT) ---
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
    
    // Rysowanie monety na końcu
    const vaultValueWidth = ctx.measureText(vaultValue).width;
    drawCoin(ctx, vaultX + vaultLabelWidth + vaultValueWidth + 12, statsY - 6, 8);

    // --- 5. CZYSTY PASEK POSTĘPU ---
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
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; // Półprzezroczysta czerń, żeby zamek prześwitywał
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 215, 0, 0.3)"; // Delikatna obwódka
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
    
    // Nakładamy bezpośredni czarny cień pod tekst na pasku (gwarantuje czytelność na złocie)
    applyTextShadow();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(progressText, barX + barWidth / 2, barY + barHeight / 2 + 1);
    clearShadow();

    return await canvas.encode("png");
}

module.exports = { generateProfileCard };
