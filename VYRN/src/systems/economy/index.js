// =====================================================
// ECONOMY SYSTEM - FIXED & RELIABLE SAVE
// =====================================================
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || "/data";
const COINS_PATH = path.join(DATA_DIR, "userCoins.json");
const COINS_TMP_PATH = `${COINS_PATH}.tmp`;

let userCoins = new Map();

// ====================== INIT ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`[ECONOMY] Data directory ready: ${DATA_DIR}`);
}

// ====================== LOAD ======================
function loadCoins() {
  try {
    if (!fs.existsSync(COINS_PATH)) {
      fs.writeFileSync(COINS_PATH, JSON.stringify({}, null, 2));
      console.log("[ECONOMY] Utworzono nowy plik userCoins.json");
      userCoins = new Map();
      return;
    }

    const raw = fs.readFileSync(COINS_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : {};

    userCoins = new Map();
    for (const [userId, value] of Object.entries(parsed)) {
      userCoins.set(userId, Math.floor(Number(value) || 0));
    }

    console.log(`[ECONOMY] Załadowano monety dla ${userCoins.size} użytkowników`);
  } catch (err) {
    console.error("[ECONOMY] LOAD ERROR:", err.message);
    userCoins = new Map();
  }
}

// ====================== SAVE (ATOMIC) ======================
function saveCoins() {
  try {
    const snapshot = JSON.stringify(Object.fromEntries(userCoins), null, 2);
    
    fs.writeFileSync(COINS_TMP_PATH, snapshot, "utf8");
    fs.renameSync(COINS_TMP_PATH, COINS_PATH);
    
    console.log(`[ECONOMY] ✅ Zapisano userCoins.json (${userCoins.size} użytkowników)`);
  } catch (err) {
    console.error("[ECONOMY] SAVE ERROR:", err.message);
  }
}

// ====================== CORE ======================
function getCoins(userId) {
  if (!userId) return 0;
  return userCoins.get(userId) || 0;
}

function addCoins(userId, amount) {
  if (!userId) return 0;
  const val = Math.floor(Math.max(0, Number(amount) || 0));
  if (val <= 0) return getCoins(userId);

  const current = getCoins(userId);
  const newAmount = current + val;
  
  userCoins.set(userId, newAmount);
  saveCoins();                    // ← ZAPIS PO KAŻDEJ ZMIANIE

  console.log(`[ECONOMY] +${val} monet | ${userId} | ${current} → ${newAmount}`);
  return newAmount;
}

function spendCoins(userId, amount) {
  if (!userId) return false;
  const val = Math.floor(Math.max(0, Number(amount) || 0));
  if (val <= 0) return true;

  const current = getCoins(userId);
  if (current < val) return false;

  userCoins.set(userId, current - val);
  saveCoins();
  return true;
}

function setCoins(userId, amount) {
  if (!userId) return 0;
  const val = Math.floor(Math.max(0, Number(amount) || 0));
  userCoins.set(userId, val);
  saveCoins();
  return val;
}

function hasEnoughCoins(userId, amount) {
  return getCoins(userId) >= Math.floor(Number(amount) || 0);
}

function getTopUsers(limit = 10) {
  return Array.from(userCoins.entries())
    .map(([userId, coins]) => ({ userId, coins }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, limit);
}

// ====================== INIT ======================
function init() {
  loadCoins();
  console.log("💰 Economy System → załadowany");

  // Backup save co 30 sekund (na wszelki wypadek)
  setInterval(saveCoins, 30000);

  process.on("SIGINT", saveCoins);
  process.on("SIGTERM", saveCoins);
}

module.exports = {
  init,
  loadCoins,
  getCoins,
  addCoins,
  spendCoins,
  setCoins,
  hasEnoughCoins,
  getTopUsers
};
