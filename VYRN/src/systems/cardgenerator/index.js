const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");

// Rejestracja czcionek
try {
    GlobalFonts.registerFromPath(path.join(__dirname, '..', 'assets', 'Cinzel-Bold.ttf'), 'Cinzel');
} catch (e) { console.warn("⚠️ Brak czcionki Cinzel."); }

class CardGenerator {
    constructor() {
        this.width = 900;
        this.height = 300;
        this.colors = {
            gold: "#FFD700",
            silver: "#C0C0C0",
            white: "#FFFFFF",
            black: "#000000",
            bgOverlay: "rgba(0, 0, 0, 0.5)"
        };
    }

    /**
     * Główna metoda generująca kartę (Uniwersalna)
     */
    async createCard(data) {
        const canvas = createCanvas(this.width, this.height);
        const ctx = canvas.getContext("2d");

        // 1. Załadowanie zasobów
        const assets = await this._loadAssets(data);

        // 2. Tło (z zaokrąglonymi rogami)
        this._drawBackground(ctx, assets.background);

        // 3. Awatar (z ramką i poświatą)
        if (assets.avatar) {
            this._drawAvatar(ctx, assets.avatar);
        }

        // 4. Renderowanie Treści (Dynamiczne)
        this._renderContent(ctx, data, assets);

        // 5. Pasek Postępu (Opcjonalny)
        if (data.progress !== undefined) {
            this._drawProgressBar(ctx, data.progress, data.progressText);
        }

        return await canvas.encode("png");
    }

    // ====================== METODY PRYWATNE (LOGIKA RYSOWANIA) ======================

    async _loadAssets(data) {
        return {
            background: await loadImage(data.bgUrl || "https://i.imgur.com/RAC3GWt.png").catch(() => null),
            avatar: await loadImage(data.avatarUrl).catch(() => null),
            icon: data.iconUrl ? await loadImage(data.iconUrl).catch(() => null) : null,
            rank: data.rankUrl ? await loadImage(data.rankUrl).catch(() => null) : null
        };
    }

    _drawBackground(ctx, img) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, this.width, this.height, 40);
        ctx.clip();

        if (img) {
            ctx.drawImage(img, 0, 0, this.width, this.height);
        } else {
            ctx.fillStyle = "#0f0f0f";
            ctx.fillRect(0, 0, this.width, this.height);
        }

        // Nakładka przyciemniająca
        ctx.fillStyle = this.colors.bgOverlay;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
    }

    _drawAvatar(ctx, img) {
        const size = 190;
        const x = 50, y = (this.height - size) / 2;
        const centerX = x + size / 2, centerY = y + size / 2;

        ctx.save();
        // Poświata (Outer Glow)
        ctx.shadowColor = this.colors.gold;
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size / 2 + 5, 0, Math.PI * 2);
        ctx.strokeStyle = this.colors.gold;
        ctx.lineWidth = 8;
        ctx.stroke();

        // Wycięcie awatara
        ctx.beginPath();
        ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x, y, size, size);
        ctx.restore();
    }

    _renderContent(ctx, data, assets) {
        const startX = 280;
        
        // Tytuł (np. Nick użytkownika)
        this._drawText(ctx, data.title.toUpperCase(), startX, 90, "bold 50px Cinzel", this.colors.white);

        // Linia ozdobna (Złoty gradient)
        const grad = ctx.createLinearGradient(startX, 0, this.width - 50, 0);
        grad.addColorStop(0, this.colors.gold);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(startX, 105, 550, 3);

        // Sekcja "Info" (np. Ranga)
        if (data.subtitle) {
            if (assets.rank) ctx.drawImage(assets.rank, startX, 125, 35, 35);
            this._drawText(ctx, data.subtitle, startX + (assets.rank ? 45 : 0), 153, "28px Cinzel", this.colors.gold);
        }

        // Statystyki (LVL, VAULT, BOOST)
        if (data.stats && Array.isArray(data.stats)) {
            let currentX = startX;
            data.stats.forEach(stat => {
                this._drawText(ctx, `${stat.label}:`, currentX, 195, "22px Cinzel", this.colors.silver);
                const labelW = ctx.measureText(`${stat.label}: `).width;
                this._drawText(ctx, stat.value, currentX + labelW, 195, "bold 22px Cinzel", this.colors.white);
                currentX += labelW + ctx.measureText(stat.value).width + 50;
            });
        }
    }

    _drawProgressBar(ctx, progress, text) {
        const x = 280, y = 230, w = 550, h = 35;
        const radius = 15;
        const fillWidth = Math.min(w * progress, w);

        // Tło paska
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,215,0,0.3)";
        ctx.stroke();

        // Wypełnienie (Złoty gradient 3D)
        if (fillWidth > 20) {
            ctx.beginPath();
            ctx.roundRect(x, y, fillWidth, h, radius);
            const grad = ctx.createLinearGradient(x, 0, x + w, 0);
            grad.addColorStop(0, "#8B6508");
            grad.addColorStop(0.5, "#FFD700");
            grad.addColorStop(1, "#FFFACD");
            ctx.fillStyle = grad;
            ctx.fill();
        }

        // Napis na pasku
        if (text) {
            ctx.textAlign = "center";
            this._drawText(ctx, text, x + w / 2, y + 24, "bold 16px Cinzel", this.colors.white, true);
        }
        ctx.restore();
    }

    _drawText(ctx, text, x, y, font, color, center = false) {
        ctx.save();
        ctx.font = font;
        if (center) ctx.textAlign = "center";
        
        // Obrys
        ctx.strokeStyle = this.colors.black;
        ctx.lineWidth = 5;
        ctx.lineJoin = "round";
        ctx.strokeText(text, x, y);

        // Wypełnienie
        ctx.fillStyle = color;
        ctx.shadowColor = "rgba(0,0,0,0.9)";
        ctx.shadowBlur = 4;
        ctx.fillText(text, x, y);
        ctx.restore();
    }
}

module.exports = new CardGenerator();