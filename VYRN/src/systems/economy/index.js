// =====================================================
// ECONOMY SYSTEM - VYRN PRO FIXED STABLE
// =====================================================

const fs = require("fs");
const path = require("path");

// ====================== PATH ======================
const DATA_DIR = process.env.DATA_DIR || "/data";
const COINS_PATH = path.join(DATA_DIR, "userCoins.json");
const TMP_PATH = `${COINS_PATH}.tmp`;

// ====================== CACHE ======================
let userCoins = new Map();
let saveQueue = Promise.resolve();
let saveTimeout = null;

// expose for leaderboard (IMPORTANT FIX)
global.__ECONOMY_MAP = userCoins;

// ====================== INIT ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ====================== SAFE NUMBER ======================
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
      global.__ECONOMY_MAP = userCoins;
      return;
    }

    const raw = fs.readFileSync(COINS_PATH, "utf8");
    const data = raw.trim() ? JSON.parse(raw) : {};

    userCoins = new Map();

    for (const [id, value] of Object.entries(data)) {
      userCoins.set(id, toNumber(value));
    }

    global.__ECONOMY_MAP = userCoins;

    console.log(`💰 Economy loaded: ${userCoins.size} users`);

  } catch (err) {
    console.error("[ECONOMY] LOAD ERROR:", err.message);
    userCoins = new Map();
    global.__ECONOMY_MAP = userCoins;
  }
}

// ====================== SAVE (ATOMIC SAFE) ======================
function flushSave() {
  const snapshot = JSON.stringify(Object.fromEntries(userCoins), null, 2);

  saveQueue = saveQueue
    .catch(() => null)
    .then(async () => {
      try {
        await fs.promises.writeFile(TMP_PATH, snapshot);
        await fs.promises.rename(TMP_PATH, COINS_PATH);
      } catch (err) {
        console.error("[ECONOMY] SAVE ERROR:", err.message);
      }
    });

  return saveQueue;
}

function saveCoins() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(flushSave, 800);
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

function transferCoins(from, to, amount) {
  const value = toNumber(amount);

  if (!hasEnoughCoins(from, value)) return false;

  spendCoins(from, value);
  addCoins(to, value);

  return true;
}

// ====================== TOP SYSTEM (FIXED) ======================
function getTopUsers(limit = 10) {
  return [...userCoins.entries()]
    .map(([userId, coins]) => ({
      userId,
      coins: toNumber(coins)
    }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, limit);
}

// ====================== DEBUG EXPORT ======================
function getAllCoins() {
  return Object.fromEntries(userCoins);
}

// ====================== INIT ======================
function init() {
  loadCoins();
  flushSave();
}

// ====================== EXPORT ======================
module.exports = {
  init,

  getCoins,
  addCoins,
  removeCoins,
  spendCoins,
  setCoins,
  hasEnoughCoins,
  transferCoins,

  getTopUsers,
  getAllCoins
};
