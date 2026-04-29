// src/systems/economy/index.js
const fs = require("fs");
const path = require("path");

// =====================================================
// VYRN • CORE ECONOMY ENGINE 💰
// =====================================================
// KLUCZOWE DLA RAILWAY: Ścieżka celująca prosto w Mount Path: /data
const DATA_DIR = process.env.DATA_DIR || "/data"; 
const COINS_PATH = path.join(DATA_DIR, "userCoins.json");
const COINS_TMP_PATH = path.join(DATA_DIR, "userCoins.json.tmp");

let userCoins = new Map();

// Zabezpieczenie przed brakiem folderu - tworzy go natychmiast (zabezpieczenie pod Railway)
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn(`[ECONOMY] Nie można utworzyć folderu ${DATA_DIR} - prawdopodobnie już istnieje lub brak uprawnień root.`);
  }
}

// ====================== DATABASE ======================
function loadCoins() {
  try {
    console.log(`[ECONOMY] Szukam bazy portfeli na dysku Railway (Ścieżka: ${DATA_DIR})`);

    if (!fs.existsSync(COINS_PATH)) {
      fs.writeFileSync(COINS_PATH, JSON.stringify({}, null, 2), "utf8");
      userCoins = new Map();
      console.log("🟡 [ECONOMY] Brak pliku userCoins.json. Utworzono nową, czystą bazę portfeli.");
      return;
    }

    const raw = fs.readFileSync(COINS_PATH, "utf8");
    
    // Jeśli plik jest pusty, ustawiamy pusty obiekt
    if (!raw || raw.trim() === "") {
      userCoins = new Map();
      return;
    }

    const parsed = JSON.parse(raw);
    userCoins = new Map();

    for (const [userId, value] of Object.entries(parsed)) {
      let amount = 0;
      // Auto-Migracja: Obsługa starych systemów, które trzymały kasę jako obiekt (np. {"coins": 500})
      if (typeof value === "object" && value !== null) {
        amount = value.coins || value.wallet || value.balance || 0;
      } else {
        // Normalny, płaski system
        amount = value;
      }
      // Math.floor zabezpiecza przed ułamkami
      userCoins.set(userId, Math.floor(Number(amount) || 0));
    }
    
    console.log(`✅ [ECONOMY] Wczytano portfele (Rozmiar: ${userCoins.size} graczy)`);
  } catch (err) {
    console.error("🔥 [ECONOMY] KRYTYCZNY BŁĄD ODCZYTU:", err.message);
    // Nie resetujemy mapy, jeśli już coś w niej było z poprzedniego cyklu
    if (userCoins.size === 0) userCoins = new Map();
  }
}

function saveCoins() {
  try {
    if (userCoins.size === 0 && !fs.existsSync(COINS_PATH)) return;

    const dataObj = Object.fromEntries(userCoins);
    const snapshot = JSON.stringify(dataObj, null, 2);

    // Bezpieczny zapis przez plik tymczasowy na dysk Volume
    fs.writeFileSync(COINS_TMP_PATH, snapshot, "utf8");
    fs.renameSync(COINS_TMP_PATH, COINS_PATH);
  } catch (err) {
    console.error("🔥 [ECONOMY] BŁĄD ZAPISU DO VOLUME RAILWAY:", err.message);
  }
}

// ====================== CORE FUNCTIONS ======================

function getCoins(userId) {
  if (!userId) return 0;
  return userCoins.get(userId) || 0;
}

function addCoins(userId, amount) {
  if (!userId) return 0;
  const val = Math.floor(Math.max(0, Number(amount) || 0));
  if (val <= 0) return getCoins(userId);
  
  const current = userCoins.get(userId) || 0;
  const newVal = current + val;
  userCoins.set(userId, newVal);
  return newVal;
}

function removeCoins(userId, amount) {
  if (!userId) return false;
  const val = Math.floor(Math.max(0, Number(amount) || 0));
  const current = getCoins(userId);
  
  if (current < val) return false; 
  
  userCoins.set(userId, current - val);
  return true;
}

function setCoins(userId, amount) {
  if (!userId) return 0;
  const val = Math.floor(Math.max(0, Number(amount) || 0));
  userCoins.set(userId, val);
  return val;
}

function transferCoins(fromUserId, toUserId, amount) {
  const val = Math.floor(Math.max(0, Number(amount) || 0));
  if (val <= 0) return { success: false, reason: "INVALID_AMOUNT" };
  if (getCoins(fromUserId) < val) return { success: false, reason: "NOT_ENOUGH_COINS" };
  
  removeCoins(fromUserId, val);
  addCoins(toUserId, val);
  return { success: true };
}

function getTopUsers(limit = 10) {
  return Array.from(userCoins.entries())
    .map(([userId, coins]) => ({ userId, coins }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, limit);
}

function formatCoins(amount) {
  return new Intl.NumberFormat('en-US').format(Math.floor(amount || 0));
}

function forceSave() {
  saveCoins();
  console.log("💾 [ECONOMY] Ręczny zapis portfeli wykonany.");
}

// ====================== INIT ======================
function init(client) {
  loadCoins();
  // Zapisujemy co 30 sekund na bezpieczny dysk
  setInterval(saveCoins, 30000);
}

module.exports = { 
  init, 
  forceSave,
  getCoins, 
  addCoins, 
  removeCoins, 
  setCoins,
  transferCoins,
  getTopUsers,
  formatCoins
};
