const fs = require("fs");
const path = require("path");
const { ChannelType } = require("discord.js");
const { getCurrentBoost } = require("./boostSystem");

// ====================== PATHS ======================
const DATA_DIR = "/data";
const DB_PATH = path.join(DATA_DIR, "levels.json");
const CONFIG_PATH = path.join(DATA_DIR, "levelConfig.json");

// ====================== INIT ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ====================== CACHE ======================
let dbCache = null;
let configCache = null;
let voiceSystemRunning = false;

// ====================== COOLDOWN (tylko jeden!) ======================
const xpCooldown = new Map();   // globalny cooldown

// ====================== DATABASE ======================
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { xp: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    dbCache = initial;
    console.log("[LEVEL] Utworzono nowy levels.json");
    return dbCache;
  }
  if (!dbCache) {
    try {
      dbCache = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
      console.log(`[LEVEL] Załadowano ${Object.keys(dbCache.xp || {}).length} użytkowników`);
    } catch (err) {
      console.error("[LEVEL] Błąd odczytu levels.json:", err.message);
      dbCache = { xp: {} };
    }
  }
  return dbCache;
}

function saveDB() {
  if (dbCache) {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
    } catch (err) {
      console.error("[LEVEL] Błąd zapisu:", err.message);
    }
  }
}

// ====================== CONFIG ======================
function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    const defaultConfig = {
      messageXP: 5,        // Zwiększyłem z 3 na 5 (lepiej widać)
      voiceXP: 5,
      lengthBonus: 0.3,
      lengthThreshold: 30,
      globalMultiplier: 1,
      boostRole: "1476000398107217980"
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    configCache = defaultConfig;
    return configCache;
  }
  if (!configCache) {
    configCache = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  }
  return configCache;
}

function saveConfig() { /* ... bez zmian */ }

// ====================== MULTIPLIER ======================
function getMultiplier(member) {
  const cfg = loadConfig();
  let multi = cfg.globalMultiplier || 1;

  multi *= getCurrentBoost(member.id);           // boost ze sklepu
  if (member.roles.cache.has(cfg.boostRole)) {
    multi *= 1.75;
  }
  return multi;
}

// ====================== ADD XP (poprawiona wersja) ======================
async function addXP(member, baseAmount = 0, messageLength = 0) {
  if (!member || member.user.bot || baseAmount <= 0) return { leveledUp: false, gained: 0 };

  const now = Date.now();
  // Cooldown 2.5 sekundy (łagodniejszy)
  if (xpCooldown.has(member.id) && now - xpCooldown.get(member.id) < 2500) {
    return { leveledUp: false, gained: 0 };
  }
  xpCooldown.set(member.id, now);

  const db = loadDB();
  const cfg = loadConfig();

  if (!db.xp[member.id]) db.xp[member.id] = { xp: 0, level: 0 };

  let amount = baseAmount;

  // Bonus za długość wiadomości
  if (messageLength >= cfg.lengthThreshold) {
    amount = Math.floor(amount * (1 + cfg.lengthBonus));
  }

  // Zastosowanie mnożników
  amount = Math.floor(amount * getMultiplier(member));

  if (amount <= 0) return { leveledUp: false, gained: 0 };

  db.xp[member.id].xp += amount;

  let leveledUp = false;
  const oldLevel = db.xp[member.id].level;

  while (db.xp[member.id].xp >= neededXP(db.xp[member.id].level)) {
    db.xp[member.id].xp -= neededXP(db.xp[member.id].level);
    db.xp[member.id].level++;
    leveledUp = true;
  }

  if (leveledUp) {
    await checkRoles(member, db.xp[member.id].level);
  }

  saveDB();

  return {
    leveledUp,
    level: db.xp[member.id].level,
    xp: db.xp[member.id].xp,
    gained: amount
  };
}

// Reszta funkcji (checkRoles, startVoiceXP, settery) bez zmian...

module.exports = {
  addXP,
  startVoiceXP,
  loadDB,
  loadConfig,
  saveDB,
  setMessageXP,
  setVoiceXP,
  setLengthBonus,
  setGlobalMultiplier,
  getMultiplier,
  neededXP
};
