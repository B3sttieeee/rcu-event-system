const fs = require("fs");
const path = require("path");
const { ChannelType } = require("discord.js");
const { getCurrentBoost } = require("./boostSystem");

const DATA_DIR = "/data";
const DB_PATH = path.join(DATA_DIR, "levels.json");
const CONFIG_PATH = path.join(DATA_DIR, "levelConfig.json");

// ====================== INIT ======================
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ====================== CACHE ======================
let dbCache = null;
let configCache = null;

// write queue (IMPORTANT FIX)
let writeQueue = Promise.resolve();

// cooldown
const xpCooldown = new Map();

// voice tracker (FIX)
const voiceActive = new Set();

// ====================== IO ======================
function loadDB() {
  if (dbCache) return dbCache;

  try {
    if (!fs.existsSync(DB_PATH)) {
      dbCache = { xp: {} };
      fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
      return dbCache;
    }

    dbCache = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    dbCache.xp ||= {};
    return dbCache;
  } catch {
    dbCache = { xp: {} };
    return dbCache;
  }
}

function saveDB() {
  if (!dbCache) return;

  writeQueue = writeQueue.then(() =>
    new Promise((resolve) => {
      fs.writeFile(DB_PATH, JSON.stringify(dbCache, null, 2), () => resolve());
    })
  );
}

// ====================== CONFIG ======================
function loadConfig() {
  if (configCache) return configCache;

  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      configCache = {
        messageXP: 5,
        voiceXP: 5,
        lengthBonus: 0.3,
        lengthThreshold: 30,
        globalMultiplier: 1,
        boostRole: "1476000398107217980",
      };

      fs.writeFileSync(CONFIG_PATH, JSON.stringify(configCache, null, 2));
      return configCache;
    }

    configCache = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    return configCache;
  } catch {
    return (configCache = {
      messageXP: 5,
      voiceXP: 5,
      lengthBonus: 0.3,
      lengthThreshold: 30,
      globalMultiplier: 1,
      boostRole: "1476000398107217980",
    });
  }
}

// ====================== CORE ======================
function neededXP(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

function getMultiplier(member) {
  const cfg = loadConfig();
  let m = cfg.globalMultiplier;

  m *= getCurrentBoost(member.id) || 1;

  if (member.roles.cache.has(cfg.boostRole)) m *= 1.75;

  return m;
}

// ====================== XP ENGINE ======================
async function addXP(member, base = 0, length = 0) {
  if (!member || member.user.bot || base <= 0) return;

  const now = Date.now();
  if (xpCooldown.has(member.id) && now - xpCooldown.get(member.id) < 2500) return;
  xpCooldown.set(member.id, now);

  const db = loadDB();
  const cfg = loadConfig();

  db.xp[member.id] ||= { xp: 0, level: 0 };

  let gain = base;

  if (length >= cfg.lengthThreshold) {
    gain *= 1 + cfg.lengthBonus;
  }

  gain = Math.floor(gain * getMultiplier(member));
  if (gain <= 0) return;

  const user = db.xp[member.id];
  user.xp += gain;

  let leveled = false;

  while (user.xp >= neededXP(user.level)) {
    user.xp -= neededXP(user.level);
    user.level++;
    leveled = true;
  }

  if (leveled) await checkRoles(member, user.level);

  saveDB();

  return { leveledUp: leveled, level: user.level, xp: user.xp, gained: gain };
}

// ====================== ROLES ======================
async function checkRoles(member, level) {
  const roles = {
    5: "1476000458987278397",
    15: "1476000995501670534",
    30: "1476000459595448442",
    45: "1476000991206707221",
    60: "1476000991823532032",
    75: "1476000992351879229",
  };

  for (const [req, roleId] of Object.entries(roles)) {
    if (level >= req && !member.roles.cache.has(roleId)) {
      await member.roles.add(roleId).catch(() => {});
    }
  }
}

// ====================== MESSAGE XP ======================
function handleMessageXP(member, content) {
  const cfg = loadConfig();
  return addXP(member, cfg.messageXP, content?.length || 0);
}

// ====================== VOICE XP (FIXED) ======================
function startVoiceXP(client) {
  if (voiceActive.size) return;

  console.log("🎤 Voice XP started");

  setInterval(async () => {
    const cfg = loadConfig();

    for (const guild of client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.type !== ChannelType.GuildVoice) continue;

        for (const member of channel.members.values()) {
          if (member.user.bot) continue;

          const id = member.id;

          // FIX: real tracking per user
          if (voiceActive.has(id)) continue;
          voiceActive.add(id);

          if (
            member.voice.selfMute ||
            member.voice.selfDeaf
          ) continue;

          await addXP(member, cfg.voiceXP).catch(() => {});
        }
      }
    }

    voiceActive.clear();
  }, 60_000);
}

// ====================== CONFIG SETTERS ======================
function setMessageXP(v) {
  const cfg = loadConfig();
  cfg.messageXP = Number(v) || 5;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

function setVoiceXP(v) {
  const cfg = loadConfig();
  cfg.voiceXP = Number(v) || 5;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

// ====================== EXPORT ======================
module.exports = {
  addXP,
  startVoiceXP,
  handleMessageXP,
  loadDB,
  loadConfig,
  neededXP,
  getMultiplier,
  checkRoles,
};
