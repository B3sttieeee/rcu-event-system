const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || "/data";   // <-- WAŻNE dla Railway
const COINS_PATH = path.join(DATA_DIR, "userCoins.json");
const COINS_TMP_PATH = `${COINS_PATH}.tmp`;

// =====================================================
// CACHE & WRITE QUEUE
// =====================================================
let userCoins = new Map();        // userId => coins
let writeQueue = Promise.resolve();

// =====================================================
// INIT
// =====================================================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`[ECONOMY] Data directory ready: ${DATA_DIR}`);
}

// =====================================================
// HELPERS
// =====================================================
const toSafeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? Math.floor(num) : fallback;
};

const logError = (scope, error) => {
  console.error(`[ECONOMY] ${scope}`);
  if (error?.stack) console.error(error.stack);
  else console.error(error);
};

// =====================================================
// LOAD & SAVE
// =====================================================
function loadCoins() {
  try {
    if (!fs.existsSync(COINS_PATH)) {
      userCoins = new Map();
      fs.writeFileSync(COINS_PATH, JSON.stringify({}, null, 2));
      console.log("[ECONOMY] Utworzono nowy plik userCoins.json");
      return;
    }

    const raw = fs.readFileSync(COINS_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : {};

    userCoins = new Map();
    for (const [userId, coins] of Object.entries(parsed)) {
      userCoins.set(userId, toSafeNumber(coins, 0));
    }

    console.log(`[ECONOMY] Załadowano monety dla ${userCoins.size} użytkowników`);
  } catch (error) {
    logError("LOAD ERROR", error);
    userCoins = new Map();
  }
}

function saveCoins() {
  if (userCoins.size === 0) return writeQueue;

  const snapshot = JSON.stringify(Object.fromEntries(userCoins), null, 2);

  writeQueue = writeQueue
    .catch(() => null)
    .then(async () => {
      try {
        await fs.promises.writeFile(COINS_TMP_PATH, snapshot, "utf8");
        await fs.promises.rename(COINS_TMP_PATH, COINS_PATH);
      } catch (error) {
        logError("SAVE ERROR", error);
      }
    });

  return writeQueue;
}

async function flushCoins() {
  try {
    await writeQueue;
  } catch (e) {
    logError("FLUSH ERROR", e);
  }
}

// =====================================================
// CORE FUNCTIONS
// =====================================================
function getCoins(userId) {
  if (!userId) return 0;
  return userCoins.get(userId) || 0;
}

function addCoins(userId, amount) {
  if (!userId) return 0;
  const safeAmount = Math.floor(Math.max(0, Number(amount) || 0));
  if (safeAmount <= 0) return getCoins(userId);

  const current = getCoins(userId);
  const newAmount = current + safeAmount;

  userCoins.set(userId, newAmount);
  saveCoins();

  return newAmount;
}

function spendCoins(userId, amount) {
  if (!userId) return false;
  const safeAmount = Math.floor(Math.max(0, Number(amount) || 0));
  if (safeAmount <= 0) return true;

  const current = getCoins(userId);
  if (current < safeAmount) return false;

  userCoins.set(userId, current - safeAmount);
  saveCoins();

  return true;
}

function setCoins(userId, amount) {
  if (!userId) return 0;
  const safeAmount = Math.floor(Math.max(0, Number(amount) || 0));
  userCoins.set(userId, safeAmount);
  saveCoins();
  return safeAmount;
}

// =====================================================
// UTILITIES
// =====================================================
function hasEnoughCoins(userId, amount) {
  return getCoins(userId) >= Math.floor(Number(amount) || 0);
}

function getTopUsers(limit = 10) {
  return Array.from(userCoins.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([userId, coins]) => ({ userId, coins }));
}

// =====================================================
// PROCESS EXIT
// =====================================================
process.on("SIGINT", async () => {
  await flushCoins();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await flushCoins();
  process.exit(0);
});

// =====================================================
// EXPORTS
// =====================================================
module.exports = {
  loadCoins,
  getCoins,
  addCoins,
  spendCoins,
  setCoins,
  hasEnoughCoins,
  getTopUsers,
  flushCoins
};
