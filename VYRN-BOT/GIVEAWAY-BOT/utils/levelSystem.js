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
  console.log("📁 Folder /data utworzony");
}

// ====================== CACHE ======================
let dbCache = null;
let configCache = null;
let voiceSystemRunning = false;

// ====================== COOLDOWNS ======================
const xpCooldown = new Map();

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
      const count = Object.keys(dbCache.xp || {}).length;
      console.log(`[LEVEL] Załadowano ${count} użytkowników z levels.json`);
    } catch (err) {
      console.error("[LEVEL] Błąd odczytu levels.json, tworzę nowy:", err.message);
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

// ====================== CONFIG ======================
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
    console.log("[LEVEL] Utworzono domyślną konfigurację levelConfig.json");
    return configCache;
  }

  if (!configCache) {
    try {
      configCache = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    } catch (err) {
      console.error("[LEVEL] Błąd odczytu levelConfig.json, używam domyślnych");
      configCache = {
        messageXP: 3,
        voiceXP: 5,
        lengthBonus: 0.3,
        lengthThreshold: 30,
        globalMultiplier: 1,
        boostRole: "1476000398107217980"
      };
    }
  }
  return configCache;
}

function saveConfig() {
  if (configCache) {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(configCache, null, 2));
    } catch (err) {
      console.error("[LEVEL] Błąd zapisu levelConfig.json:", err.message);
    }
  }
}

// ====================== LEVEL ROLES ======================
const LEVEL_ROLES = {
  5:  "1476000458987278397",
  15: "1476000995501670534",
  30: "1476000459595448442",
  45: "1476000991206707221",
  60: "1476000991823532032",
  75: "1476000992351879229"
};

const BOOST_ROLE = "1476000398107217980";
const BOOST_MULTIPLIER = 1.75;

// ====================== HELPERS ======================
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function neededXP(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

function getMultiplier(member) {
  const cfg = loadConfig();
  let multi = cfg.globalMultiplier || 1;

  // Lucky Boost + stały boost role
  multi *= getCurrentBoost(member.id);

  if (member.roles.cache.has(BOOST_ROLE)) {
    multi *= BOOST_MULTIPLIER;
  }

  return multi;
}

// ====================== ADD XP ======================
async function addXP(member, baseAmount = 0, messageLength = 0) {
  if (!member || member.user.bot || baseAmount <= 0) {
    return { leveledUp: false, gained: 0 };
  }

  const now = Date.now();
  if (xpCooldown.has(member.id) && now - xpCooldown.get(member.id) < 3000) {
    return { leveledUp: false, gained: 0 };
  }
  xpCooldown.set(member.id, now);

  const db = loadDB();
  const cfg = loadConfig();

  if (!db.xp[member.id]) {
    db.xp[member.id] = { xp: 0, level: 0 };
  }

  let amount = baseAmount;

  // Bonus za długość wiadomości
  if (messageLength >= cfg.lengthThreshold) {
    amount = Math.floor(amount * (1 + cfg.lengthBonus));
  }

  // Zastosowanie wszystkich mnożników
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
    gained: amount,
    oldLevel
  };
}

// ====================== ROLE CHECK ======================
async function checkRoles(member, currentLevel) {
  for (const [levelStr, roleId] of Object.entries(LEVEL_ROLES)) {
    const requiredLevel = Number(levelStr);
    if (currentLevel >= requiredLevel && !member.roles.cache.has(roleId)) {
      try {
        await member.roles.add(roleId);
        console.log(`[LEVEL] Dodano rolę level ${requiredLevel} dla ${member.user.tag}`);
      } catch (err) {
        console.error(`❌ Nie udało się dodać roli level ${requiredLevel} dla ${member.user.tag}:`, err.message);
      }
      await wait(800);
    }
  }
}

// ====================== VOICE XP ======================
function startVoiceXP(client) {
  if (voiceSystemRunning) return;
  voiceSystemRunning = true;
  console.log("🎤 System Voice XP uruchomiony.");

  setInterval(async () => {
    const cfg = loadConfig();
    const processed = new Set();

    for (const guild of client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.type !== ChannelType.GuildVoice) continue;

        for (const [memberId, member] of channel.members) {
          if (member.user.bot || 
              member.voice.selfMute || 
              member.voice.selfDeaf || 
              processed.has(memberId)) continue;

          processed.add(memberId);

          try {
            await addXP(member, cfg.voiceXP);

            // Dodawanie czasu do profileSystem
            const { addVoiceTime } = require("./profileSystem");
            if (typeof addVoiceTime === "function") {
              addVoiceTime(memberId, 60); // +1 minuta
            }
          } catch (err) {
            console.error(`❌ Voice XP błąd dla ${memberId}:`, err.message);
          }
        }
      }
    }
  }, 60000); // co minutę
}

// ====================== CONFIG SETTERS ======================
function setMessageXP(val) {
  const cfg = loadConfig();
  cfg.messageXP = Number(val) || 3;
  saveConfig();
}

function setVoiceXP(val) {
  const cfg = loadConfig();
  cfg.voiceXP = Number(val) || 5;
  saveConfig();
}

function setLengthBonus(val) {
  const cfg = loadConfig();
  cfg.lengthBonus = Number(val) || 0.3;
  saveConfig();
}

function setGlobalMultiplier(val) {
  const cfg = loadConfig();
  cfg.globalMultiplier = Math.max(0.1, Number(val) || 1);
  saveConfig();
}

// ====================== EXPORT ======================
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
  neededXP   // przydatne dla leaderboardu
};
