// =====================================================
// LEVEL SYSTEM - PROFESSIONAL VERSION (ANTI SPAM + COINS)
// =====================================================
const fs = require("fs");
const path = require("path");
const { ChannelType, EmbedBuilder } = require("discord.js");

const { getCurrentBoost } = require("../boost");
const { addCoins } = require("../economy");
const { addVoiceTime } = require("../profile");

// =====================================================
// PATHS
// =====================================================
const DATA_DIR = process.env.DATA_DIR || "./data";
const DB_PATH = path.join(DATA_DIR, "levels.json");
const CONFIG_PATH = path.join(DATA_DIR, "levelConfig.json");

// =====================================================
// CONFIG
// =====================================================
const LEVEL_UP_CHANNEL_ID = "1475999590716018719";

const DEFAULT_CONFIG = {
  messageXP: 10,
  voiceXP: 8,

  messageCoins: 10,
  voiceCoins: 8,

  lengthBonus: 0.25,
  lengthThreshold: 30,

  globalMultiplier: 1,
  boostRole: "1476000398107217980",

  messageCooldown: 15000,
  levelUpCooldown: 30000
};

// =====================================================
// ROLES
// =====================================================
const LEVEL_ROLES = {
  5: "1476000458987278397",
  15: "1476000995501670534",
  30: "1476000459595448442",
  45: "1476000991206707221",
  60: "1476000991823532032",
  75: "1476000992351879229"
};

// =====================================================
// CACHE
// =====================================================
let dbCache = null;
let configCache = null;
let voiceLoopStarted = false;
let writeQueue = Promise.resolve();

const xpCooldown = new Map();
const levelUpCooldown = new Map();

// =====================================================
// INIT FOLDER
// =====================================================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// =====================================================
// HELPERS
// =====================================================
function neededXP(level) {
  return Math.floor(100 * Math.pow(level + 1, 1.5));
}

function getRank(level) {
  if (level >= 75) return { name: "Legend", emoji: "🏆" };
  if (level >= 60) return { name: "Ruby", emoji: "💎" };
  if (level >= 45) return { name: "Diamond", emoji: "🔷" };
  if (level >= 30) return { name: "Platinum", emoji: "🔹" };
  if (level >= 15) return { name: "Gold", emoji: "🥇" };
  if (level >= 5) return { name: "Bronze", emoji: "🥉" };
  return { name: "Iron", emoji: "⚙️" };
}

function loadConfig() {
  if (configCache) return configCache;

  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      configCache = { ...DEFAULT_CONFIG };
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(configCache, null, 2));
      return configCache;
    }

    configCache = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    return { ...DEFAULT_CONFIG, ...configCache };
  } catch {
    configCache = { ...DEFAULT_CONFIG };
    return configCache;
  }
}

function getMultiplier(member) {
  const cfg = loadConfig();

  let multi = cfg.globalMultiplier;

  if (member.roles.cache.has(cfg.boostRole)) {
    multi += 0.5;
  }

  const boost = getCurrentBoost(member.id);
  if (boost?.multiplier) {
    multi *= boost.multiplier;
  }

  return multi;
}

// =====================================================
// DATABASE
// =====================================================
function loadDB() {
  if (dbCache) return dbCache;

  try {
    if (!fs.existsSync(DB_PATH)) {
      dbCache = { xp: {} };
      fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
      return dbCache;
    }

    dbCache = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    if (!dbCache.xp) dbCache.xp = {};

    return dbCache;
  } catch {
    dbCache = { xp: {} };
    return dbCache;
  }
}

function saveDB() {
  if (!dbCache) return;

  const snapshot = JSON.stringify(dbCache, null, 2);

  writeQueue = writeQueue
    .catch(() => null)
    .then(async () => {
      await fs.promises.writeFile(`${DB_PATH}.tmp`, snapshot);
      await fs.promises.rename(`${DB_PATH}.tmp`, DB_PATH);
    });
}

// =====================================================
// CORE XP
// =====================================================
async function addXP(member, baseXP, messageLength = 0, allowCoins = true) {
  if (!member || member.user?.bot) return null;

  const db = loadDB();
  const cfg = loadConfig();

  if (!db.xp[member.id]) {
    db.xp[member.id] = {
      xp: 0,
      level: 0
    };
  }

  const user = db.xp[member.id];

  let xp = baseXP;

  if (messageLength >= cfg.lengthThreshold) {
    xp += Math.floor(messageLength * cfg.lengthBonus);
  }

  xp = Math.floor(xp * getMultiplier(member));

  user.xp += xp;

  let leveledUp = false;

  while (user.xp >= neededXP(user.level)) {
    user.xp -= neededXP(user.level);
    user.level++;
    leveledUp = true;
  }

  saveDB();

  // coins
  if (allowCoins && messageLength > 0) {
    addCoins(member.id, cfg.messageCoins);
  }

  if (leveledUp) {
    await checkRoles(member, user.level);
    await sendLevelUpMessage(member, user.level);
    addCoins(member.id, 50 + user.level * 5);
  }

  return {
    level: user.level,
    xp: user.xp,
    leveledUp
  };
}

// =====================================================
// MESSAGE XP
// =====================================================
async function handleMessageXP(member, content = "") {
  if (!member || member.user?.bot) return null;

  const cfg = loadConfig();
  const now = Date.now();

  const last = xpCooldown.get(member.id) || 0;

  if (now - last < cfg.messageCooldown) {
    return null;
  }

  xpCooldown.set(member.id, now);

  return await addXP(
    member,
    cfg.messageXP,
    content.length,
    true
  );
}

// =====================================================
// LEVEL UP MESSAGE (ANTI SPAM)
// =====================================================
async function sendLevelUpMessage(member, level) {
  const cfg = loadConfig();
  const now = Date.now();

  const last = levelUpCooldown.get(member.id) || 0;

  if (now - last < cfg.levelUpCooldown) return;

  levelUpCooldown.set(member.id, now);

  const channel =
    member.guild.channels.cache.get(LEVEL_UP_CHANNEL_ID) ||
    member.guild.systemChannel;

  if (!channel) return;

  const rank = getRank(level);

  const embed = new EmbedBuilder()
    .setTitle("🎉 Level Up!")
    .setDescription(
      `${member} osiągnął **Level ${level}**!\nNowa ranga: ${rank.emoji} **${rank.name}**`
    )
    .setColor("Gold")
    .setTimestamp();

  channel.send({ embeds: [embed] }).catch(() => {});
}

// =====================================================
// ROLES
// =====================================================
async function checkRoles(member, level) {
  const roleEntries = Object.entries(LEVEL_ROLES);

  for (const [needLevel, roleId] of roleEntries) {
    if (level >= Number(needLevel)) {
      if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId).catch(() => {});
      }
    }
  }
}

// =====================================================
// VOICE LOOP
// =====================================================
function startVoiceXP(client) {
  if (voiceLoopStarted) return;

  voiceLoopStarted = true;

  console.log("🎤 Voice XP loop started");

  setInterval(async () => {
    const cfg = loadConfig();

    for (const guild of client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        if (
          channel.type !== ChannelType.GuildVoice &&
          channel.type !== ChannelType.GuildStageVoice
        ) continue;

        const humans = channel.members.filter(m => !m.user.bot);

        if (humans.size < 2) continue; // anti afk solo farm

        for (const member of humans.values()) {
          if (member.voice.selfMute) continue;
          if (member.voice.selfDeaf) continue;

          addVoiceTime(member.id, 60);

          await addXP(member, cfg.voiceXP, 0, false);
          addCoins(member.id, cfg.voiceCoins);
        }
      }
    }
  }, 60000);
}

// =====================================================
// INIT
// =====================================================
function init(client) {
  loadDB();
  loadConfig();
  startVoiceXP(client);

  console.log("📈 Level System loaded");
}

// =====================================================
// EXPORTS
// =====================================================
module.exports = {
  init,
  addXP,
  handleMessageXP,
  startVoiceXP,
  loadDB,
  loadConfig,
  neededXP,
  getMultiplier,
  checkRoles,
  getRank,
  sendLevelUpMessage
};
