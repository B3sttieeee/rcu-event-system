const fs = require("fs");
const path = require("path");

const DATA_DIR = "/data";
const COINS_PATH = path.join(DATA_DIR, "userCoins.json");

let userCoins = new Map(); // userId => coins

// INIT
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadCoins() {
  if (!fs.existsSync(COINS_PATH)) {
    fs.writeFileSync(COINS_PATH, JSON.stringify({}, null, 2));
    return;
  }
  try {
    const data = JSON.parse(fs.readFileSync(COINS_PATH, "utf-8"));
    userCoins = new Map(Object.entries(data).map(([id, coins]) => [id, Number(coins)]));
    console.log(`[ECONOMY] Załadowano monety dla ${userCoins.size} użytkowników`);
  } catch (err) {
    console.error("[ECONOMY] Błąd odczytu userCoins.json:", err.message);
  }
}

function saveCoins() {
  try {
    const data = Object.fromEntries(userCoins);
    fs.writeFileSync(COINS_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[ECONOMY] Błąd zapisu userCoins.json:", err.message);
  }
}

function getCoins(userId) {
  return userCoins.get(userId) || 0;
}

function addCoins(userId, amount) {
  if (amount <= 0) return 0;
  const current = getCoins(userId);
  const newAmount = current + Math.floor(amount);
  userCoins.set(userId, newAmount);
  saveCoins();
  return newAmount;
}

function spendCoins(userId, amount) {
  const current = getCoins(userId);
  if (current < amount) return false;
  userCoins.set(userId, current - amount);
  saveCoins();
  return true;
}

module.exports = {
  loadCoins,
  getCoins,
  addCoins,
  spendCoins,
};
