const fs = require("fs");
const { ChannelType } = require("discord.js");

const DATA_DIR = "/data";
const DB_PATH = "/data/levels.json";
const CONFIG_PATH = "/data/levelConfig.json";

// INIT
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// CACHE
let dbCache = null;
let configCache = null;
let voiceSystemRunning = false;

const xpCooldown = new Map();
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// ====================== LOAD DB (KLUCZOWA POPRAWKA) ======================
function loadDB() {
  console.log(`[LEVEL] Sprawdzam plik: ${DB_PATH}`);

  if (!fs.existsSync(DB_PATH)) {
    console.log("[LEVEL] Plik levels.json NIE ISTNIEJE → tworzę nowy (pusty)");
    const initial = { xp: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    dbCache = initial;
    return dbCache;
  }

  // Plik istnieje - ładujemy
  if (!dbCache) {
    try {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      dbCache = JSON.parse(raw);
      
      const userCount = Object.keys(dbCache.xp || {}).length;
      console.log(`[LEVEL] ✅ Załadowano levels.json → ${userCount} użytkowników`);

      if (userCount === 0) {
        console.log("[LEVEL] ⚠️ Plik istnieje, ale jest pusty (brak danych XP)");
      }
    } catch (err) {
      console.error("[LEVEL] ❌ Uszkodzony levels.json → tworzę nowy", err.message);
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
    } catch (e) {
      console.error("[LEVEL] Błąd zapisu:", e.message);
    }
  }
}

// Reszta pliku bez zmian (loadConfig, addXP, checkRoles, startVoiceXP itd.)

// ... (wklej tutaj całą resztę funkcji z Twojej poprzedniej wersji levelSystem.js)

// Na samym dole export:
module.exports = {
  addXP,
  startVoiceXP,
  loadConfig,
  loadDB,
  saveDB,
  setMessageXP,
  setVoiceXP,
  setLengthBonus,
  setGlobalMultiplier,
};
