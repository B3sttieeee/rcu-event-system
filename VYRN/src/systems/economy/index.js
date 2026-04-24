// =====================================================
// ECONOMY SYSTEM - ULTRA STABLE SAVE
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
}

// ====================== LOAD ======================
function loadCoins() {
  try {
    if (!fs.existsSync(COINS_PATH)) {
      fs.writeFileSync(COINS_PATH, JSON.stringify({}, null, 2));
      console.log("[ECONOMY] Utworzono nowy userCoins.json");
      userCoins = new Map();
      return;
    }

    const raw = fs.readFileSync(COINS_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : {};

    userCoins = new Map();
    for (const [id, val] of Object.entries(parsed)) {
      userCoins.set(id, Math.floor(Number(val) || 0));
    }

    console.log(`[ECONOMY] Załadowano ${userCoins.size} użytkowników`);
  } catch (err) {
    console.error("[ECONOMY] LOAD ERROR:", err.message);
    userCoins = new Map();
  }
}

// ====================== SAVE (ATOMIC + SYNC FALLBACK) ======================
function saveCoins() {
  try {
    const data = Object.fromEntries(userCoins);
    const snapshot = JSON.stringify(data, null, 2);

    // Atomic write
    fs.writeFileSync(COINS_TMP_PATH, snapshot, "utf8");
    fs.renameSync(COINS_TMP_PATH, COINS_PATH);

    console.log(`[ECONOMY] ✅ Zapisano userCoins.json (${userCoins.size} użytkowników)`);
  } catch (err) {
    console.error("[ECONOMY] SAVE ERROR:", err.message);
    // Fallback - spróbuj zapisać bezpośrednio
    try {
      fs.writeFileSync(COINS_PATH, JSON.stringify(Object.fromEntries(userCoins), null, 2));
    } catch (e2) {
      console.error("[ECONOMY] CRITICAL SAVE FAILED", e2.message);
    }
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
  const newVal = current + val;

  userCoins.set(userId, newVal);
  saveCoins();                    // ZAPIS OD RAZU

  console.log(`[ECONOMY] +${val} | ${userId} | ${current} → ${newVal}`);
  return newVal;
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

// ====================== INIT ======================
function init() {
  loadCoins();
  console.log("💰 Economy System → załadowany");

  // Awaryjny zapis co 15 sekund
  setInterval(saveCoins, 15000);

  // Zapis przy wyłączaniu
  process.on("SIGINT", saveCoins);
  process.on("SIGTERM", saveCoins);
  process.on("beforeExit", saveCoins);
}

module.exports = {
  init,
  getCoins,
  addCoins,
  spendCoins,
  // możesz dodać setCoins, hasEnoughCoins, getTopUsers jeśli potrzebujesz
};
