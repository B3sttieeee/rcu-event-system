// =====================================================
// ECONOMY SYSTEM - VYRN PRO FINAL STABLE (NO RESET FIX)
// =====================================================

const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || "/data";
const COINS_PATH = path.join(DATA_DIR, "userCoins.json");

let userCoins = new Map();

// ====================== INIT FOLDER ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ====================== SAFE HELPERS ======================
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
      fs.writeFileSync(COINS_PATH, JSON.stringify({}, null, 2), "utf8");
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

// ====================== SAVE (SAFE ATOMIC) ======================
function saveCoins() {
  try {
    const snapshot = JSON.stringify(
      Object.fromEntries(userCoins),
      null,
      2
    );

    fs.writeFileSync(COINS_PATH, snapshot, "utf8");

  } catch (err) {
    console.error("[ECONOMY SAVE ERROR]", err);
  }
}

// ====================== CORE ======================
function getCoins(userId) {
  return userCoins.get(userId) || 0;
}

function addCoins(userId, amount) {
  const value = toNumber(amount);
  if (!userId || value <= 0) return getCoins(userId);

  const updated = getCoins(userId) + value;
  userCoins.set(userId, updated);

  saveCoins();
  return updated;
}

function removeCoins(userId, amount) {
  const value = toNumber(amount);
  const updated = Math.max(0, getCoins(userId) - value);

  userCoins.set(userId, updated);
  saveCoins();

  return updated;
}

function spendCoins(userId, amount) {
  const value = toNumber(amount);

  if (getCoins(userId) < value) return false;

  userCoins.set(userId, getCoins(userId) - value);
  saveCoins();

  return true;
}

function setCoins(userId, amount) {
  const value = Math.max(0, toNumber(amount));

  userCoins.set(userId, value);
  saveCoins();

  return value;
}

function hasEnoughCoins(userId, amount) {
  return getCoins(userId) >= toNumber(amount);
}

// ====================== TOP ======================
function getTopUsers(limit = 10) {
  return Array.from(userCoins.entries())
    .map(([userId, coins]) => ({
      userId,
      coins: toNumber(coins)
    }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, limit);
}

// ====================== INIT ======================
function init() {
  loadCoins();

  process.on("SIGINT", saveCoins);
  process.on("SIGTERM", saveCoins);

  console.log("💰 Economy INIT OK");
}

// ====================== EXPORT ======================
module.exports = {
  init,
  loadCoins,
  saveCoins,
  getCoins,
  addCoins,
  removeCoins,
  spendCoins,
  setCoins,
  hasEnoughCoins,
  getTopUsers
};
