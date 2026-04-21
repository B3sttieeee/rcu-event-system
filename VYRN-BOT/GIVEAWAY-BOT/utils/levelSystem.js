const fs = require("fs");
const path = require("path");
const { ChannelType } = require("discord.js");

const { getCurrentBoost } = require("./boostSystem");
const { addVoiceTime, addMessage } = require("./profileSystem");

const DATA_DIR = process.env.DATA_DIR || "/data";   // <-- ważne dla Railway
const DB_PATH = path.join(DATA_DIR, "levels.json");
const CONFIG_PATH = path.join(DATA_DIR, "levelConfig.json");
const DB_TMP_PATH = `${DB_PATH}.tmp`;

const DEFAULT_CONFIG = {
  messageXP: 5,
  voiceXP: 5,
  lengthBonus: 0.3,
  lengthThreshold: 30,
  globalMultiplier: 1,
  boostRole: "1476000398107217980"
};

// =====================================================
// INIT
// =====================================================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`[LEVEL] Data directory ready: ${DATA_DIR}`);
}

// =====================================================
// CACHE & WRITE QUEUE
// =====================================================
let dbCache = null;
let configCache = null;
let writeQueue = Promise.resolve();
let voiceLoopStarted = false;

const xpCooldown = new Map(); // cooldown dla wiadomości

// =====================================================
// HELPERS
// =====================================================
const normalizeUserXP = (user = {}) => ({
  xp: Number.isFinite(Number(user.xp)) ? Number(user.xp) : 0,
  level: Number.isFinite(Number(user.level)) ? Number(user.level) : 0
});

const logError = (scope, error) => {
  console.error(`[LEVEL] ${scope}`);
  if (error?.stack) console.error(error.stack);
  else console.error(error);
};

const triggerDailyCheck = async (member) => {
  try {
    const { checkDailyDM } = require("./dailySystem");
    if (typeof checkDailyDM === "function") {
      await checkDailyDM(member);
    }
  } catch (e) {}
};

const isEligibleVoiceMember = (member) => {
  if (!member || member.user?.bot) return false;
  if (!member.voice?.channelId) return false;
  if (member.voice.selfMute || member.voice.selfDeaf) return false;
  if (member.voice.serverMute || member.voice.serverDeaf) return false;
  return true;
};

// =====================================================
// DATABASE
// =====================================================
function loadDB() {
  if (dbCache) return dbCache;

  try {
    if (!fs.existsSync(DB_PATH)) {
      dbCache = { xp: {} };
      fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
      console.log("[LEVEL] Utworzono nowy levels.json");
      return dbCache;
    }

    const raw = fs.readFileSync(DB_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : { xp: {} };

    dbCache = { xp: {} };
    for (const [userId, userData] of Object.entries(parsed.xp || {})) {
      dbCache.xp[userId] = normalizeUserXP(userData);
    }

    console.log(`[LEVEL] Załadowano poziomy dla ${Object.keys(dbCache.xp).length} użytkowników`);
    return dbCache;
  } catch (error) {
    logError("DB LOAD ERROR", error);
    dbCache = { xp: {} };
    return dbCache;
  }
}

function saveDB() {
  if (!dbCache) return writeQueue;

  const snapshot = JSON.stringify(dbCache, null, 2);
  writeQueue = writeQueue
    .catch(() => null)
    .then(async () => {
      try {
        await fs.promises.writeFile(DB_TMP_PATH, snapshot, "utf8");
        await fs.promises.rename(DB_TMP_PATH, DB_PATH);
      } catch (error) {
        logError("DB SAVE ERROR", error);
      }
    });

  return writeQueue;
}

// =====================================================
// CONFIG
// =====================================================
function loadConfig() {
  if (configCache) return configCache;

  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      configCache = { ...DEFAULT_CONFIG };
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(configCache, null, 2));
      return configCache;
    }

    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : {};
    configCache = { ...DEFAULT_CONFIG, ...parsed };
    return configCache;
  } catch (error) {
    logError("CONFIG LOAD ERROR", error);
    configCache = { ...DEFAULT_CONFIG };
    return configCache;
  }
}

function saveConfig() {
  if (!configCache) return;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(configCache, null, 2));
}

// =====================================================
// XP CALCULATIONS
// =====================================================
function neededXP(level) {
  const currentLevel = Math.max(0, Number(level) || 0);
  return Math.floor(100 * Math.pow(currentLevel + 1, 1.5));
}

function getMultiplier(member) {
  const cfg = loadConfig();
  let multiplier = Number(cfg.globalMultiplier) || 1;

  multiplier *= getCurrentBoost(member.id) || 1;

  if (cfg.boostRole && member.roles?.cache?.has(cfg.boostRole)) {
    multiplier *= 1.75;
  }

  return multiplier;
}

// =====================================================
// CORE XP FUNCTION
// =====================================================
async function addXP(member, base = 0, length = 0, options = {}) {
  const { useCooldown = true } = options;

  if (!member || member.user?.bot) return null;
  const safeBase = Number(base);
  if (!Number.isFinite(safeBase) || safeBase <= 0) return null;

  if (useCooldown) {
    const now = Date.now();
    if (xpCooldown.has(member.id) && now - xpCooldown.get(member.id) < 2500) {
      return null;
    }
    xpCooldown.set(member.id, now);
  }

  const db = loadDB();
  const cfg = loadConfig();

  if (!db.xp[member.id]) db.xp[member.id] = normalizeUserXP();

  let gain = safeBase;
  if ((length || 0) >= cfg.lengthThreshold) {
    gain *= 1 + cfg.lengthBonus;
  }

  gain = Math.floor(gain * getMultiplier(member));
  if (gain <= 0) return null;

  const user = db.xp[member.id];
  user.xp += gain;

  let leveled = false;
  while (user.xp >= neededXP(user.level)) {
    user.xp -= neededXP(user.level);
    user.level += 1;
    leveled = true;
  }

  if (leveled) {
    await checkRoles(member, user.level);
  }

  saveDB();

  return {
    leveledUp: leveled,
    level: user.level,
    xp: user.xp,
    gained: gain
  };
}

// =====================================================
// ROLE REWARDS
// =====================================================
async function checkRoles(member, level) {
  const roles = {
    5:  "1476000458987278397",
    15: "1476000995501670534",
    30: "1476000459595448442",
    45: "1476000991206707221",
    60: "1476000991823532032",
    75: "1476000992351879229"
  };

  for (const [reqLevel, roleId] of Object.entries(roles)) {
    if (level >= Number(reqLevel) && !member.roles.cache.has(roleId)) {
      await member.roles.add(roleId).catch(err => 
        console.error(`[LEVEL] Failed to add role to ${member.user.tag}:`, err.message)
      );
    }
  }
}

// =====================================================
// MESSAGE XP
// =====================================================
async function handleMessageXP(member, content) {
  if (!member || member.user?.bot) return null;

  addMessage(member.id);

  const cfg = loadConfig();
  const result = await addXP(member, cfg.messageXP, content?.length || 0, { useCooldown: true });

  await triggerDailyCheck(member);
  return result;
}

// =====================================================
// VOICE XP
// =====================================================
function startVoiceXP(client) {
  if (voiceLoopStarted) return;
  voiceLoopStarted = true;
  console.log("🎤 Voice XP + Profile Voice Tracker started");

  setInterval(async () => {
    const cfg = loadConfig();
    const processed = new Set();

    for (const guild of client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice) continue;

        for (const member of channel.members.values()) {
          if (!isEligibleVoiceMember(member) || processed.has(member.id)) continue;

          processed.add(member.id);

          addVoiceTime(member.id, 60);
          await addXP(member, cfg.voiceXP, 0, { useCooldown: false }).catch(() => null);
          await triggerDailyCheck(member);
        }
      }
    }
  }, 60_000);
}

// =====================================================
// CONFIG SETTERS
// =====================================================
function setMessageXP(value) {
  const cfg = loadConfig();
  cfg.messageXP = Number(value) || DEFAULT_CONFIG.messageXP;
  saveConfig();
  console.log(`[LEVEL] Message XP set to ${cfg.messageXP}`);
}

function setVoiceXP(value) {
  const cfg = loadConfig();
  cfg.voiceXP = Number(value) || DEFAULT_CONFIG.voiceXP;
  saveConfig();
  console.log(`[LEVEL] Voice XP set to ${cfg.voiceXP}`);
}

// =====================================================
// EXPORT
// =====================================================
module.exports = {
  addXP,
  startVoiceXP,
  handleMessageXP,
  loadDB,
  loadConfig,
  neededXP,
  getMultiplier,
  checkRoles,
  setMessageXP,
  setVoiceXP
};
