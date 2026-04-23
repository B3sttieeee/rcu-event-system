// =====================================================
// ECONOMY SYSTEM - PROFESSIONAL CLEAN VERSION
// =====================================================
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || "/data";
const COINS_PATH = path.join(DATA_DIR, "userCoins.json");
const COINS_TMP_PATH = `${COINS_PATH}.tmp`;

let userCoins = new Map(); // userId => coins
let writeQueue = Promise.resolve();

// ====================== INIT ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`[ECONOMY] Data directory ready: ${DATA_DIR}`);
}

// ====================== HELPERS ======================
const toSafeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? Math.floor(num) : fallback;
};

// ====================== LOAD & SAVE ======================
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
    console.error(`[ECONOMY] LOAD ERROR: ${error.message}`);
    userCoins = new Map();
  }
}

function saveCoins() {
  if (userCoins.size === 0) return;

  const snapshot = JSON.stringify(Object.fromEntries(userCoins), null, 2);

  writeQueue = writeQueue
    .catch(() => null)
    .then(async () => {
      try {
        await fs.promises.writeFile(COINS_TMP_PATH, snapshot, "utf8");
        await fs.promises.rename(COINS_TMP_PATH, COINS_PATH);
        console.log(`[ECONOMY] ✅ Zapisano userCoins.json`);
      } catch (error) {
        console.error(`[ECONOMY] SAVE ERROR: ${error.message}`);
      }
    });
}

// ====================== CORE FUNCTIONS ======================
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

function hasEnoughCoins(userId, amount) {
  return getCoins(userId) >= Math.floor(Number(amount) || 0);
}

function getTopUsers(limit = 10) {
  return Array.from(userCoins.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([userId, coins]) => ({ userId, coins }));
}

// ====================== INIT ======================
function init() {
  loadCoins();
  console.log("💰 Economy System → załadowany");

  // Auto flush przy wyłączaniu
  process.on("SIGINT", async () => { await writeQueue; });
  process.on("SIGTERM", async () => { await writeQueue; });
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
