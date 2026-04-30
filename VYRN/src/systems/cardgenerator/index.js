const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");

// Rejestracja Twojej nowej czcionki
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

    // 2. ŁADOWANIE TŁA Z IMGUR
    try {
        const background = await loadImage("https://imgur.com/RAC3GWt.png");
        ctx.drawImage(background, 0, 0, width, height);
    } catch (err) {
        // Fallback jeśli Imgur zablokuje połączenie
        ctx.fillStyle = "#101116";
        ctx.fillRect(0, 0, width, height);
    }

    // Dodatkowa warstwa "Dusk" - przyciemnienie lewej strony dla lepszego kontrastu awatara i tekstu
    const dusk = ctx.createLinearGradient(0, 0, width, 0);
    dusk.addColorStop(0, "rgba(0, 0, 0, 0.85)");
    dusk.addColorStop(0.5, "rgba(0, 0, 0, 0.4)");
    dusk.addColorStop(1, "rgba(0, 0, 0, 0.1)");
    ctx.fillStyle = dusk;
    ctx.fillRect(0, 0, width, height);

    // 3. AWATAR Z EFEKTEM OBRĄCZKI PRESTIŻU
    const avatarSize = 160;
    const avatarX = 45;
    const avatarY = height / 2 - avatarSize / 2;

    // Zewnętrzny złoty blask awatara
    ctx.save();
    ctx.shadowColor = "rgba(255, 215, 0, 0.4)";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 5, 0, Math.PI * 2);
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Rysowanie awatara
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

    // 4. TEKSTY - UŻYCIE CZCIONKI CINZEL
    const textX = 240;

    // Nazwa użytkownika z lekkim "Golden Glow"
    ctx.save();
    ctx.shadowColor = "rgba(255, 215, 0, 0.5)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 44px Cinzel";
    ctx.fillText(member.username.toUpperCase(), textX, 95);
    ctx.restore();

    // Linia dekoracyjna pod nazwą
    ctx.fillStyle = "rgba(255, 215, 0, 0.6)";
    ctx.fillRect(textX, 105, 300, 2);

    // Ranga i Statystyki
    ctx.fillStyle = "#FFD700";
    ctx.font = "22px Cinzel";
    ctx.fillText(`RANK: ${stats.rankName.toUpperCase()}`, textX, 140);
    
    ctx.fillStyle = "#E0E0E0";
    ctx.font = "18px Cinzel";
    ctx.fillText(`LEVEL: ${stats.level}   •   VAULT: ${stats.coins.toLocaleString()} COINS`, textX, 175);

    // 5. ZAAWANSOWANY PASEK XP (GLASS-MORPHISM)
    const barX = textX;
    const barY = 205;
    const barWidth = 510;
    const barHeight = 32;
    const radius = 16;

    // Tło paska - efekt szklany
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, radius);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 215, 0, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Wypełnienie paska (Złoty Gradient)
    const nextXPSafe = stats.nextXP || 100;
    const progress = Math.max(0.05, Math.min(1, stats.xp / nextXPSafe));
    
    const xpGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    xpGradient.addColorStop(0, "#B8860B"); // Dark Goldenrod
    xpGradient.addColorStop(0.5, "#FFD700"); // Gold
    xpGradient.addColorStop(1, "#DAA520"); // Goldenrod

    ctx.fillStyle = xpGradient;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * progress, barHeight, radius);
    ctx.fill();

    // Tekst XP - wycentrowany na pasku
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 15px Cinzel";
    ctx.textAlign = "center";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 5;
    ctx.fillText(`${stats.xp.toLocaleString()} / ${nextXPSafe.toLocaleString()} XP`, barX + barWidth / 2, barY + 21);

    // 6. EKSPORT
    return await canvas.encode("png");
}

module.exports = { generateProfileCard };
