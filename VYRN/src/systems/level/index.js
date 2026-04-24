// =====================================================
// LEVEL SYSTEM - VYRN BLACK EDITION (FULL STABLE BUILD)
// =====================================================

const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

// ====================== EXTERNAL SYSTEMS ======================
const { getCurrentBoost } = require("../boost");
const { addCoins } = require("../economy");

// ====================== PATHS ======================
const DATA_DIR = process.env.DATA_DIR || "/data";

const DB_PATH = path.join(DATA_DIR, "levels.json");
const CONFIG_PATH = path.join(DATA_DIR, "levelConfig.json");

// ====================== CHANNEL CONFIG ======================
const LEVEL_UP_CHANNEL_ID = "1475999590716018719";

// ====================== DEFAULT CONFIG ======================
const DEFAULT_CONFIG = {
  messageXP: 10,
  voiceXP: 8,
  lengthBonus: 0.3,
  lengthThreshold: 30,
  globalMultiplier: 1,
  boostRole: "1476000398107217980"
};

// ====================== LEVEL ROLE REWARDS ======================
const LEVEL_ROLES = {
  5: "1476000458987278397",
  15: "1476000995501670534",
  30: "1476000459595448442",
  45: "1476000991206707221",
  60: "1476000991823532032",
  75: "1476000992351879229"
};

// ====================== MEMORY CACHE ======================
let dbCache = null;
let configCache = null;

// anti-spam / anti-exploit
const xpCooldown = new Map();
const levelUpCooldown = new Map();

// ====================== INIT DIRECTORY ======================
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
  if (level >= 75) return { name: "Legend", emoji: "<:LegeRank:1488756343190847538>" };
  if (level >= 60) return { name: "Ruby", emoji: "<:RubyRank:1488756400514404372>" };
  if (level >= 45) return { name: "Diamond", emoji: "<:DiaxRank:1488756482924089404>" };
  if (level >= 30) return { name: "Platinum", emoji: "<:PlatRank:1488756557863845958>" };
  if (level >= 15) return { name: "Gold", emoji: "<:GoldRank:1488756524854808686>" };
  if (level >= 5) return { name: "Bronze", emoji: "<:BronzeRank:1488756638285565962>" };
  return { name: "Iron", emoji: "<:Ironrank:1488756604277887039>" };
}

// =====================================================
// CONFIG SYSTEM
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
    configCache = JSON.parse(raw || "{}");

    return configCache;
  } catch (err) {
    console.error("[LEVEL CONFIG ERROR]", err);
    configCache = { ...DEFAULT_CONFIG };
    return configCache;
  }
}

// =====================================================
// DATABASE SYSTEM
// =====================================================

function loadDB() {
  try {
    if (dbCache) return dbCache;

    if (!fs.existsSync(DB_PATH)) {
      const init = { xp: {} };
      fs.writeFileSync(DB_PATH, JSON.stringify(init, null, 2));
      dbCache = init;
      return dbCache;
    }

    const raw = fs.readFileSync(DB_PATH, "utf8");
    dbCache = raw ? JSON.parse(raw) : { xp: {} };

    if (!dbCache.xp) dbCache.xp = {};

    return dbCache;
  } catch (err) {
    console.error("[LEVEL DB LOAD ERROR]", err);
    dbCache = { xp: {} };
    return dbCache;
  }
}

// ⚠️ FIX: NO CACHE RESET (previous bug cause)
function saveDB() {
  if (!dbCache) return;

  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
  } catch (err) {
    console.error("[LEVEL SAVE ERROR]", err);
  }
}

// =====================================================
// LEVEL UP SYSTEM
// =====================================================

async function sendLevelUpMessage(member, level, gainedXP) {
  try {
    const now = Date.now();

    if (now - (levelUpCooldown.get(member.id) || 0) < 20000) return;
    levelUpCooldown.set(member.id, now);

    const rank = getRank(level);
    const rewardCoins = 50;

    addCoins(member.id, rewardCoins);

    const embed = new EmbedBuilder()
      .setColor("#0b0b0f")
      .setTitle("LEVEL UP")
      .setDescription(
        `${rank.emoji} **${rank.name}**\n\n` +
        `Level: **${level}**\n` +
        `XP gained: \`${gainedXP}\`\n\n` +
        `Reward: \`+${rewardCoins}\` coins`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({
        text: "VYRN • Level System",
        iconURL: member.guild.iconURL()
      })
      .setTimestamp();

    const channel = member.guild.channels.cache.get(LEVEL_UP_CHANNEL_ID);

    if (channel) {
      channel.send({
        content: `${member}`,
        embeds: [embed]
      }).catch(() => {});
    }

  } catch (err) {
    console.error("[LEVEL UP ERROR]", err);
  }
}

// =====================================================
// CORE XP SYSTEM
// =====================================================

async function addXP(member, base, length = 0) {
  if (!member || member.user?.bot) return;

  const cfg = loadConfig();
  const db = loadDB();

  if (!db.xp[member.id]) {
    db.xp[member.id] = {
      xp: 0,
      level: 0
    };
  }

  const now = Date.now();

  // anti spam XP
  if (now - (xpCooldown.get(member.id) || 0) < 3000) return;
  xpCooldown.set(member.id, now);

  let gain = base;

  // message length bonus
  if (length >= cfg.lengthThreshold) {
    gain += Math.floor(length * cfg.lengthBonus);
  }

  // boost multiplier
  const boost = getCurrentBoost(member.id) || 1;

  gain = Math.floor(gain * cfg.globalMultiplier * boost);

  const user = db.xp[member.id];

  user.xp += gain;

  let leveledUp = false;

  while (user.xp >= neededXP(user.level)) {
    user.xp -= neededXP(user.level);
    user.level += 1;
    leveledUp = true;
  }

  saveDB();

  if (leveledUp) {
    await checkRoles(member, user.level);
    await sendLevelUpMessage(member, user.level, gain);

    addCoins(member.id, 50 + user.level * 5);
  }

  return user;
}

// =====================================================
// ROLE SYSTEM
// =====================================================

async function checkRoles(member, level) {
  try {
    for (const [req, roleId] of Object.entries(LEVEL_ROLES)) {
      if (level >= Number(req)) {
        if (!member.roles.cache.has(roleId)) {
          await member.roles.add(roleId).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error("[LEVEL ROLE ERROR]", err);
  }
}

// =====================================================
// MESSAGE XP HANDLER
// =====================================================

async function handleMessageXP(member, content) {
  const cfg = loadConfig();
  return addXP(member, cfg.messageXP, content?.length || 0);
}

// =====================================================
// INIT SYSTEM
// =====================================================

function init() {
  loadDB();
  loadConfig();
  console.log("📈 LEVEL SYSTEM • FULL BLACK EDITION LOADED");
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  init,
  loadDB,
  loadConfig,
  addXP,
  handleMessageXP,
  sendLevelUpMessage,
  neededXP,
  getRank
};
