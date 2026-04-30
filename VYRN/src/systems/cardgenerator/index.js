const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");

// Rejestracja czcionki
GlobalFonts.registerFromPath(path.join(__dirname, 'Cinzel-Bold.ttf'), 'Cinzel');

async function generateProfileCard(member, stats) {
    const width = 800;
    const height = 280;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // --- 1. BAZA I TŁO ---
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 30);
    ctx.clip();

    try {
        const background = await loadImage("https://imgur.com/RAC3GWt.png");
        // Używamy cover-fit, aby tło zawsze wyglądało dobrze
        const ratio = Math.max(width / background.width, height / background.height);
        const bgW = background.width * ratio;
        const bgH = background.height * ratio;
        ctx.drawImage(background, (width - bgW) / 2, (height - bgH) / 2, bgW, bgH);
    } catch (err) {
        ctx.fillStyle = "#0f0f0f";
        ctx.fillRect(0, 0, width, height);
    }

    // --- 2. NAKŁADKA "PRESTIGE DUSK" ---
    // Dodajemy pionowy gradient, który oddziela dół karty od góry
    const overlay = ctx.createLinearGradient(0, 0, width, 0);
    overlay.addColorStop(0, "rgba(0, 0, 0, 0.85)");
    overlay.addColorStop(0.5, "rgba(0, 0, 0, 0.4)");
    overlay.addColorStop(1, "rgba(0, 0, 0, 0.1)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, width, height);

    // --- 3. AWATAR Z EFEKTEM NEONU ---
    const avatarSize = 160;
    const avatarX = 40;
    const avatarY = height / 2 - avatarSize / 2;
    const centerX = avatarX + avatarSize / 2;
    const centerY = avatarY + avatarSize / 2;

    // Zewnętrzny złoty blask (Glow)
    ctx.save();
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(centerX, centerY, avatarSize / 2 + 5, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 215, 0, 0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Rysowanie awatara
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    const avatarImg = await loadImage(member.displayAvatarURL({ extension: "png", size: 256 }));
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Podwójna ramka (efekt głębi)
    ctx.beginPath();
    ctx.arc(centerX, centerY, avatarSize / 2 + 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 4;
    ctx.stroke();

    // --- 4. TYPOGRAFIA I TREŚĆ ---
    const textX = 240;

    // Nazwa użytkownika z cieniem 3D
    ctx.save();
    ctx.font = "bold 48px Cinzel";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(member.username.toUpperCase(), textX, 90);
    ctx.restore();

    // Dekoracyjna linia pod nazwą (Separator)
    const lineGrad = ctx.createLinearGradient(textX, 0, textX + 500, 0);
    lineGrad.addColorStop(0, "#FFD700");
    lineGrad.addColorStop(0.5, "rgba(255, 215, 0, 0.2)");
    lineGrad.addColorStop(1, "transparent");
    ctx.fillStyle = lineGrad;
    ctx.fillRect(textX, 105, 520, 2);

    // Ranga (Badge Style)
    ctx.font = "bold 22px Cinzel";
    ctx.fillStyle = "#FFD700";
    ctx.fillText("✧ RANK:", textX, 140);
    
    ctx.fillStyle = "#FFFFFF";
    const rankWidth = ctx.measureText("✧ RANK:").width;
    ctx.fillText(stats.rankName.toUpperCase(), textX + rankWidth + 10, 140);

    // Statystyki (Kompaktowe ikony tekstowe)
    ctx.font = "18px Cinzel";
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    
    const statsY = 175;
    ctx.fillText(`LVL:`, textX, statsY);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(stats.level, textX + 50, statsY);

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    const vaultX = textX + 150;
    ctx.fillText(`VAULT:`, vaultX, statsY);
    ctx.fillStyle = "#FFD700"; // Złoto dla waluty
    ctx.fillText(`${stats.coins.toLocaleString()} ⛃`, vaultX + 75, statsY);

    // --- 5. PROGRESS BAR (GLASS-GOLD STYLE) ---
    const barX = textX;
    const barY = 205;
    const barW = 520;
    const barH = 35;
    const radius = 10;
    
    // Tło paska (efekt szkła)
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, radius);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 215, 0, 0.15)";
    ctx.stroke();

    // Progres
    const nextXPSafe = stats.nextXP || 100;
    const progress = Math.min(Math.max(stats.xp / nextXPSafe, 0.02), 1);
    
    const progressGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    progressGrad.addColorStop(0, "#996515"); // Dark Gold
    progressGrad.addColorStop(0.5, "#FFD700"); // Gold
    progressGrad.addColorStop(1, "#FDB931"); // Bright Gold

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * progress, barH, radius);
    ctx.clip(); // Przycinamy, by gradient nie wystawał
    ctx.fillStyle = progressGrad;
    ctx.fillRect(barX, barY, barW * progress, barH);
    
    // Odblask na pasku (Lustrzany efekt)
    const glassReflection = ctx.createLinearGradient(0, barY, 0, barY + barH);
    glassReflection.addColorStop(0, "rgba(255, 255, 255, 0.2)");
    glassReflection.addColorStop(0.5, "rgba(255, 255, 255, 0)");
    glassReflection.addColorStop(1, "rgba(0, 0, 0, 0.2)");
    ctx.fillStyle = glassReflection;
    ctx.fillRect(barX, barY, barW * progress, barH);
    ctx.restore();

    // Tekst na pasku
    ctx.font = "bold 15px Cinzel";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000000"; // Cień dla czytelności
    ctx.fillText(`${stats.xp.toLocaleString()} / ${nextXPSafe.toLocaleString()} XP`, barX + barW / 2 + 1, barY + 23 + 1);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`${stats.xp.toLocaleString()} / ${nextXPSafe.toLocaleString()} XP`, barX + barW / 2, barY + 23);

    return await canvas.encode("png");
}

module.exports = { generateProfileCard };
