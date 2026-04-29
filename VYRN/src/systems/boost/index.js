// src/systems/activity/boost.js
const fs = require("fs");
const path = require("path");

// =====================================================
// VYRN • PRESTIGE BOOST SYSTEM 🚀
// =====================================================
const DATA_DIR = path.join(process.cwd(), "data");
const BOOST_PATH = path.join(DATA_DIR, "activeBoosts.json");
const BOOST_TMP_PATH = path.join(DATA_DIR, "activeBoosts.json.tmp");

let activeBoosts = new Map();

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ====================== DATABASE ======================
function loadBoosts() {
  try {
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
    console.log(`🚀 [BOOSTS] Loaded active multipliers for ${activeBoosts.size} users.`);
  } catch (err) {
    console.error("🔥 [BOOST LOAD ERROR]", err.message);
    activeBoosts = new Map();
  }
}

function saveBoosts() {
  try {
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
      // Tutaj można dodać logikę wysyłania DM do gracza "Twoje XP wygasło"
    }
  }
  if (changed) saveBoosts();
}

function getCurrentBoost(userId) {
  cleanExpired(); // Zawsze czyścimy przed sprawdzeniem
  const boost = activeBoosts.get(userId);
  return boost ? boost.multiplier : 1;
}

function getRemainingTime(userId) {
  const boost = activeBoosts.get(userId);
  if (!boost) return 0;
  const remaining = boost.endTime - Date.now();
  return Math.max(0, remaining);
}

// ====================== SHOP CONFIG ======================
// Ceny i czasy dostosowane pod klan (1h, 3h, 6h)
const SHOP_BOOSTS = [
  { id: "boost_1", name: "Basic Surge", multiplier: 1.5, durationHours: 1, price: 5000 },
  { id: "boost_2", name: "Power Grind", multiplier: 2.0, durationHours: 3, price: 15000 },
  { id: "boost_3", name: "Elite Overload", multiplier: 3.0, durationHours: 6, price: 45000 }
];

// ====================== BUY SYSTEM ======================
async function buyBoost(userId, boostId) {
  try {
    const economy = require("../economy"); // Integracja z Twoim systemem monet
    const boost = SHOP_BOOSTS.find(b => b.id === boostId);

    if (!boost) return { success: false, reason: "INVALID_BOOST" };

    // Próba pobrania monet
    const success = economy.removeCoins(userId, boost.price);
    if (!success) return { success: false, reason: "INSUFFICIENT_FUNDS" };

    const durationMs = boost.durationHours * 60 * 60 * 1000;
    const current = activeBoosts.get(userId);

    // STACKING LOGIC: Jeśli gracz ma już aktywny boost tego samego typu, przedłużamy czas
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
function init() {
  loadBoosts();
  // Czyść wygasłe co minutę
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
