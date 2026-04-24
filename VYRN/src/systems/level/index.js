// ====================== LEVEL SYSTEM ======================
// VYRN • Black Edition (FIXED STABLE VERSION)

const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

const { getCurrentBoost } = require("../boost");
const { addCoins } = require("../economy");

// ====================== PATHS ======================
const DATA_DIR = process.env.DATA_DIR || "/data";
const DB_PATH = path.join(DATA_DIR, "levels.json");
const CONFIG_PATH = path.join(DATA_DIR, "levelConfig.json");

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

// ====================== LEVEL ROLES ======================
const LEVEL_ROLES = {
  5: "1476000458987278397",
  15: "1476000995501670534",
  30: "1476000459595448442",
  45: "1476000991206707221",
  60: "1476000991823532032",
  75: "1476000992351879229"
};

// ====================== CACHE ======================
let dbCache = null;
let configCache = null;

const xpCooldown = new Map();
const lastLevelUp = new Map();

// ====================== INIT FOLDER ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ====================== HELPERS ======================
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

// ====================== CONFIG ======================
function loadConfig() {
  if (configCache) return configCache;

  if (!fs.existsSync(CONFIG_PATH)) {
    configCache = { ...DEFAULT_CONFIG };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configCache, null, 2));
    return configCache;
  }

  configCache = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  return configCache;
}

// ====================== DB ======================
function loadDB() {
  if (dbCache) return dbCache;

  if (!fs.existsSync(DB_PATH)) {
    dbCache = { xp: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
    return dbCache;
  }

  dbCache = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));

  if (!dbCache.xp) dbCache.xp = {};

  return dbCache;
}

function saveDB() {
  if (!dbCache) return;

  fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
}

// ====================== LEVEL UP ======================
async function sendLevelUpMessage(member, level, gainedXP) {
  const now = Date.now();

  if (now - (lastLevelUp.get(member.id) || 0) < 20000) return;
  lastLevelUp.set(member.id, now);

  const rank = getRank(level);
  const coinReward = 50;

  addCoins(member.id, coinReward);

  const embed = new EmbedBuilder()
    .setColor("#0b0b0f")
    .setTitle("LEVEL UP")
    .setDescription(
      `${rank.emoji} ${rank.name}\n` +
      `Level **${level}**\n\n` +
      `XP gained: \`${gainedXP}\`\n` +
      `Reward: \`+${coinReward}\` coins`
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({
      text: "VYRN • Level System",
      iconURL: member.guild.iconURL()
    })
    .setTimestamp();

  const channel = member.guild.channels.cache.get(LEVEL_UP_CHANNEL_ID);
  if (!channel) return;

  channel.send({
    content: `${member}`,
    embeds: [embed]
  }).catch(() => {});
}

// ====================== CORE XP ======================
async function addXP(member, base, length = 0) {
  if (!member || member.user?.bot) return;

  const cfg = loadConfig();
  const db = loadDB();

  if (!db.xp[member.id]) {
    db.xp[member.id] = { xp: 0, level: 0 };
  }

  const now = Date.now();
  const last = xpCooldown.get(member.id) || 0;

  if (now - last < 3000) return;
  xpCooldown.set(member.id, now);

  let gain = base;

  if (length >= cfg.lengthThreshold) {
    gain += Math.floor(length * cfg.lengthBonus);
  }

  const boost = Number(getCurrentBoost(member.id) || 1);

  gain = Math.floor(gain * cfg.globalMultiplier * boost);

  const user = db.xp[member.id];

  user.xp += gain;

  let leveled = false;

  while (user.xp >= neededXP(user.level)) {
    user.xp -= neededXP(user.level);
    user.level++;
    leveled = true;
  }

  saveDB();

  if (leveled) {
    await checkRoles(member, user.level);
    await sendLevelUpMessage(member, user.level, gain);
    addCoins(member.id, 50 + user.level * 5);
  }

  return user;
}

// ====================== ROLES ======================
async function checkRoles(member, level) {
  for (const [req, role] of Object.entries(LEVEL_ROLES)) {
    if (level >= Number(req) && !member.roles.cache.has(role)) {
      await member.roles.add(role).catch(() => {});
    }
  }
}

// ====================== MESSAGE XP ======================
async function handleMessageXP(member, content) {
  const cfg = loadConfig();
  return addXP(member, cfg.messageXP, content?.length || 0);
}

// ====================== INIT ======================
function init() {
  loadDB();
  loadConfig();
  console.log("📈 LEVEL SYSTEM • BLACK FIXED LOADED");
}

// ====================== EXPORT ======================
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
