const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");

// Rejestracja czcionki Cinzel-Bold
GlobalFonts.registerFromPath(path.join(__dirname, 'Cinzel-Bold.ttf'), 'Cinzel');

async function generateProfileCard(member, stats) {
    const width = 800;
    const height = 280;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // 1. ZAOKRĄGLONE ROGI KARTY
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 30);
    ctx.clip();

    // 2. ŁADOWANIE TŁA
    try {
        // Używamy Twojego tła z Imgur
        const background = await loadImage("https://imgur.com/RAC3GWt.png");
        ctx.drawImage(background, 0, 0, width, height);
    } catch (err) {
        ctx.fillStyle = "#0A0A0A";
        ctx.fillRect(0, 0, width, height);
    }

    // --- POPRAWIONA CZYTELNOŚĆ: Mocniejszy Gradient Przyciemniający ---
    const dusk = ctx.createLinearGradient(0, 0, width * 0.8, 0);
    dusk.addColorStop(0, "rgba(0, 0, 0, 0.9)");   // Głęboka czerń pod awatarem
    dusk.addColorStop(0.4, "rgba(0, 0, 0, 0.6)"); // Półmrok pod tekstami
    dusk.addColorStop(1, "rgba(0, 0, 0, 0)");     // Przejście w czyste tło po prawej
    ctx.fillStyle = dusk;
    ctx.fillRect(0, 0, width, height);

    // 3. AWATAR Z EFEKTEM PRESTIŻU
    const avatarSize = 160;
    const avatarX = 45;
    const avatarY = height / 2 - avatarSize / 2;

    // Złoty blask wokół awatara
    ctx.save();
    ctx.shadowColor = "rgba(255, 215, 0, 0.5)";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 3, 0, Math.PI * 2);
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Wycinanie i rysowanie awatara
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    const avatarImg = await loadImage(member.displayAvatarURL({ extension: "png", size: 256 }));
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Główna złota ramka
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 5;
    ctx.stroke();

    // 4. TEKSTY - PERFEKCYJNA CZYTELNOŚĆ
    const textX = 240;

    // NAZWA UŻYTKOWNIKA (Większa, z cieniem i odstępami)
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 1)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 46px Cinzel";
    // @napi-rs/canvas wspiera letterSpacing w nowszych wersjach, jeśli nie - ignoruje
    ctx.letterSpacing = "2px"; 
    ctx.fillText(member.username.toUpperCase(), textX, 95);
    ctx.restore();

    // Złota linia pod imieniem
    const lineGradient = ctx.createLinearGradient(textX, 0, textX + 400, 0);
    lineGradient.addColorStop(0, "rgba(255, 215, 0, 0.8)");
    lineGradient.addColorStop(1, "rgba(255, 215, 0, 0)");
    ctx.fillStyle = lineGradient;
    ctx.fillRect(textX, 105, 400, 2);

    // RANGA
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 26px Cinzel";
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 5;
    ctx.fillText(`RANK: ${stats.rankName.toUpperCase()}`, textX, 145);

    // STATYSTYKI (Hierarchia kolorów)
    ctx.font = "19px Cinzel";
    
    // Level
    ctx.fillStyle = "#B0B3C0"; // Szary opis
    ctx.fillText("LEVEL: ", textX, 180);
    let levelLabelWidth = ctx.measureText("LEVEL: ").width;
    ctx.fillStyle = "#FFFFFF"; // Biała wartość (bardziej widoczna)
    ctx.fillText(`${stats.level}`, textX + levelLabelWidth, 180);

    // Vault (Przesunięty kawałek dalej)
    const vaultX = textX + 140;
    ctx.fillStyle = "#B0B3C0";
    ctx.fillText(" •  VAULT: ", vaultX, 180);
    let vaultLabelWidth = ctx.measureText(" •  VAULT: ").width;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`${stats.coins.toLocaleString()} COINS`, vaultX + vaultLabelWidth, 180);

    // 5. PASEK XP (Premium Glass)
    const barX = textX;
    const barY = 210;
    const barWidth = 510;
    const barHeight = 32;
    const radius = 16;

    // Tło paska
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, radius);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 215, 0, 0.2)";
    ctx.stroke();

    // Wypełnienie paska
    const nextXPSafe = stats.nextXP || 100;
    const progress = Math.max(0.05, Math.min(1, stats.xp / nextXPSafe));
    
    const xpGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    xpGradient.addColorStop(0, "#8B6508"); // Ciemne złoto
    xpGradient.addColorStop(0.5, "#FFD700"); // Jasne złoto
    xpGradient.addColorStop(1, "#DAA520"); // Metaliczne złoto

    ctx.fillStyle = xpGradient;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * progress, barHeight, radius);
    ctx.fill();

    // Tekst na pasku (Z obrysem dla czytelności na złocie)
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 16px Cinzel";
    
    // Ciemny obrys pod tekstem (stroke)
    ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
    ctx.lineWidth = 4;
    ctx.strokeText(`${stats.xp.toLocaleString()} / ${nextXPSafe.toLocaleString()} XP`, barX + barWidth / 2, barY + 22);
    
    // Biały tekst właściwy
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`${stats.xp.toLocaleString()} / ${nextXPSafe.toLocaleString()} XP`, barX + barWidth / 2, barY + 22);
    ctx.restore();

    // 6. FINALIZACJA
    return await canvas.encode("png");
}

module.exports = { generateProfileCard };
