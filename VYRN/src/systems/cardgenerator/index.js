const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");

// Rejestracja czcionki
GlobalFonts.registerFromPath(path.join(__dirname, 'Cinzel-Bold.ttf'), 'Cinzel');

// ==========================================
// FUNKCJE POMOCNICZE (HELPERS)
// ==========================================

// Rysuje wektorowy diament (zamiast brakującego znaku w czcionce)
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
    ctx.shadowColor = "rgba(255, 215, 0, 0.6)";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
}

// Rysuje wektorową monetę z wycięciem w środku
function drawCoin(ctx, x, y, radius) {
    ctx.save();
    ctx.translate(x, y);
    
    // Zewnętrzna część monety
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#FFD700";
    ctx.shadowColor = "rgba(255, 215, 0, 0.5)";
    ctx.shadowBlur = 6;
    ctx.fill();
    
    // Wewnętrzny otwór
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fill();
    
    ctx.restore();
}

// Zaawansowany pasek postępu ze światłocieniem
function drawPremiumProgressBar(ctx, x, y, width, height, progress, text) {
    const radius = height / 2;
    
    // 1. Tło paska (Ciemne)
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fill();
    
    // Zewnętrzna obwódka
    ctx.beginPath();
    ctx.roundRect(x - 1, y - 1, width + 2, height + 2, radius + 1);
    ctx.strokeStyle = "rgba(255, 215, 0, 0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. Wypełnienie (Złoty Gradient)
    const fillWidth = Math.max(width * progress, radius * 2); 
    
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, fillWidth, height, radius);
    ctx.clip(); 
    
    const fillGrad = ctx.createLinearGradient(x, 0, x + width, 0);
    fillGrad.addColorStop(0, "#8B6508"); 
    fillGrad.addColorStop(0.5, "#FFD700"); 
    fillGrad.addColorStop(1, "#FFF8DC"); 
    ctx.fillStyle = fillGrad;
    ctx.fillRect(x, y, fillWidth, height);
    
    // Efekt odblasku na górze wypełnienia
    const highlightGrad = ctx.createLinearGradient(0, y, 0, y + height / 2);
    highlightGrad.addColorStop(0, "rgba(255, 255, 255, 0.3)");
    highlightGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = highlightGrad;
    ctx.fillRect(x, y, fillWidth, height / 2);
    ctx.restore();

    // 3. Tekst na pasku
    ctx.font = "bold 15px Cinzel";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Mocny czarny obrys (Stroke) dla maksymalnej czytelności
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#000000";
    ctx.strokeText(text, x + width / 2, y + height / 2 + 1);
    
    // Biały środek tekstu
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(text, x + width / 2, y + height / 2 + 1);
    
    ctx.textBaseline = "alphabetic"; // Reset
}

// ==========================================
// GŁÓWNA FUNKCJA GENERUJĄCA
// ==========================================

async function generateProfileCard(member, stats) {
    const width = 800;
    const height = 280;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // --- 1. ZAAOKRĄGLONE ROGI KARTY ---
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 30);
    ctx.clip();

    // --- 2. ŁADOWANIE TŁA Z IMGUR ---
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

    // --- 3. PÓŁPRZEZROCZYSTE PANELE (POPRAWA CZYTELNOŚCI) ---
    // Ogólne delikatne przyciemnienie całego obrazka
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 0, width, height);

    // Główny panel pod tekstami (ROZWIĄZUJE PROBLEM NIE CZYTELNOŚCI)
    // Tworzymy szklany, ciemny prostokąt, który odcina tekst od tła
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)"; // Ciemne, półprzezroczyste tło
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.roundRect(210, 45, 550, 205, 15); // X, Y, Szerokość, Wysokość, Zaokrąglenie
    ctx.fill();
    
    // Subtelna złota obwódka tego panelu
    ctx.strokeStyle = "rgba(255, 215, 0, 0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // --- 4. AWATAR ---
    const avatarSize = 160;
    const avatarX = 35;
    const avatarY = height / 2 - avatarSize / 2;
    const centerX = avatarX + avatarSize / 2;
    const centerY = avatarY + avatarSize / 2;

    // Gradientowa złota ramka
    const ringGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
    ringGrad.addColorStop(0, "#FFDF00");
    ringGrad.addColorStop(0.5, "#DAA520");
    ringGrad.addColorStop(1, "#8B6508");

    // Cień ramki
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(centerX, centerY, avatarSize / 2 + 5, 0, Math.PI * 2);
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();

    // Wycinanie i rysowanie awatara
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    const avatarImg = await loadImage(member.displayAvatarURL({ extension: "png", size: 256 }));
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // --- 5. TYPOGRAFIA (TEKSTY) ---
    const textX = 240;

    // Nazwa Użytkownika
    ctx.font = "bold 46px Cinzel";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(member.username.toUpperCase(), textX, 100);

    // Dekoracyjna Złota Linia
    const lineGrad = ctx.createLinearGradient(textX, 0, textX + 490, 0);
    lineGrad.addColorStop(0, "rgba(255, 215, 0, 1)");
    lineGrad.addColorStop(1, "transparent");
    ctx.fillStyle = lineGrad;
    ctx.fillRect(textX, 115, 490, 2);
    
    // --- Ranga ---
    ctx.font = "bold 24px Cinzel";
    drawDiamond(ctx, textX + 10, 147, 8); // Zastępuje kwadracik "[]"
    
    ctx.fillStyle = "#FFD700";
    ctx.fillText("RANK: ", textX + 30, 155);
    const rankLabelWidth = ctx.measureText("RANK: ").width;
    
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(stats.rankName.toUpperCase(), textX + 30 + rankLabelWidth, 155);

    // --- Statystyki (LVL i VAULT) ---
    ctx.font = "bold 20px Cinzel";
    const statsY = 190;

    // LVL
    ctx.fillStyle = "#B0B0B0"; 
    ctx.fillText("LVL:", textX, statsY);
    ctx.fillStyle = "#FFFFFF"; 
    ctx.fillText(` ${stats.level}`, textX + 45, statsY);

    // VAULT
    const vaultX = textX + 150;
    ctx.fillStyle = "#B0B0B0";
    ctx.fillText("VAULT:", vaultX, statsY);
    const vaultLabelWidth = ctx.measureText("VAULT: ").width;
    
    ctx.fillStyle = "#FFD700";
    const vaultValue = ` ${stats.coins.toLocaleString()}`;
    ctx.fillText(vaultValue, vaultX + vaultLabelWidth, statsY);
    
    // Rysowanie ikony monety (zastępuje "[]")
    const vaultValueWidth = ctx.measureText(vaultValue).width;
    drawCoin(ctx, vaultX + vaultLabelWidth + vaultValueWidth + 12, statsY - 6, 8);

    // --- 6. PASEK POSTĘPU ---
    const nextXPSafe = stats.nextXP || 100;
    const currentProgress = Math.min(stats.xp / nextXPSafe, 1);
    const progressText = `${stats.xp.toLocaleString()} / ${nextXPSafe.toLocaleString()} XP`;

    // Użycie funkcji pomocniczej dla paska
    drawPremiumProgressBar(ctx, textX, 215, 490, 25, currentProgress, progressText);

    // --- 7. FINALIZACJA ---
    return await canvas.encode("png");
}

module.exports = { generateProfileCard };
