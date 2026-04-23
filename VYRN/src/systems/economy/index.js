// =====================================================
// ECONOMY SYSTEM - PROFESSIONAL CLEAN VERSION (FIXED)
// =====================================================
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || "./data";
const COINS_PATH = path.join(DATA_DIR, "userCoins.json");
const COINS_TMP_PATH = `${COINS_PATH}.tmp`;

let userCoins = new Map(); // userId => coins
let writeQueue = Promise.resolve();
let saveTimeout = null;

// =====================================================
// INIT FOLDER
// =====================================================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`[ECONOMY] Data directory ready: ${DATA_DIR}`);
}

// =====================================================
// HELPERS
// =====================================================
function toSafeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.floor(num) : fallback;
}

// =====================================================
// LOAD
// =====================================================
function loadCoins() {
  try {
    if (!fs.existsSync(COINS_PATH)) {
      fs.writeFileSync(COINS_PATH, JSON.stringify({}, null, 2));
      userCoins = new Map();
      console.log("[ECONOMY] Utworzono userCoins.json");
      return;
    }

    const raw = fs.readFileSync(COINS_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : {};

    userCoins = new Map();

    for (const [userId, coins] of Object.entries(parsed)) {
      userCoins.set(userId, toSafeNumber(coins));
    }

    console.log(`[ECONOMY] Załadowano ${userCoins.size} użytkowników`);
  } catch (error) {
    console.error("[ECONOMY] LOAD ERROR:", error.message);
    userCoins = new Map();
  }
}

// =====================================================
// INTERNAL SAVE
// =====================================================
function flushSave() {
  const snapshot = JSON.stringify(Object.fromEntries(userCoins), null, 2);

  writeQueue = writeQueue
    .catch(() => null)
    .then(async () => {
      try {
        await fs.promises.writeFile(COINS_TMP_PATH, snapshot, "utf8");
        await fs.promises.rename(COINS_TMP_PATH, COINS_PATH);
        console.log("[ECONOMY] ✅ Saved");
      } catch (error) {
        console.error("[ECONOMY] SAVE ERROR:", error.message);
      }
    });

  return writeQueue;
}

// =====================================================
// SMART SAVE (debounce)
// =====================================================
function saveCoins() {
  clearTimeout(saveTimeout);

  saveTimeout = setTimeout(() => {
    flushSave();
  }, 1500);
}

// =====================================================
// CORE
// =====================================================
function getCoins(userId) {
  if (!userId) return 0;
  return userCoins.get(userId) || 0;
}

function addCoins(userId, amount) {
  if (!userId) return 0;

  const value = toSafeNumber(amount);
  if (value <= 0) return getCoins(userId);

  const current = getCoins(userId);
  const updated = current + value;

  userCoins.set(userId, updated);
  saveCoins();

  return updated;
}

function removeCoins(userId, amount) {
  if (!userId) return 0;

  const value = toSafeNumber(amount);
  if (value <= 0) return getCoins(userId);

  const current = getCoins(userId);
  const updated = Math.max(0, current - value);

  userCoins.set(userId, updated);
  saveCoins();

  return updated;
}

function spendCoins(userId, amount) {
  if (!userId) return false;

  const value = toSafeNumber(amount);
  const current = getCoins(userId);

  if (value <= 0) return true;
  if (current < value) return false;

  userCoins.set(userId, current - value);
  saveCoins();

  return true;
}

function setCoins(userId, amount) {
  if (!userId) return 0;

  const value = Math.max(0, toSafeNumber(amount));

  userCoins.set(userId, value);
  saveCoins();

  return value;
}

function hasEnoughCoins(userId, amount) {
  return getCoins(userId) >= toSafeNumber(amount);
}

function transferCoins(fromUserId, toUserId, amount) {
  if (!fromUserId || !toUserId || fromUserId === toUserId) return false;

  const value = toSafeNumber(amount);
  if (value <= 0) return false;

  if (!hasEnoughCoins(fromUserId, value)) return false;

  spendCoins(fromUserId, value);
  addCoins(toUserId, value);

  return true;
}

function getTopUsers(limit = 10) {
  return Array.from(userCoins.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([userId, coins], index) => ({
      rank: index + 1,
      userId,
      coins
    }));
}

// =====================================================
// INIT
// =====================================================
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

  console.log("💰 Economy System → załadowany");
}

// =====================================================
// EXPORTS
// =====================================================
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
  transferCoins,
  getTopUsers
};
