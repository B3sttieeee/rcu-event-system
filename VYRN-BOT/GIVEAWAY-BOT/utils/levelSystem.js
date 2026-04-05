const fs = require("fs");
const { ChannelType } = require("discord.js");

// ====================== TWOJA ORYGINALNA ŚCIEŻKA ======================
const DATA_DIR = "/data";
const DB_PATH = "/data/levels.json";
const CONFIG_PATH = "/data/levelConfig.json";

// ====================== INIT ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log("📁 Folder /data utworzony");
}

// ====================== CACHE ======================
let dbCache = null;
let configCache = null;
let voiceSystemRunning = false;

// ====================== COOLDOWNS ======================
const xpCooldown = new Map();

// ====================== HELPERS ======================
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ====================== LOAD DB ======================
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    console.log("[LEVEL] levels.json NIE ISTNIEJE → tworzę nowy pusty plik");
    const initial = { xp: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    dbCache = initial;
    return dbCache;
  }

  if (!dbCache) {
    try {
      dbCache = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
      const userCount = Object.keys(dbCache.xp || {}).length;
      console.log(`[LEVEL] Załadowano levels.json → ${userCount} użytkowników`);
      if (userCount === 0) console.log("[LEVEL] UWAGA: Plik jest pusty (brak użytkowników)");
    } catch (err) {
      console.error("[LEVEL] Błąd odczytu levels.json → tworzę nowy", err.message);
      dbCache = { xp: {} };
      fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
    }
  }
  return dbCache;
}

function saveDB() {
  if (dbCache) {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
    } catch (err) {
      console.error("[LEVEL] Błąd zapisu levels.json:", err.message);
    }
  }
}

// ====================== CONFIG (bez zmian) ======================
function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    const defaultConfig = {
      messageXP: 3,
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

function saveConfig() {
  if (configCache) fs.writeFileSync(CONFIG_PATH, JSON.stringify(configCache, null, 2));
}

// ... reszta funkcji (addXP, checkRoles, startVoiceXP, setters) bez zmian ...

// ====================== EXPORT (WAŻNE!) ======================
module.exports = {
  addXP,
  startVoiceXP,
  loadConfig,
  loadDB,           // ← musi być wyeksportowane dla /profile
  saveDB,
  setMessageXP,
  setVoiceXP,
  setLengthBonus,
  setGlobalMultiplier,
};
