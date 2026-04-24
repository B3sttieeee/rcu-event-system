// =====================================================
// ECONOMY SYSTEM - FIXED (STABLE VERSION)
// =====================================================
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || "/data";
const COINS_PATH = path.join(DATA_DIR, "userCoins.json");
const COINS_TMP_PATH = `${COINS_PATH}.tmp`;

let userCoins = new Map();
let writeQueue = Promise.resolve();
let saveTimeout = null;

// ====================== INIT FOLDER ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
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
      return;
    }

    const raw = fs.readFileSync(COINS_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : {};

    userCoins = new Map();

    for (const [id, coins] of Object.entries(parsed)) {
      userCoins.set(id, toSafeNumber(coins));
    }
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
        await fs.promises.writeFile(COINS_TMP_PATH, snapshot);
        await fs.promises.rename(COINS_TMP_PATH, COINS_PATH);
      } catch (err) {
        console.error("[ECONOMY] SAVE ERROR:", err.message);
      }
    });

  return writeQueue;
}

function saveCoins() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(flushSave, 1000);
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

  if (!hasEnoughCoins(from, value)) return false;

  spendCoins(from, value);
  addCoins(to, value);

  return true;
}

// ====================== INIT ======================
function init() {
  loadCoins();
  flushSave();
  console.log(`💰 Economy loaded: ${userCoins.size} users`);
}

// ====================== EXPORT ======================
module.exports = {
  init,
  loadCoins,
  flushSave,
  getCoins,
  addCoins,
  removeCoins,
  spendCoins,
  setCoins,
  hasEnoughCoins,
  transferCoins
};
