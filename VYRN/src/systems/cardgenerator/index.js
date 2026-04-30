const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");

// Rejestracja czcionki
GlobalFonts.registerFromPath(path.join(__dirname, 'Cinzel-Bold.ttf'), 'Cinzel');

// ==========================================
// FUNKCJE POMOCNICZE (HELPERS)
// ==========================================

// Rysuje wektorowy diament (zamiast brakującego emoji)
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
    
    // Wewnętrzny otwór/wzór (tworzy efekt pierścienia)
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fill();
    
    ctx.restore();
}

// Zaawansowany pasek postępu ze światłocieniem
function drawPremiumProgressBar(ctx, x, y, width, height, progress, text) {
    const radius = height / 2;
    
    // 1. Tło paska (Track)
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fill();
    
    // Wewnętrzny cień tła paska
    ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Zewnętrzna obwódka (subtelna)
    ctx.beginPath();
    ctx.roundRect(x - 1, y - 1, width + 2, height + 2, radius + 1);
    ctx.strokeStyle = "rgba(255, 215, 0, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. Wypełnienie (Fill)
    const fillWidth = Math.max(width * progress, radius * 2); // Zapewnia, że pasek nie będzie "płaski" na starcie
    
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, fillWidth, height, radius);
    ctx.clip(); // Przycięcie do zaokrągleń
    
    // Główny gradient wypełnienia
    const fillGrad = ctx.createLinearGradient(x, 0, x + width, 0);
    fillGrad.addColorStop(0, "#8B6508"); // Ciemne złoto
    fillGrad.addColorStop(0.5, "#FFD700"); // Standardowe złoto
    fillGrad.addColorStop(1, "#FFF8DC"); // Bardzo jasne złoto na końcu paska
    ctx.fillStyle = fillGrad;
    ctx.fillRect(x, y, fillWidth, height);
    
    // Efekt szkła 3D na górze wypełnienia
    const highlightGrad = ctx.createLinearGradient(0, y, 0, y + height / 2);
    highlightGrad.addColorStop(0, "rgba(255, 255, 255, 0.4)");
    highlightGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = highlightGrad;
    ctx.fillRect(x, y, fillWidth, height / 2);
    ctx.restore();

    // 3. Tekst na pasku
    ctx.font = "bold 15px Cinzel";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Mocny cień dla czytelności
    ctx.fillStyle = "#000000";
    ctx.fillText(text, x + width / 2 + 1, y + height / 2 + 1);
    ctx.fillText(text, x + width / 2 - 1, y + height / 2 - 1);
    
    // Właściwy tekst
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(text, x + width / 2, y + height / 2);
    
    // Reset baseline dla reszty funkcji
    ctx.textBaseline = "alphabetic";
}

// ==========================================
// GŁÓWNA FUNKCJA GENERUJĄCA
// ==========================================

async function generateProfileCard(member, stats) {
    const width = 800;
    const height = 280;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // 1. ZAAOKRĄGLONE ROGI (CLIPPING)
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 30);
    ctx.clip();

    // 2. TŁO I WINIETA
    try {
        const background = await loadImage("https://imgur.com/RAC3GWt.png");
        const ratio = Math.max(width / background.width, height / background.height);
        const bgW = background.width * ratio;
        const bgH = background.height * ratio;
        ctx.drawImage(background, (width - bgW) / 2, (height - bgH) / 2, bgW, bgH);
    } catch (err) {
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, width, height);
    }

    // Dodanie "winiety" (przyciemnione krawędzie, jaśniejszy środek)
    const vignette = ctx.createRadialGradient(width/2, height/2, width/4, width/2, height/2, width);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0.1)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.85)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // Boczny cień pod tekstami (dla absolutnej czytelności)
    const sideShadow = ctx.createLinearGradient(0, 0, width * 0.7, 0);
    sideShadow.addColorStop(0, "rgba(0, 0, 0, 0.7)");
    sideShadow.addColorStop(1, "transparent");
    ctx.fillStyle = sideShadow;
    ctx.fillRect(0, 0, width, height);

    // 3. AWATAR
    const avatarSize = 160;
    const avatarX = 45;
    const avatarY = height / 2 - avatarSize / 2;
    const centerX = avatarX + avatarSize / 2;
    const centerY = avatarY + avatarSize / 2;

    // Gradientowa ramka awatara (wygląda o wiele lepiej niż jednolity kolor)
    const ringGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
    ringGrad.addColorStop(0, "#FFDF00");
    ringGrad.addColorStop(0.5, "#DAA520");
    ringGrad.addColorStop(1, "#8B6508");

    // Efekt poświaty ramki
    ctx.save();
    ctx.shadowColor = "rgba(255, 215, 0, 0.5)";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(centerX, centerY, avatarSize / 2 + 4, 0, Math.PI * 2);
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();

    // Wycinanie i rysowanie zdjęcia
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    const avatarImg = await loadImage(member.displayAvatarURL({ extension: "png", size: 256 }));
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Wewnętrzny cienki pasek dla głębi awatara
    ctx.beginPath();
    ctx.arc(centerX, centerY, avatarSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. TYPOGRAFIA (TEKSTY)
    const textX = 240;

    // --- Nazwa Użytkownika ---
    ctx.save();
    ctx.font = "bold 46px Cinzel";
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillText(member.username.toUpperCase(), textX, 90);
    ctx.restore();

    // --- Dekoracyjna Linia z Akcentem ---
    const lineGrad = ctx.createLinearGradient(textX, 0, textX + 450, 0);
    lineGrad.addColorStop(0, "rgba(255, 215, 0, 1)");
    lineGrad.addColorStop(0.8, "rgba(255, 215, 0, 0.1)");
    lineGrad.addColorStop(1, "transparent");
    ctx.fillStyle = lineGrad;
    ctx.fillRect(textX, 105, 450, 2);
    
    // Mały kwadracik na początku linii
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(textX, 104, 4, 4);

    // --- Ranga ---
    ctx.font = "bold 24px Cinzel";
    drawDiamond(ctx, textX + 10, 137, 8); // Zastępuje kwadracik "[]"
    
    ctx.fillStyle = "#FFD700";
    ctx.fillText("RANK: ", textX + 30, 145);
    const rankLabelWidth = ctx.measureText("RANK: ").width;
    
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(stats.rankName.toUpperCase(), textX + 30 + rankLabelWidth, 145);

    // --- Statystyki (LVL i VAULT) ---
    ctx.font = "bold 20px Cinzel";
    const statsY = 180;

    // LVL
    ctx.fillStyle = "#A0A0A0"; // Szary dla etykiety
    ctx.fillText("LVL:", textX, statsY);
    ctx.fillStyle = "#FFFFFF"; // Biały dla wartości
    ctx.fillText(` ${stats.level}`, textX + 45, statsY);

    // VAULT
    const vaultX = textX + 130;
    ctx.fillStyle = "#A0A0A0";
    ctx.fillText("VAULT:", vaultX, statsY);
    const vaultLabelWidth = ctx.measureText("VAULT: ").width;
    
    ctx.fillStyle = "#FFD700";
    const vaultValue = ` ${stats.coins.toLocaleString()}`;
    ctx.fillText(vaultValue, vaultX + vaultLabelWidth, statsY);
    
    // Rysowanie ikony monety (zastępuje "[]")
    const vaultValueWidth = ctx.measureText(vaultValue).width;
    drawCoin(ctx, vaultX + vaultLabelWidth + vaultValueWidth + 12, statsY - 6, 7);

    // 5. PASEK POSTĘPU (Z UŻYCIEM NOWEJ FUNKCJI POMOCNICZEJ)
    const nextXPSafe = stats.nextXP || 100;
    const currentProgress = Math.min(stats.xp / nextXPSafe, 1);
    const progressText = `${stats.xp.toLocaleString()} / ${nextXPSafe.toLocaleString()} XP`;

    drawPremiumProgressBar(ctx, textX, 215, 500, 32, currentProgress, progressText);

    return await canvas.encode("png");
}

module.exports = { generateProfileCard };
