// src/systems/economy/index.js
const fs = require("fs");
const path = require("path");

// =====================================================
// VYRN • CORE ECONOMY ENGINE 💰
// =====================================================
const DATA_DIR = process.env.DATA_DIR || "./data";
const COINS_PATH = path.join(DATA_DIR, "userCoins.json");
const COINS_TMP_PATH = `${COINS_PATH}.tmp`;

let userCoins = new Map();

// Zabezpieczenie przed brakiem folderu
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ====================== DATABASE ======================
function loadCoins() {
  try {
    if (!fs.existsSync(COINS_PATH)) {
      fs.writeFileSync(COINS_PATH, JSON.stringify({}, null, 2));
      userCoins = new Map();
      console.log("🟡 [ECONOMY] Stworzono nową bazę danych monet.");
      return;
    }
    const raw = fs.readFileSync(COINS_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : {};
    
    userCoins = new Map();
    for (const [userId, value] of Object.entries(parsed)) {
      userCoins.set(userId, Math.floor(Number(value) || 0));
    }
    console.log(`👑 [ECONOMY] Załadowano portfele (${userCoins.size} użytkowników)`);
  } catch (err) {
    console.error("🔥 [ECONOMY] LOAD ERROR:", err.message);
    userCoins = new Map();
  }
}

function saveCoins() {
  try {
    const snapshot = JSON.stringify(Object.fromEntries(userCoins), null, 2);
    // Zapis do pliku tymczasowego i bezpieczna podmiana (chroni przed uszkodzeniem JSONa przy crashu)
    fs.writeFileSync(COINS_TMP_PATH, snapshot, "utf8");
    fs.renameSync(COINS_TMP_PATH, COINS_PATH);
  } catch (err) {
    console.error("🔥 [ECONOMY] SAVE ERROR:", err.message);
  }
}

// ====================== CORE FUNCTIONS ======================

// 📥 Sprawdzanie stanu konta
function getCoins(userId) {
  if (!userId) return 0;
  return userCoins.get(userId) || 0;
}

// ➕ Dodawanie monet
function addCoins(userId, amount) {
  if (!userId) return 0;
  const val = Math.floor(Math.max(0, Number(amount) || 0));
  if (val <= 0) return getCoins(userId);
  
  const newVal = (userCoins.get(userId) || 0) + val;
  userCoins.set(userId, newVal);
  return newVal;
}

// ➖ Odbieranie monet (np. do sklepu)
function removeCoins(userId, amount) {
  if (!userId) return false;
  const currentCoins = getCoins(userId);
  const val = Math.floor(Math.max(0, Number(amount) || 0));
  
  // Zabezpieczenie na minusowe saldo
  if (currentCoins < val) return false; 
  
  userCoins.set(userId, currentCoins - val);
  return true; // Sukces
}

// ⚙️ Wymuszanie konkretnej kwoty (Admin CMD)
function setCoins(userId, amount) {
  if (!userId) return 0;
  const val = Math.floor(Math.max(0, Number(amount) || 0));
  userCoins.set(userId, val);
  return val;
}

// 💸 Przelew między graczami
function transferCoins(fromUserId, toUserId, amount) {
  const val = Math.floor(Math.max(0, Number(amount) || 0));
  if (val <= 0) return { success: false, reason: "INVALID_AMOUNT" };
  
  if (getCoins(fromUserId) < val) return { success: false, reason: "NOT_ENOUGH_COINS" };
  
  // Pobierz i dodaj
  removeCoins(fromUserId, val);
  addCoins(toUserId, val);
  
  return { success: true };
}

// 🏆 Pobieranie Topki
function getTopUsers(limit = 10) {
  return Array.from(userCoins.entries())
    .map(([userId, coins]) => ({ userId, coins }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, limit);
}

// ✨ Estetyczne formatowanie liczb (10000 -> 10,000)
function formatCoins(amount) {
  return new Intl.NumberFormat('en-US').format(amount);
}

// ====================== INIT ======================
function init() {
  loadCoins();
  // Zapis do pliku co 30 sekund zamiast 20 (lepsza optymalizacja przy większym ruchu)
  setInterval(saveCoins, 30000); 
}

module.exports = { 
  init, 
  getCoins, 
  addCoins, 
  removeCoins, 
  setCoins,
  transferCoins,
  getTopUsers,
  formatCoins
};
