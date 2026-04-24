// =====================================================
// src/systems/level/index.js
// VYRN LEVEL SYSTEM - DEBUG FULL VERSION
// =====================================================

const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

// ====================== DEBUG FLAGS ======================
const DEBUG = process.env.DEBUG_LEVEL === "true";

// ====================== PATHS ======================
const DATA_DIR = process.env.DATA_DIR || "/data";
const DB_PATH = path.join(DATA_DIR, "levels.json");

// ====================== CONFIG ======================
const CONFIG = {
  messageXP: 5,
  messageCoins: 5,

  voiceXP: 10,
  voiceCoins: 8,

  messageCooldown: 15000,
  voiceInterval: 60000,

  levelUpChannel: "1475999590716018719"
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

// ====================== ECONOMY SAFE IMPORT ======================
let economy;
try {
  economy = require("../economy");
} catch {
  economy = {
    addCoins: () => {}
  };
}

// ====================== INIT ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db = null;
const messageCooldowns = new Map();

// ====================== LOAD DB ======================
function loadDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    db = JSON.parse(raw || '{"users":{}}');

    if (!db.users) db.users = {};

    return db;
  } catch (err) {
    db = { users: {} };
    return db;
  }
}

// ====================== SAVE DB ======================
function saveDB() {
  if (!db) return;
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ====================== USER ======================
function ensureUser(userId) {
  loadDB();

  if (!db.users[userId]) {
    db.users[userId] = {
      xp: 0,
      totalXP: 0,
      level: 0
    };
  }

  return db.users[userId];
}

// ====================== XP FORMULA ======================
function neededXP(level) {
  return 50 + level * 35;
}

// ====================== RANK ======================
function getRank(level) {
  if (level >= 75) return { name: "Legend", emoji: "<:LegeRank:1488756343190847538>" };
  if (level >= 60) return { name: "Ruby", emoji: "<:RubyRank:1488756400514404372>" };
  if (level >= 45) return { name: "Diamond", emoji: "<:DiaxRank:1488756482924089404>" };
  if (level >= 30) return { name: "Platinum", emoji: "<:PlatRank:1488756557863845958>" };
  if (level >= 15) return { name: "Gold", emoji: "<:GoldRank:1488756524854808686>" };
  if (level >= 5) return { name: "Bronze", emoji: "<:BronzeRank:1488756638285565962>" };

  return { name: "Iron", emoji: "<:Ironrank:1488756604277887039>" };
}

// ====================== LEVEL CHECK ======================
async function checkLevel(member, user) {
  let leveled = false;

  while (user.xp >= neededXP(user.level)) {
    user.xp -= neededXP(user.level);
    user.level++;
    leveled = true;
  }

  if (!leveled) return;

  if (DEBUG) {
    console.log(`[LEVEL DEBUG] LEVEL UP -> ${member.user.tag} | LVL: ${user.level}`);
  }

  saveDB();
}

// ====================== MESSAGE XP ======================
async function handleMessageXP(member) {
  const now = Date.now();
  const last = messageCooldowns.get(member.id) || 0;

  const user = ensureUser(member.id);

  if (DEBUG) {
    console.log(`[LEVEL DEBUG] user=${member.id}`);
    console.log(`[LEVEL DEBUG] cooldown diff=${now - last}`);
    console.log(`[LEVEL DEBUG] required=${CONFIG.messageCooldown}`);
  }

  if (now - last < CONFIG.messageCooldown) {
    if (DEBUG) console.log(`[LEVEL DEBUG] ❌ BLOCKED BY COOLDOWN`);
    return user;
  }

  messageCooldowns.set(member.id, now);

  const before = user.xp;

  user.xp += CONFIG.messageXP;
  user.totalXP += CONFIG.messageXP;

  economy.addCoins(member.id, CONFIG.messageCoins);

  await checkLevel(member, user);

  saveDB();

  if (DEBUG) {
    console.log(
      `[LEVEL DEBUG] ✅ XP +${CONFIG.messageXP} | ${before} → ${user.xp}`
    );
  }

  return user;
}

// ====================== VOICE XP ======================
async function handleVoiceXP(member) {
  const user = ensureUser(member.id);

  const before = user.xp;

  user.xp += CONFIG.voiceXP;
  user.totalXP += CONFIG.voiceXP;

  economy.addCoins(member.id, CONFIG.voiceCoins);

  await checkLevel(member, user);

  saveDB();

  if (DEBUG) {
    console.log(
      `[VOICE DEBUG] ${member.user.tag} +${CONFIG.voiceXP} XP | ${before} → ${user.xp}`
    );
  }

  return user;
}

// ====================== EXPORT ======================
module.exports = {
  CONFIG,
  LEVEL_ROLES,

  loadDB,
  saveDB,
  ensureUser,

  neededXP,
  getRank,

  handleMessageXP,
  handleVoiceXP
};
