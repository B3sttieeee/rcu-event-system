const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

// ====================== SAFE IMPORT BOOST ======================
let boostSystem = null;

try {
boostSystem = require("../boost/index.js");
} catch (err) {
console.warn("[LEVEL] Boost system not found - running without boost");
boostSystem = {
getCurrentBoost: () => 1
};
}

// ====================== SAFE IMPORT ECONOMY ======================
let economy = null;

try {
economy = require("../economy/index.js");
} catch (err) {
console.warn("[LEVEL] Economy system not found");
economy = {
addCoins: () => {}
};
}

// ====================== PATHS ======================
const DATA_DIR = process.env.DATA_DIR || "/data";
const DB_PATH = path.join(DATA_DIR, "levels.json");
const CONFIG_PATH = path.join(DATA_DIR, "levelConfig.json");

const LEVEL_UP_CHANNEL_ID = "1475999590716018719";

// ====================== CONFIG ======================
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

// ====================== INIT ======================
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

// ====================== CONFIG LOAD ======================
function loadConfig() {
if (configCache) return configCache;

try {
if (!fs.existsSync(CONFIG_PATH)) {
configCache = { ...DEFAULT_CONFIG };
fs.writeFileSync(CONFIG_PATH, JSON.stringify(configCache, null, 2));
return configCache;
}

configCache = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
return configCache;

} catch (err) {
console.error("[LEVEL] CONFIG ERROR", err);
return DEFAULT_CONFIG;
}
}

// ====================== DB LOAD ======================
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

} catch (err) {
console.error("[LEVEL] DB ERROR", err);
return { xp: {} };
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
`XP: \`${gainedXP}\`\n` +
`Reward: +${coinReward} coins`
)
.setTimestamp();

const channel = member.guild.channels.cache.get(LEVEL_UP_CHANNEL_ID);

if (channel) {
channel.send({
content: `${member}`,
embeds: [embed]
}).catch(() => {});
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

// SAFE BOOST (NIGDY NIE CRASHUJE)
let boost = 1;

try {
boost = Number(boostSystem.getCurrentBoost(member.id) || 1);
} catch {
boost = 1;
}

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
function handleMessageXP(member, content) {
const cfg = loadConfig();
return addXP(member, cfg.messageXP, content?.length || 0);
}

// ====================== INIT ======================
function init() {
loadDB();
loadConfig();
console.log("📈 Level System (SAFE FIXED) loaded");
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
