// src/systems/boost/index.js (lub activity/boost.js - w zależności gdzie to trzymasz)
const fs = require("fs");
const path = require("path");

// =====================================================
// VYRN • PRESTIGE BOOST SYSTEM 🚀
// =====================================================
// KLUCZOWE DLA RAILWAY: Ścieżka celująca prosto w Mount Path: /data
const DATA_DIR = process.env.DATA_DIR || "/data";
const BOOST_PATH = path.join(DATA_DIR, "activeBoosts.json");
const BOOST_TMP_PATH = path.join(DATA_DIR, "activeBoosts.json.tmp");

let activeBoosts = new Map();

// Zabezpieczenie przed brakiem folderu Volume
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn(`[BOOST] Nie można utworzyć folderu ${DATA_DIR} - prawdopodobnie już istnieje lub brak uprawnień root.`);
  }
}

// ====================== DATABASE ======================
function loadBoosts() {
  try {
    console.log(`[BOOST] Szukam bazy mnożników na dysku Railway (Ścieżka: ${DATA_DIR})`);
    
    if (!fs.existsSync(BOOST_PATH)) {
      fs.writeFileSync(BOOST_PATH, JSON.stringify({}, null, 2), "utf8");
      activeBoosts = new Map();
      console.log("🟡 [BOOST] Brak pliku activeBoosts.json. Utworzono nową bazę mnożników.");
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
    // Bezpieczny zapis przez plik tymczasowy na dysk Volume
    fs.writeFileSync(BOOST_TMP_PATH, JSON.stringify(obj, null, 2), "utf8");
    fs.renameSync(BOOST_TMP_PATH, BOOST_PATH);
  } catch (err) {
    console.error("🔥 [BOOST SAVE ERROR] BŁĄD ZAPISU DO VOLUME RAILWAY:", err.message);
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
      // W przyszłości można tu podpiąć wysyłanie DM, że boost wygasł
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
  { id: "boost_2", name: "Power Grind", multiplier: 2.0, durationHours: 1, price: 15000 },
  { id: "boost_3", name: "Elite Overload", multiplier: 3.0, durationHours: 1, price: 45000 }
  { id: "boost_4", name: "Mega Overload", multiplier: 5.0, durationHours: 1, price: 85000 }
];

// ====================== BUY SYSTEM ======================
async function buyBoost(userId, boostId) {
  try {
    // Dynamiczny require, aby uniknąć problemów z tzw. circular dependency przy starcie bota
    const economy = require("../economy"); 
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

    saveBoosts(); // Zapis od razu po zakupie
    return { success: true, boost, endTime: newEndTime };

  } catch (err) {
    console.error("🔥 [BOOST BUY ERROR]", err);
    return { success: false, reason: "INTERNAL_ERROR" };
  }
}

// ====================== INIT ======================
function init(client) {
  loadBoosts();
  // Czyść wygasłe mnożniki co minutę
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
