const fs = require("fs");
const path = require("path");
const { ChannelType } = require("discord.js");

// ====================== PATHS ======================
const DATA_DIR = path.join(__dirname, "..", "data");
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

// ====================== COOLDOWNS ======================
const xpCooldown = new Map(); // memberId => timestamp

// ====================== HELPERS ======================
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = { xp: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
    dbCache = initialData;
    return dbCache;
  }

  if (!dbCache) {
    dbCache = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  }
  return dbCache;
}

function saveDB() {
  if (dbCache) {
    fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
  }
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    const defaultConfig = {
      messageXP: 3,
      voiceXP: 5,
      lengthBonus: 0.3,
      lengthThreshold: 30,
      globalMultiplier: 1
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

// ====================== XP FORMULA ======================
function neededXP(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// ====================== MULTIPLIER ======================
function getMultiplier(member) {
  const cfg = loadConfig();
  let multi = cfg.globalMultiplier || 1;

  if (member.roles.cache.has(BOOST_ROLE)) {
    multi *= BOOST_MULTIPLIER;
  }

  return multi;
}

// ====================== ADD XP ======================
async function addXP(member, baseAmount, messageLength = 0) {
  if (!member || member.user.bot) return { leveledUp: false, gained: 0 };

  const now = Date.now();

  // Anty-spam: 3 sekundy cooldown
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

  // Bonus za długą wiadomość
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

  if (leveledUp) {
    await checkRoles(member, db.xp[member.id].level);
  }

  saveDB();

  return {
    leveledUp,
    level: db.xp[member.id].level,
    xp: db.xp[member.id].xp,
    gained: amount,
    oldLevel: currentLevel
  };
}

// ====================== ROLE CHECK ======================
async function checkRoles(member, currentLevel) {
  for (const [levelStr, roleId] of Object.entries(LEVEL_ROLES)) {
    const requiredLevel = Number(levelStr);

    if (currentLevel >= requiredLevel && !member.roles.cache.has(roleId)) {
      await wait(600); // bezpieczny delay przeciw rate limit
      await member.roles.add(roleId).catch(err => {
        console.error(`❌ Nie udało się dodać roli level ${requiredLevel} dla ${member.user.tag}:`, err.message);
      });
    }
  }
}

// ====================== VOICE XP SYSTEM ======================
function startVoiceXP(client) {
  if (voiceSystemRunning) {
    console.log("⚠️ System Voice XP jest już uruchomiony.");
    return;
  }

  voiceSystemRunning = true;
  console.log("🎤 System Voice XP uruchomiony.");

  // Importujemy tylko raz
  const { addVoiceTime } = require("./profileSystem");

  setInterval(async () => {
    const cfg = loadConfig();
    const processed = new Set();

    for (const guild of client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.type !== ChannelType.GuildVoice) continue;

        for (const [memberId, member] of channel.members) {
          if (member.user.bot) continue;
          if (member.voice.selfMute || member.voice.selfDeaf) continue;
          if (processed.has(memberId)) continue;

          processed.add(memberId);

          try {
            await addXP(member, cfg.voiceXP);
            addVoiceTime(memberId, 60);   // +1 minuta czasu głosowego

            await wait(250); // delikatny delay, nie blokujemy całego interwału
          } catch (err) {
            console.error(`❌ Błąd przy przyznawaniu Voice XP dla ${member.user.tag}:`, err);
          }
        }
      }
    }
  }, 60000); // co minutę
}

// ====================== CONFIG SETTERS ======================
function setMessageXP(val) {
  const cfg = loadConfig();
  cfg.messageXP = Number(val);
  saveConfig();
}

function setVoiceXP(val) {
  const cfg = loadConfig();
  cfg.voiceXP = Number(val);
  saveConfig();
}

function setLengthBonus(val) {
  const cfg = loadConfig();
  cfg.lengthBonus = Number(val);
  saveConfig();
}

function setGlobalMultiplier(val) {
  const cfg = loadConfig();
  cfg.globalMultiplier = Number(val);
  saveConfig();
}

// ====================== EXPORT ======================
module.exports = {
  addXP,
  startVoiceXP,
  loadConfig,
  setMessageXP,
  setVoiceXP,
  setLengthBonus,
  setGlobalMultiplier,
};
