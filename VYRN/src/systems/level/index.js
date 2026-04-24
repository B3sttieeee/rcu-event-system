// =====================================================
// LEVEL SYSTEM - VYRN STABLE CORE FIXED
// =====================================================

const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

// SAFE IMPORTS (NIE CRASHUJĄ BOTA)
let boostSystem = null;
let economy = null;

try { boostSystem = require("../boost"); } catch {}
try { economy = require("../economy"); } catch {}

const DATA_DIR = process.env.DATA_DIR || "/data";
const DB_PATH = path.join(DATA_DIR, "levels.json");
const CONFIG_PATH = path.join(DATA_DIR, "levelConfig.json");

const LEVEL_UP_CHANNEL_ID = "1475999590716018719";

const DEFAULT_CONFIG = {
  messageXP: 10,
  voiceXP: 8,
  lengthBonus: 0.3,
  lengthThreshold: 30,
  globalMultiplier: 1
};

let dbCache = null;
let configCache = null;

const xpCooldown = new Map();
const lastLevelUp = new Map();

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

// ====================== DB ======================
function loadDB() {
  if (dbCache) return dbCache;

  if (!fs.existsSync(DB_PATH)) {
    dbCache = { xp: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
    return dbCache;
  }

  dbCache = JSON.parse(fs.readFileSync(DB_PATH, "utf8") || '{"xp":{}}');
  if (!dbCache.xp) dbCache.xp = {};

  return dbCache;
}

function saveDB() {
  if (!dbCache) return;
  fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
}

// ====================== CONFIG ======================
function loadConfig() {
  if (configCache) return configCache;

  if (!fs.existsSync(CONFIG_PATH)) {
    configCache = DEFAULT_CONFIG;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configCache, null, 2));
    return configCache;
  }

  configCache = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8") || "{}");
  return configCache;
}

// ====================== LEVEL UP ======================
async function sendLevelUp(member, level, gainedXP) {
  const now = Date.now();

  if (now - (lastLevelUp.get(member.id) || 0) < 15000) return;
  lastLevelUp.set(member.id, now);

  const rank = getRank(level);

  if (economy) {
    economy.addCoins(member.id, 50 + level * 5);
  }

  const embed = new EmbedBuilder()
    .setColor("#0b0b0f")
    .setTitle("LEVEL UP")
    .setDescription(
      `${rank.emoji} **${rank.name}**\n` +
      `Level: **${level}**\n` +
      `XP: \`${gainedXP}\``
    )
    .setTimestamp();

  const ch = member.guild.channels.cache.get(LEVEL_UP_CHANNEL_ID);
  if (ch) ch.send({ content: `${member}`, embeds: [embed] }).catch(() => {});
}

// ====================== CORE XP ======================
async function addXP(member, base, length = 0) {
  if (!member || !member.id || member.user?.bot) return;

  const cfg = loadConfig();
  const db = loadDB();

  if (!db.xp[member.id]) {
    db.xp[member.id] = { xp: 0, level: 0 };
  }

  const now = Date.now();
  if (now - (xpCooldown.get(member.id) || 0) < 3000) return;

  xpCooldown.set(member.id, now);

  let gain = base;

  if (length >= cfg.lengthThreshold) {
    gain += Math.floor(length * cfg.lengthBonus);
  }

  const boost = boostSystem?.getCurrentBoost?.(member.id) || 1;

  gain = Math.floor(gain * cfg.globalMultiplier * boost);

  if (!Number.isFinite(gain)) gain = base;

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
    await sendLevelUp(member, user.level, gain);
  }

  return user;
}

function handleMessageXP(member, content) {
  const cfg = loadConfig();
  return addXP(member, cfg.messageXP, content?.length || 0);
}

function init() {
  loadDB();
  loadConfig();
  console.log("📈 Level System loaded");
}

module.exports = {
  init,
  addXP,
  handleMessageXP,
  neededXP,
  getRank,
  loadDB
};
