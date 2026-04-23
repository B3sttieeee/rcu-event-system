// =====================================================
// ECONOMY SYSTEM - FIXED VERSION
// =====================================================
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || "./data";
const COINS_PATH = path.join(DATA_DIR, "userCoins.json");
const COINS_TMP_PATH = `${COINS_PATH}.tmp`;

let userCoins = new Map();
let writeQueue = Promise.resolve();
let saveTimeout = null;

// ====================== INIT FOLDER ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`[ECONOMY] Data directory ready: ${DATA_DIR}`);
}

// ====================== HELPERS ======================
function toSafeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.floor(num) : fallback;
}

// ====================== LOAD ======================
function loadCoins() {
  try {
    if (!fs.existsSync(COINS_PATH)) {
      fs.writeFileSync(COINS_PATH, JSON.stringify({}, null, 2));
      userCoins = new Map();
      console.log("[ECONOMY] Created userCoins.json");
      return;
    }

    const raw = fs.readFileSync(COINS_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : {};

    userCoins = new Map();

    for (const [id, coins] of Object.entries(parsed)) {
      userCoins.set(id, toSafeNumber(coins));
    }

    console.log(`[ECONOMY] Loaded ${userCoins.size} users`);
  } catch (err) {
    console.error("[ECONOMY] LOAD ERROR:", err.message);
    userCoins = new Map();
  }
}

// ====================== SAVE ======================
function flushSave() {
  const snapshot = JSON.stringify(Object.fromEntries(userCoins), null, 2);

  writeQueue = writeQueue
    .catch(() => null)
    .then(async () => {
      try {
        await fs.promises.writeFile(COINS_TMP_PATH, snapshot, "utf8");
        await fs.promises.rename(COINS_TMP_PATH, COINS_PATH);

        console.log("[ECONOMY] Saved");
      } catch (err) {
        console.error("[ECONOMY] SAVE ERROR:", err.message);
      }
    });

  return writeQueue;
}

function saveCoins() {
  clearTimeout(saveTimeout);

  saveTimeout = setTimeout(() => {
    flushSave();
  }, 1200);
}

// ====================== CORE ======================
function getCoins(userId) {
  return userCoins.get(userId) || 0;
}

function addCoins(userId, amount) {
  const value = toSafeNumber(amount);
  if (!userId || value <= 0) return getCoins(userId);

  const updated = getCoins(userId) + value;
  userCoins.set(userId, updated);

  saveCoins();
  return updated;
}

function removeCoins(userId, amount) {
  const value = toSafeNumber(amount);
  if (!userId || value <= 0) return getCoins(userId);

  const updated = Math.max(0, getCoins(userId) - value);
  userCoins.set(userId, updated);

  saveCoins();
  return updated;
}

function spendCoins(userId, amount) {
  const value = toSafeNumber(amount);

  if (getCoins(userId) < value) return false;

  userCoins.set(userId, getCoins(userId) - value);
  saveCoins();

  return true;
}

function setCoins(userId, amount) {
  const value = Math.max(0, toSafeNumber(amount));

  userCoins.set(userId, value);
  saveCoins();

  return value;
}

function hasEnoughCoins(userId, amount) {
  return getCoins(userId) >= toSafeNumber(amount);
}

function transferCoins(from, to, amount) {
  const value = toSafeNumber(amount);

  if (!from || !to || from === to) return false;
  if (!hasEnoughCoins(from, value)) return false;

  spendCoins(from, value);
  addCoins(to, value);

  return true;
}

function getTopUsers(limit = 10) {
  return [...userCoins.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([userId, coins], i) => ({
      rank: i + 1,
      userId,
      coins
    }));
}

// ====================== INIT ======================
function init() {
  loadCoins();

  process.on("SIGINT", async () => {
    await flushSave();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await flushSave();
    process.exit(0);
  });

  process.on("beforeExit", async () => {
    await flushSave();
  });

  console.log("💰 Economy System loaded");
}

// ====================== EXPORT ======================
module.exports = {
  init,
  loadCoins,
  saveCoins,
  flushSave,

  getCoins,
  addCoins,
  removeCoins,
  spendCoins,
  setCoins,
  hasEnoughCoins,
  transferCoins,
  getTopUsers
};
