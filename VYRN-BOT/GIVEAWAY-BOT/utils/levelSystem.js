const fs = require("fs");
const { ChannelType } = require("discord.js");

// ====================== ŚCIEŻKA JAK W PROFILE ======================
const DATA_DIR = "/data";
const DB_PATH = "/data/levels.json";
const CONFIG_PATH = "/data/levelConfig.json";

// ====================== INIT ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log("📁 Utworzono folder /data");
}

// ====================== CACHE ======================
let dbCache = null;
let configCache = null;
let voiceSystemRunning = false;

// ====================== COOLDOWNS ======================
const xpCooldown = new Map();

// ====================== HELPERS ======================
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ====================== DATABASE ======================
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    console.log("[LEVEL] levels.json nie istnieje → tworzę nowy pusty plik");
    const initialData = { xp: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
    dbCache = initialData;
    return dbCache;
  }

  if (!dbCache) {
    try {
      dbCache = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
      console.log(`[LEVEL] Załadowano ${Object.keys(dbCache.xp || {}).length} użytkowników z levels.json`);
    } catch (err) {
      console.error("❌ Błąd odczytu levels.json — tworzę nowy");
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
      console.error("❌ Błąd zapisu levels.json:", err.message);
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
    return configCache;
  }

  if (!configCache) {
    try {
      configCache = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    } catch (err) {
      console.error("❌ Błąd odczytu levelConfig.json");
      configCache = { messageXP: 3, voiceXP: 5, lengthBonus: 0.3, lengthThreshold: 30, globalMultiplier: 1 };
    }
  }
  return configCache;
}

function saveConfig() {
  if (configCache) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configCache, null, 2));
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

// ====================== XP ======================
function neededXP(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

function getMultiplier(member) {
  const cfg = loadConfig();
  let multi = cfg.globalMultiplier || 1;
  if (member.roles.cache.has(BOOST_ROLE)) multi *= BOOST_MULTIPLIER;
  return multi;
}

async function addXP(member, baseAmount, messageLength = 0) {
  if (!member || member.user.bot) return { leveledUp: false, gained: 0 };

  const now = Date.now();
  if (xpCooldown.has(member.id) && now - xpCooldown.get(member.id) < 3000) {
    return { leveledUp: false, gained: 0 };
  }
  xpCooldown.set(member.id, now);

  const db = loadDB();
  const cfg = loadConfig();

  if (!db.xp[member.id]) db.xp[member.id] = { xp: 0, level: 0 };

  let amount = baseAmount || 0;
  if (messageLength >= cfg.lengthThreshold) {
    amount = Math.floor(amount * (1 + cfg.lengthBonus));
  }
  amount = Math.floor(amount * getMultiplier(member));

  if (amount <= 0) return { leveledUp: false, gained: 0 };

  db.xp[member.id].xp += amount;

  let leveledUp = false;
  const currentLevel = db.xp[member.id].level;

  while (db.xp[member.id].xp >= neededXP(db.xp[member.id].level)) {
    db.xp[member.id].xp -= neededXP(db.xp[member.id].level);
    db.xp[member.id].level++;
    leveledUp = true;
  }

  if (leveledUp) await checkRoles(member, db.xp[member.id].level);

  saveDB();

  return {
    leveledUp,
    level: db.xp[member.id].level,
    xp: db.xp[member.id].xp,
    gained: amount
  };
}

async function checkRoles(member, currentLevel) {
  for (const [levelStr, roleId] of Object.entries(LEVEL_ROLES)) {
    const required = Number(levelStr);
    if (currentLevel >= required && !member.roles.cache.has(roleId)) {
      await wait(600);
      await member.roles.add(roleId).catch(() => {});
    }
  }
}

// ====================== VOICE XP ======================
function startVoiceXP(client) {
  if (voiceSystemRunning) return;
  voiceSystemRunning = true;
  console.log("🎤 System Voice XP uruchomiony.");

  const { addVoiceTime } = require("./profileSystem");

  setInterval(async () => {
    const cfg = loadConfig();
    const processed = new Set();

    for (const guild of client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.type !== ChannelType.GuildVoice) continue;

        for (const [memberId, member] of channel.members) {
          if (member.user.bot || member.voice.selfMute || member.voice.selfDeaf || processed.has(memberId)) continue;
          processed.add(memberId);

          try {
            await addXP(member, cfg.voiceXP);
            addVoiceTime(memberId, 60);
            await wait(250);
          } catch (e) {}
        }
      }
    }
  }, 60000);
}

// ====================== SETTERS ======================
function setMessageXP(val) { const cfg = loadConfig(); cfg.messageXP = Number(val); saveConfig(); }
function setVoiceXP(val) { const cfg = loadConfig(); cfg.voiceXP = Number(val); saveConfig(); }
function setLengthBonus(val) { const cfg = loadConfig(); cfg.lengthBonus = Number(val); saveConfig(); }
function setGlobalMultiplier(val) { const cfg = loadConfig(); cfg.globalMultiplier = Number(val); saveConfig(); }

// ====================== EXPORT ======================
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
