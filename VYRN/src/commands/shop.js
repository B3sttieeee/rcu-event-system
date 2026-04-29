// src/systems/boost/index.js
const fs = require("fs");
const path = require("path");

// =====================================================
// VYRN • PRESTIGE BOOST SYSTEM 🚀
// =====================================================
const DATA_DIR = process.env.DATA_DIR || "/data";
const BOOST_PATH = path.join(DATA_DIR, "activeBoosts.json");
const BOOST_TMP_PATH = path.join(DATA_DIR, "activeBoosts.json.tmp");

let activeBoosts = new Map();

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn(`[BOOST] Nie można utworzyć folderu ${DATA_DIR}.`);
  }
}

// ====================== DATABASE ======================
function loadBoosts() {
  try {
    console.log(`[BOOST] Szukam bazy mnożników na dysku Railway (Ścieżka: ${DATA_DIR})`);
    
    if (!fs.existsSync(BOOST_PATH)) {
      fs.writeFileSync(BOOST_PATH, JSON.stringify({}, null, 2), "utf8");
      activeBoosts = new Map();
      return;
    }
    
    const raw = fs.readFileSync(BOOST_PATH, "utf8");
    const data = raw.trim() ? JSON.parse(raw) : {};

    activeBoosts = new Map();
    for (const [id, boost] of Object.entries(data)) {
      activeBoosts.set(id, {
        multiplier: Number(boost?.multiplier || 1),
        endTime: Number(boost?.endTime || 0),
        name: boost?.name || "Unknown Multiplier",
        type: boost?.type || "shop"
      });
    }
    console.log(`✅ [BOOST] Wczytano aktywne mnożniki (Rozmiar: ${activeBoosts.size} graczy)`);
  } catch (err) {
    console.error("🔥 [BOOST LOAD ERROR] KRYTYCZNY BŁĄD ODCZYTU:", err.message);
    activeBoosts = new Map();
  }
}

function saveBoosts() {
  try {
    if (activeBoosts.size === 0 && !fs.existsSync(BOOST_PATH)) return;

    const obj = Object.fromEntries(activeBoosts);
    fs.writeFileSync(BOOST_TMP_PATH, JSON.stringify(obj, null, 2), "utf8");
    fs.renameSync(BOOST_TMP_PATH, BOOST_PATH);
  } catch (err) {
    console.error("🔥 [BOOST SAVE ERROR]", err.message);
  }
}

// ====================== CORE LOGIC ======================
function cleanExpired() {
  const now = Date.now();
  let changed = false;

  for (const [id, boost] of activeBoosts.entries()) {
    if (!boost?.endTime || boost.endTime <= now) {
      activeBoosts.delete(id);
      changed = true;
    }
  }
  if (changed) saveBoosts();
}

function getCurrentBoost(userId) {
  cleanExpired();
  const boost = activeBoosts.get(userId);
  return boost ? boost.multiplier : 1;
}

function getRemainingTime(userId) {
  const boost = activeBoosts.get(userId);
  if (!boost) return 0;
  const remaining = boost.endTime - Date.now();
  return Math.max(0, remaining);
}

// ====================== DYNAMIC SHOP GENERATOR ======================
// System automatycznie buduje 24 opcje sklepu (Limit Discorda to 25 w Select Menu)

const BASE_BOOSTS = [
  { name: "Basic Surge", multiplier: 1.5, basePrice: 2500 },
  { name: "Power Grind", multiplier: 2.0, basePrice: 6000 },
  { name: "Elite Overload", multiplier: 3.0, basePrice: 15000 },
  { name: "Mega Overload", multiplier: 5.0, basePrice: 35000 }
];

const DURATIONS = [
  { label: "15m", hours: 0.25, priceMult: 1.0 },   // Baza ceny
  { label: "30m", hours: 0.50, priceMult: 1.8 },   // Trochę taniej niż x2
  { label: "1h",  hours: 1.00, priceMult: 3.2 },
  { label: "3h",  hours: 3.00, priceMult: 8.5 },
  { label: "6h",  hours: 6.00, priceMult: 15.0 },
  { label: "24h", hours: 24.0, priceMult: 45.0 }   // Najlepsza opłacalność
];

const SHOP_BOOSTS = [];
BASE_BOOSTS.forEach(base => {
  DURATIONS.forEach(time => {
    SHOP_BOOSTS.push({
      id: `boost_${base.multiplier}x_${time.label}`,
      name: base.name,
      multiplier: base.multiplier,
      durationHours: time.hours,
      durationText: time.label, // Dodane, aby ładnie wyświetlać w shop.js
      price: Math.floor(base.basePrice * time.priceMult)
    });
  });
});

// ====================== BUY SYSTEM ======================
async function buyBoost(userId, boostId) {
  try {
    const economy = require("../economy"); 
    const boost = SHOP_BOOSTS.find(b => b.id === boostId);

    if (!boost) return { success: false, reason: "INVALID_BOOST" };

    const success = economy.removeCoins(userId, boost.price);
    if (!success) return { success: false, reason: "INSUFFICIENT_FUNDS" };

    const durationMs = boost.durationHours * 60 * 60 * 1000;
    const current = activeBoosts.get(userId);

    let newEndTime;
    if (current && current.multiplier === boost.multiplier) {
        newEndTime = current.endTime + durationMs;
    } else {
        newEndTime = Date.now() + durationMs;
    }

    activeBoosts.set(userId, {
      multiplier: boost.multiplier,
      endTime: newEndTime,
      name: boost.name,
      type: "shop"
    });

    saveBoosts();
    return { success: true, boost, endTime: newEndTime };

  } catch (err) {
    console.error("🔥 [BOOST BUY ERROR]", err);
    return { success: false, reason: "INTERNAL_ERROR" };
  }
}

// ====================== INIT ======================
function init(client) {
  loadBoosts();
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
