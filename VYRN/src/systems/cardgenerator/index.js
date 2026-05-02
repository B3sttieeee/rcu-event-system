const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");

class CardGenerator {
    constructor() {
        this.width = 900;
        this.height = 300;
        this.isFontLoaded = false;
        this.colors = {
            gold: "#FFD700",
            silver: "#C0C0C0",
            white: "#FFFFFF",
            bgOverlay: "rgba(0, 0, 0, 0.65)"
        };
    }

    init() {
        if (this.isFontLoaded) return;
        try {
            // Ścieżka wychodzi z systems/cardgenerator/ do src/assets/
            const fontPath = path.join(__dirname, "../../../assets/Cinzel-Bold.ttf");
            GlobalFonts.registerFromPath(fontPath, 'Cinzel');
            this.isFontLoaded = true;
        } catch (e) {
            console.warn("⚠️ [CANVAS] Brak czcionki Cinzel - sprawdź src/assets/!");
        }
    }

    async createCard(data) {
        this.init();
        const canvas = createCanvas(this.width, this.height);
        const ctx = canvas.getContext("2d");

        const [bg, av, rankIcon] = await Promise.all([
            loadImage(data.bgUrl || "https://i.imgur.com/RAC3GWt.png").catch(() => null),
            loadImage(data.avatarUrl).catch(() => null),
            data.rankUrl ? loadImage(data.rankUrl).catch(() => null) : null
        ]);

        // Tło
        ctx.save();
        this._drawRoundedRect(ctx, 0, 0, this.width, this.height, 40);
        ctx.clip();
        if (bg) ctx.drawImage(bg, 0, 0, this.width, this.height);
        ctx.fillStyle = this.colors.bgOverlay;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();

        // Awatar
        if (av) {
            const size = 180, x = 50, y = 60;
            ctx.save();
            ctx.shadowColor = this.colors.gold;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(x + size/2, y + size/2, size/2 + 5, 0, Math.PI * 2);
            ctx.strokeStyle = this.colors.gold;
            ctx.lineWidth = 6;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(av, x, y, size, size);
            ctx.restore();
        }

        // Teksty
        const startX = 280;
        this._drawText(ctx, data.title.toUpperCase(), startX, 85, "bold 46px Cinzel", this.colors.white);
        
        const grad = ctx.createLinearGradient(startX, 0, this.width - 50, 0);
        grad.addColorStop(0, this.colors.gold); grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(startX, 105, 550, 3);

        if (rankIcon) ctx.drawImage(rankIcon, startX, 125, 30, 30);
        this._drawText(ctx, data.subtitle, startX + (rankIcon ? 40 : 0), 150, "26px Cinzel", this.colors.gold);

        if (data.stats) {
            let curX = startX;
            data.stats.forEach(s => {
                this._drawText(ctx, `${s.label}:`, curX, 195, "20px Cinzel", this.colors.silver);
                const lw = ctx.measureText(`${s.label}: `).width;
                this._drawText(ctx, s.value, curX + lw, 195, "bold 20px Cinzel", this.colors.white);
                curX += lw + ctx.measureText(s.value).width + 40;
            });
        }

        // Pasek
        if (data.progress !== undefined) {
            const bx = startX, by = 225, bw = 550, bh = 30;
            ctx.fillStyle = "rgba(0,0,0,0.8)";
            this._drawRoundedRect(ctx, bx, by, bw, bh, 15);
            ctx.fill();
            
            const fillW = Math.max(bw * data.progress, 25);
            const fGrad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
            fGrad.addColorStop(0, "#8B6508"); fGrad.addColorStop(0.5, "#FFD700"); fGrad.addColorStop(1, "#FFFACD");
            ctx.fillStyle = fGrad;
            this._drawRoundedRect(ctx, bx, by, fillW, bh, 15);
            ctx.fill();

            if (data.progressText) {
                ctx.textAlign = "center";
                this._drawText(ctx, data.progressText, bx + bw/2, by + 21, "bold 14px Cinzel", this.colors.white, true);
            }
        }

        return canvas.toBuffer("image/png");
    }

    _drawRoundedRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    _drawText(ctx, text, x, y, font, color, center = false) {
        ctx.save();
        ctx.font = font;
        if (center) ctx.textAlign = "center";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 4;
        ctx.strokeText(text, x, y);
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        ctx.restore();
    }
}

module.exports = new CardGenerator();