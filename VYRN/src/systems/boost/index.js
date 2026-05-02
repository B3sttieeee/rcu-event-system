const fs = require("fs").promises; // Przechodzimy na asynchroniczne dla Railway
const path = require("path");

// =====================================================
// VYRN • PRESTIGE BOOST SYSTEM 🚀
// =====================================================
const DATA_DIR = process.env.DATA_DIR || "/data";
const BOOST_PATH = path.join(DATA_DIR, "activeBoosts.json");

let activeBoosts = new Map();

// ====================== DATABASE ======================

async function loadBoosts() {
    try {
        await require("fs").promises.mkdir(DATA_DIR, { recursive: true });
        const raw = await fs.readFile(BOOST_PATH, "utf8").catch(() => "{}");
        const data = JSON.parse(raw);

        activeBoosts = new Map();
        for (const [id, boost] of Object.entries(data)) {
            // Wczytujemy tylko te, które jeszcze nie wygasły
            if (boost.endTime > Date.now()) {
                activeBoosts.set(id, boost);
            }
        }
        console.log(`✅ [BOOST] Wczytano aktywne mnożniki: ${activeBoosts.size}`);
    } catch (err) {
        console.error("🔥 [BOOST LOAD ERROR]:", err.message);
        activeBoosts = new Map();
    }
}

async function saveBoosts() {
    try {
        const obj = Object.fromEntries(activeBoosts);
        await fs.writeFile(BOOST_PATH, JSON.stringify(obj, null, 2), "utf8");
    } catch (err) {
        console.error("🔥 [BOOST SAVE ERROR]:", err.message);
    }
}

// ====================== CORE LOGIC ======================

function cleanExpired() {
    const now = Date.now();
    let changed = false;

    for (const [id, boost] of activeBoosts.entries()) {
        if (boost.endTime <= now) {
            activeBoosts.delete(id);
            changed = true;
        }
    }
    if (changed) saveBoosts();
}

/**
 * Główna funkcja dla systemu Activity
 */
function getCurrentBoost(userId) {
    const boost = activeBoosts.get(userId);
    if (!boost || boost.endTime <= Date.now()) return 1;
    return boost.multiplier;
}

function getRemainingTime(userId) {
    const boost = activeBoosts.get(userId);
    if (!boost) return 0;
    return Math.max(0, boost.endTime - Date.now());
}

// ====================== DYNAMIC SHOP CONFIG ======================

const BASE_BOOSTS = [
    { name: "Basic Surge", multiplier: 1.5, basePrice: 2500, emoji: "⚡" },
    { name: "Power Grind", multiplier: 2.0, basePrice: 6000, emoji: "🔥" },
    { name: "Elite Overload", multiplier: 3.0, basePrice: 15000, emoji: "💎" },
    { name: "Mega Overload", multiplier: 5.0, basePrice: 35000, emoji: "👑" }
];

const DURATIONS = [
    { label: "15m", hours: 0.25, priceMult: 1.0 },
    { label: "30m", hours: 0.50, priceMult: 1.8 },
    { label: "1h",  hours: 1.00, priceMult: 3.2 },
    { label: "3h",  hours: 3.00, priceMult: 8.5 },
    { label: "6h",  hours: 6.00, priceMult: 15.0 },
    { label: "24h", hours: 24.0, priceMult: 45.0 }
];

const SHOP_BOOSTS = [];
BASE_BOOSTS.forEach(base => {
    DURATIONS.forEach(time => {
        SHOP_BOOSTS.push({
            id: `boost_${base.multiplier}x_${time.label}`,
            name: `${base.emoji} ${base.name}`,
            multiplier: base.multiplier,
            durationHours: time.hours,
            durationText: time.label,
            price: Math.floor(base.basePrice * time.priceMult)
        });
    });
});

// ====================== BUY SYSTEM ======================

async function buyBoost(userId, boostId) {
    try {
        // Dynamiczny import ekonomii zapobiega Circular Dependency Error
        const economy = require("../economy"); 
        const boostItem = SHOP_BOOSTS.find(b => b.id === boostId);

        if (!boostItem) return { success: false, reason: "INVALID_BOOST" };

        // Sprawdzamy portfel
        const success = await economy.removeCoins(userId, boostItem.price);
        if (!success) return { success: false, reason: "INSUFFICIENT_FUNDS" };

        const durationMs = boostItem.durationHours * 60 * 60 * 1000;
        const current = activeBoosts.get(userId);

        let newEndTime;
        // Jeśli gracz ma już aktywny IDENTYCZNY boost - przedłużamy go
        if (current && current.multiplier === boostItem.multiplier) {
            newEndTime = Math.max(current.endTime, Date.now()) + durationMs;
        } else {
            // Jeśli ma inny boost lub nie ma wcale - ustawiamy nowy czas od teraz
            newEndTime = Date.now() + durationMs;
        }

        activeBoosts.set(userId, {
            multiplier: boostItem.multiplier,
            endTime: newEndTime,
            name: boostItem.name,
            type: "shop"
        });

        await saveBoosts();
        return { success: true, boost: boostItem, endTime: newEndTime };

    } catch (err) {
        console.error("🔥 [BOOST BUY ERROR]:", err);
        return { success: false, reason: "INTERNAL_ERROR" };
    }
}

// ====================== INIT ======================

function init(client) {
    loadBoosts();
    // Czyścimy wygasłe boosty co minutę
    setInterval(cleanExpired, 60000);
}

module.exports = {
    init,
    getCurrentBoost,
    getRemainingTime,
    buyBoost,
    SHOP_BOOSTS,
    activeBoosts
};