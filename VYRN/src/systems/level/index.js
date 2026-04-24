// =====================================================
// VYRN LEVEL SYSTEM - FULL STABLE + BLACK LEVEL UP
// =====================================================
const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

// ====================== PATH ======================
const DATA_DIR = process.env.DATA_DIR || "/data";
const DB_PATH = path.join(DATA_DIR, "levels.json");

// ====================== CONFIG ======================
const CONFIG = {
  messageXP: 5,
  messageCoins: 5,
  voiceXP: 10,
  voiceCoins: 8,
  messageCooldown: 15000
};

const LEVEL_UP_CHANNEL_ID = "1475999590716018719";   // ← kanał na powiadomienia

// ====================== ROLES ======================
const LEVEL_ROLES = {
  5: "1476000458987278397",
  15: "1476000995501670534",
  30: "1476000459595448442",
  45: "1476000991206707221",
  60: "1476000991823532032",
  75: "1476000992351879229"
};

// ====================== ECONOMY SAFE ======================
let economy;
try {
  economy = require("../economy");
} catch {
  economy = { addCoins: () => {} };
}

// ====================== INIT ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ====================== CACHE ======================
let db = { users: {} };
const cooldown = new Map();

// ====================== LOAD ======================
function loadDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      db = { users: {} };
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
      return db;
    }
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(raw || "{}");
    db = { users: parsed.users || parsed };
    if (!db.users) db.users = {};
    return db;
  } catch (err) {
    console.error("[LEVEL LOAD ERROR]", err);
    db = { users: {} };
    return db;
  }
}

// ====================== SAVE ======================
function saveDB() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error("[LEVEL SAVE ERROR]", err);
  }
}

// ====================== USER ======================
function ensureUser(id) {
  loadDB();
  if (!db.users[id]) {
    db.users[id] = { xp: 0, totalXP: 0, level: 0 };
  }
  return db.users[id];
}

// ====================== XP ======================
function neededXP(level) {
  return 50 + level * 35;
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

// ====================== BLACK LEVEL UP NOTIFICATION ======================
async function sendLevelUpMessage(member, newLevel) {
  const channel = member.guild.channels.cache.get(LEVEL_UP_CHANNEL_ID);
  if (!channel) return;

  const rank = getRank(newLevel);

  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setAuthor({
      name: member.user.username,
      iconURL: member.user.displayAvatarURL({ dynamic: true })
    })
    .setTitle(`🎉 AWANS! Level ${newLevel}`)
    .setDescription(`${rank.emoji} **${rank.name}**`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setFooter({ text: "VYRN Clan • Level System" })
    .setTimestamp();

  channel.send({ embeds: [embed] }).catch(() => {});
}

// ====================== LEVEL CHECK ======================
function checkLevel(member, user) {
  let leveled = false;
  while (user.xp >= neededXP(user.level)) {
    user.xp -= neededXP(user.level);
    user.level++;
    leveled = true;
  }

  if (leveled) {
    sendLevelUpMessage(member, user.level);   // ← CZARNE POWIADOMIENIE
  }

  saveDB();
  return leveled;
}

// ====================== MESSAGE XP ======================
async function handleMessageXP(member) {
  const now = Date.now();
  const last = cooldown.get(member.id) || 0;
  if (now - last < CONFIG.messageCooldown) return ensureUser(member.id);

  cooldown.set(member.id, now);

  const user = ensureUser(member.id);
  user.xp += CONFIG.messageXP;
  user.totalXP += CONFIG.messageXP;

  economy.addCoins(member.id, CONFIG.messageCoins);
  checkLevel(member, user);

  return user;
}

// ====================== VOICE XP ======================
function handleVoiceXP(member) {
  const user = ensureUser(member.id);
  user.xp += CONFIG.voiceXP;
  user.totalXP += CONFIG.voiceXP;

  economy.addCoins(member.id, CONFIG.voiceCoins);
  checkLevel(member, user);

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
