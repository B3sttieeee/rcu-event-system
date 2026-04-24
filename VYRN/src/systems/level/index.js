// =====================================================
// LEVEL SYSTEM - VYRN FIXED STABLE CORE
// =====================================================

const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

const { getCurrentBoost } = require("../boost");
const { addCoins } = require("../economy");

const DATA_DIR = process.env.DATA_DIR || "/data";
const DB_PATH = path.join(DATA_DIR, "levels.json");

const LEVEL_UP_CHANNEL_ID = "1475999590716018719";

let dbCache = null;

const xpCooldown = new Map();
const lastLevelUp = new Map();

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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

async function addXP(member, base, length = 0) {
  if (!member || member.user?.bot) return;

  const db = loadDB();

  if (!db.xp[member.id]) {
    db.xp[member.id] = { xp: 0, level: 0 };
  }

  const now = Date.now();
  if (now - (xpCooldown.get(member.id) || 0) < 3000) return;
  xpCooldown.set(member.id, now);

  let gain = base;

  if (length > 30) {
    gain += Math.floor(length * 0.3);
  }

  const boost = getCurrentBoost(member.id) || 1;
  gain = Math.floor(gain * boost);

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
    addCoins(member.id, 50 + user.level * 5);
  }

  return user;
}

async function sendLevelUp(member, level, gainedXP) {
  const now = Date.now();
  if (now - (lastLevelUp.get(member.id) || 0) < 15000) return;
  lastLevelUp.set(member.id, now);

  const rank = getRank(level);

  const embed = new EmbedBuilder()
    .setColor("#0b0b0f")
    .setTitle("LEVEL UP")
    .setDescription(
      `${rank.emoji} **${rank.name}**\nLevel **${level}**\n+${gainedXP} XP`
    )
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();

  const channel = member.guild.channels.cache.get(LEVEL_UP_CHANNEL_ID);
  if (channel) {
    channel.send({ content: `${member}`, embeds: [embed] }).catch(() => {});
  }
}

function handleMessageXP(member, content) {
  return addXP(member, 10, content?.length || 0);
}

module.exports = {
  addXP,
  handleMessageXP,
  neededXP,
  getRank,
  loadDB
};
