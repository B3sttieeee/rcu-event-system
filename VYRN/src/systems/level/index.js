// ====================== LEVEL SYSTEM ======================
// VYRN • BLACK FIXED FINAL (STABLE)

const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

const boostSystem = require("../boost");
const economy = require("../economy");

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
  globalMultiplier: 1
};

// ====================== CACHE ======================
let dbCache = null;
let configCache = null;

const xpCooldown = new Map();
const lastLevelUp = new Map();

// ====================== INIT ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ====================== CONFIG ======================
function loadConfig() {
  if (configCache) return configCache;

  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
      configCache = DEFAULT_CONFIG;
      return configCache;
    }

    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    configCache = raw ? JSON.parse(raw) : DEFAULT_CONFIG;

    return configCache;
  } catch (err) {
    console.error("[LEVEL] CONFIG ERROR:", err.message);
    configCache = DEFAULT_CONFIG;
    return configCache;
  }
}

// ====================== HELPERS ======================
function neededXP(level) {
  return Math.floor(100 * Math.pow(level + 1, 1.5));
}

function getRank(level) {
  if (level >= 75) return { name: "Legend", emoji: "🏆" };
  if (level >= 60) return { name: "Ruby", emoji: "💎" };
  if (level >= 45) return { name: "Diamond", emoji: "🔷" };
  if (level >= 30) return { name: "Platinum", emoji: "⚪" };
  if (level >= 15) return { name: "Gold", emoji: "🟡" };
  if (level >= 5) return { name: "Bronze", emoji: "🟤" };
  return { name: "Iron", emoji: "⚫" };
}

// ====================== DB ======================
function loadDB() {
  if (dbCache) return dbCache;

  try {
    if (!fs.existsSync(DB_PATH)) {
      dbCache = { xp: {} };
      fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
      return dbCache;
    }

    const raw = fs.readFileSync(DB_PATH, "utf8");
    dbCache = raw ? JSON.parse(raw) : { xp: {} };

    if (!dbCache.xp) dbCache.xp = {};

    return dbCache;
  } catch (err) {
    console.error("[LEVEL] DB ERROR:", err.message);
    dbCache = { xp: {} };
    return dbCache;
  }
}

function saveDB() {
  if (!dbCache) return;
  fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
}

// ====================== LEVEL UP ======================
async function sendLevelUpMessage(member, level, gainedXP) {
  const now = Date.now();
  if (now - (lastLevelUp.get(member.id) || 0) < 15000) return;

  lastLevelUp.set(member.id, now);

  const rank = getRank(level);
  const coinReward = 50;

  try {
    economy.addCoins(member.id, coinReward);
  } catch {}

  const embed = new EmbedBuilder()
    .setColor("#0b0b0f")
    .setTitle("LEVEL UP")
    .setDescription(
      `${rank.emoji} **${rank.name}**\n` +
      `Level: **${level}**\n` +
      `XP gained: \`${gainedXP}\`\n` +
      `Reward: +${coinReward} coins`
    )
    .setTimestamp();

  const channel = member.guild.channels.cache.get(LEVEL_UP_CHANNEL_ID);
  if (channel) {
    channel.send({ content: `${member}`, embeds: [embed] }).catch(() => {});
  }
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
  if (now - (xpCooldown.get(member.id) || 0) < 3000) return;

  xpCooldown.set(member.id, now);

  let gain = base;

  if (length >= cfg.lengthThreshold) {
    gain += Math.floor(length * cfg.lengthBonus);
  }

  let boost = 1;

  try {
    boost = Number(boostSystem.getCurrentBoost(member.id)) || 1;
  } catch {}

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
    await sendLevelUpMessage(member, user.level, gain);
    try {
      economy.addCoins(member.id, 50 + user.level * 5);
    } catch {}
  }

  return user;
}

// ====================== MESSAGE XP ======================
async function handleMessageXP(member, content) {
  const cfg = loadConfig();
  return addXP(member, cfg.messageXP, content?.length || 0);
}

// ====================== EXPORT ======================
module.exports = {
  loadDB,
  loadConfig,
  addXP,
  handleMessageXP,
  neededXP,
  getRank
};
