// src/systems/economy.js
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

// ====================== LOAD & SAVE ======================
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
    for (const [userId, value] of Object.entries(parsed)) {
      userCoins.set(userId, Math.floor(Number(value) || 0));
    }
    console.log(`[ECONOMY] 💰 Załadowano monety (${userCoins.size} użytkowników)`);
  } catch (err) {
    console.error("[ECONOMY] LOAD ERROR:", err.message);
    userCoins = new Map();
  }
}

function saveCoins() {
  try {
    const snapshot = JSON.stringify(Object.fromEntries(userCoins), null, 2);
    fs.writeFileSync(COINS_TMP_PATH, snapshot, "utf8");
    fs.renameSync(COINS_TMP_PATH, COINS_PATH);
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
  const newVal = current + val;
  userCoins.set(userId, newVal);
  return newVal;
}

function spendCoins(userId, amount) {
  if (!userId) return false;
  const val = Math.floor(Math.max(0, Number(amount) || 0));
  if (val <= 0) return true;

  const current = getCoins(userId);
  if (current < val) return false;

  userCoins.set(userId, current - val);
  return true;
}

function setCoins(userId, amount) {
  if (!userId) return 0;
  const val = Math.floor(Math.max(0, Number(amount) || 0));
  userCoins.set(userId, val);
  return val;
}

// ====================== INIT EXPORT ======================
function init() {
  loadCoins();
  setInterval(saveCoins, 20000); // Automatyczny zapis co 20 sekund
  process.on("SIGINT", saveCoins);
  process.on("SIGTERM", saveCoins);
}

module.exports = {
  init,
  getCoins,
  addCoins,
  spendCoins,
  setCoins
};
