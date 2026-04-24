// =====================================================
// ECONOMY SYSTEM - VYRN PRO FIXED STABLE (FINAL FIX)
// =====================================================

const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || "/data";
const COINS_PATH = path.join(DATA_DIR, "userCoins.json");
const TMP_PATH = `${COINS_PATH}.tmp`;

let userCoins = new Map();

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ====================== SAFE ======================
function safeJSON(raw, fallback = {}) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

// ====================== LOAD ======================
function loadCoins() {
  try {
    if (!fs.existsSync(COINS_PATH)) {
      fs.writeFileSync(COINS_PATH, JSON.stringify({}, null, 2));
      userCoins = new Map();
      console.log("💰 Economy file created");
      return;
    }

    const raw = fs.readFileSync(COINS_PATH, "utf8");
    const data = safeJSON(raw, {});

    userCoins = new Map();

    for (const [id, value] of Object.entries(data)) {
      userCoins.set(id, toNumber(value));
    }

    console.log(`💰 Economy loaded: ${userCoins.size} users`);
  } catch (err) {
    console.error("[ECONOMY LOAD ERROR]", err);
    userCoins = new Map();
  }
}

// ====================== SAVE (SYNC SAFE) ======================
function saveCoins() {
  try {
    const snapshot = JSON.stringify(Object.fromEntries(userCoins), null, 2);

    fs.writeFileSync(TMP_PATH, snapshot);
    fs.renameSync(TMP_PATH, COINS_PATH);

  } catch (err) {
    console.error("[ECONOMY SAVE ERROR]", err);
  }
}

// ====================== SAFE WRAPS ======================
function getCoins(userId) {
  return userCoins.get(userId) || 0;
}

function addCoins(userId, amount) {
  const value = toNumber(amount);
  if (!userId || value <= 0) return getCoins(userId);

  const updated = getCoins(userId) + value;
  userCoins.set(userId, updated);

  saveCoins(); // 🔥 NATYCHMIAST ZAPIS
  return updated;
}

function spendCoins(userId, amount) {
  const value = toNumber(amount);
  if (getCoins(userId) < value) return false;

  userCoins.set(userId, getCoins(userId) - value);
  saveCoins();
  return true;
}

// ====================== INIT ======================
function init() {
  loadCoins();

  // 🔥 BACKUP SAVE ON EXIT
  process.on("SIGINT", saveCoins);
  process.on("SIGTERM", saveCoins);
  process.on("exit", saveCoins);

  console.log("💰 Economy INIT OK");
}

module.exports = {
  init,
  getCoins,
  addCoins,
  spendCoins,
  loadCoins,
  saveCoins
};
