const fs = require("fs");
const { ChannelType } = require("discord.js");

// ===== PATH =====
const DATA_DIR = "/data";
const DB_PATH = `${DATA_DIR}/levels.json`;
const CONFIG_PATH = `${DATA_DIR}/levelConfig.json`;

// ===== INIT =====
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log("📁 Folder /data utworzony");
}

// ===== CACHE =====
let dbCache = null;
let configCache = null;
let voiceStarted = false;

// ===== COOLDOWNS =====
const xpCooldown = new Map();

// ===== HELPERS =====
const wait = ms => new Promise(res => setTimeout(res, ms));

// ===== LOAD DB =====
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    console.log("[LEVEL] levels.json nie istnieje → tworzę nowy");
    const initial = { xp: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    dbCache = initial;
    return dbCache;
  }

  if (!dbCache) {
    try {
      dbCache = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
      const count = Object.keys(dbCache.xp || {}).length;
      console.log(`[LEVEL] Załadowano levels.json → ${count} użytkowników`);
    } catch (err) {
      console.error("[LEVEL] Błąd odczytu levels.json → tworzę nowy", err.message);
      dbCache = { xp: {} };
      fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
    }
  }
  return dbCache;
}

function saveDB(data) {
  dbCache = data;
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[LEVEL] Błąd zapisu levels.json:", err.message);
  }
}

// ===== CONFIG =====
function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    const defaultCfg = {
      messageXP: 3,
      voiceXP: 5,
      lengthBonus: 0.3,
      lengthThreshold: 30,
      globalMultiplier: 1
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultCfg, null, 2));
    configCache = defaultCfg;
    return configCache;
  }

  if (!configCache) {
    configCache = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  }
  return configCache;
}

function saveConfig(cfg) {
  configCache = cfg;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

// ===== ROLE SYSTEM =====
const LEVEL_ROLES = {
  5: "1476000458987278397",
  15: "1476000995501670534",
  30: "1476000459595448442",
  45: "1476000991206707221",
  60: "1476000991823532032",
  75: "1476000992351879229"
};

// ===== BOOST =====
const BOOST_ROLE = "1476000398107217980";
const BOOST_MULTIPLIER = 1.75;

// ===== XP FORMULA =====
function neededXP(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// ===== MULTIPLIER =====
function getMultiplier(member) {
  const cfg = loadConfig();
  let multi = cfg.globalMultiplier || 1;
  if (member.roles.cache.has(BOOST_ROLE)) {
    multi *= BOOST_MULTIPLIER;
  }
  return multi;
}

// ===== ADD XP =====
async function addXP(member, baseAmount, messageLength = 0) {
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

  let amount = baseAmount || 0;
  if (messageLength >= cfg.lengthThreshold) {
    amount = Math.floor(amount * (1 + cfg.lengthBonus));
  }
  amount = Math.floor(amount * getMultiplier(member));

  if (amount <= 0) {
    return { leveledUp: false, level: db.xp[member.id].level, xp: db.xp[member.id].xp, gained: 0 };
  }

  db.xp[member.id].xp += amount;
  let leveledUp = false;

  while (db.xp[member.id].xp >= neededXP(db.xp[member.id].level)) {
    db.xp[member.id].xp -= neededXP(db.xp[member.id].level);
    db.xp[member.id].level++;
    leveledUp = true;
  }

  if (leveledUp) {
    await checkRoles(member, db.xp[member.id].level);
  }

  saveDB(db);

  return {
    leveledUp,
    level: db.xp[member.id].level,
    xp: db.xp[member.id].xp,
    gained: amount
  };
}

// ===== ROLE CHECK =====
async function checkRoles(member, level) {
  for (const lvl of Object.keys(LEVEL_ROLES).map(Number)) {
    const roleId = LEVEL_ROLES[lvl];
    if (level >= lvl && !member.roles.cache.has(roleId)) {
      await wait(500);
      await member.roles.add(roleId).catch(() => {});
    }
  }
}

// ===== VOICE XP =====
function startVoiceXP(client) {
  if (voiceStarted) {
    console.log("⚠️ Voice already running");
    return;
  }
  voiceStarted = true;
  const { addVoiceTime } = require("./profileSystem");

  setInterval(async () => {
    const cfg = loadConfig();
    const counted = new Set();

    for (const guild of client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.type !== ChannelType.GuildVoice) continue;
        for (const member of channel.members.values()) {
          if (member.user.bot) continue;
          if (member.voice.selfMute || member.voice.selfDeaf) continue;
          if (counted.has(member.id)) continue;

          counted.add(member.id);
          await addXP(member, cfg.voiceXP);
          addVoiceTime(member.id, 60);
          await wait(300);
        }
      }
    }
  }, 60000);
}

// ===== CONFIG SETTERS =====
function setMessageXP(val) {
  const cfg = loadConfig();
  cfg.messageXP = val;
  saveConfig(cfg);
}

function setVoiceXP(val) {
  const cfg = loadConfig();
  cfg.voiceXP = val;
  saveConfig(cfg);
}

function setLengthBonus(val) {
  const cfg = loadConfig();
  cfg.lengthBonus = val;
  saveConfig(cfg);
}

function setGlobalMultiplier(val) {
  const cfg = loadConfig();
  cfg.globalMultiplier = val;
  saveConfig(cfg);
}

// ===== EXPORT =====
module.exports = {
  addXP,
  startVoiceXP,
  loadConfig,
  loadDB,           // ← dodane - teraz /profile będzie działać
  saveDB,
  setMessageXP,
  setVoiceXP,
  setLengthBonus,
  setGlobalMultiplier,
};
