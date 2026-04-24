const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

const { getCurrentBoost } = require("../boost");
const { addCoins } = require("../economy");

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

const LEVEL_ROLES = {
  5: "1476000458987278397",
  15: "1476000995501670534",
  30: "1476000459595448442",
  45: "1476000991206707221",
  60: "1476000991823532032",
  75: "1476000992351879229"
};

let dbCache = null;
let configCache = null;

const xpCooldown = new Map();
const lastLevelUp = new Map();

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ======================
function neededXP(level) {
  return Math.floor(100 * Math.pow(level + 1, 1.5));
}

function loadConfig() {
  if (configCache) return configCache;

  if (!fs.existsSync(CONFIG_PATH)) {
    configCache = DEFAULT_CONFIG;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configCache, null, 2));
    return configCache;
  }

  configCache = JSON.parse(fs.readFileSync(CONFIG_PATH));
  return configCache;
}

function loadDB() {
  if (dbCache) return dbCache;

  if (!fs.existsSync(DB_PATH)) {
    dbCache = { xp: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
    return dbCache;
  }

  dbCache = JSON.parse(fs.readFileSync(DB_PATH));
  if (!dbCache.xp) dbCache.xp = {};
  return dbCache;
}

function saveDB() {
  if (!dbCache) return;
  fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
}

// ======================
async function addXP(member, base, length = 0) {
  if (!member || member.user?.bot) return;

  const cfg = loadConfig();
  const db = loadDB();

  if (!db.xp[member.id]) {
    db.xp[member.id] = { xp: 0, level: 0 };
  }

  const now = Date.now();
  const last = xpCooldown.get(member.id) || 0;

  if (now - last < 2000) return;
  xpCooldown.set(member.id, now);

  let gain = base;

  if (length >= cfg.lengthThreshold) {
    gain += Math.floor(length * cfg.lengthBonus);
  }

  gain = Math.floor(gain * (cfg.globalMultiplier * (getCurrentBoost(member.id) || 1)));

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
    addCoins(member.id, 50 + user.level * 5);
  }

  return user;
}

async function checkRoles(member, level) {
  for (const [req, role] of Object.entries(LEVEL_ROLES)) {
    if (level >= Number(req)) {
      member.roles.add(role).catch(() => {});
    }
  }
}

function handleMessageXP(member, content) {
  const cfg = loadConfig();
  return addXP(member, cfg.messageXP, content?.length || 0);
}

function init() {
  loadDB();
  loadConfig();
  console.log("📈 LEVEL FIXED LOADED");
}

module.exports = {
  init,
  addXP,
  handleMessageXP
};
