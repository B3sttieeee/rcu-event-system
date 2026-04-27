// =====================================================
// ACTIVITY SYSTEM - OPTIMIZED & STABLE
// =====================================================
const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

const DATA_DIR = process.env.DATA_DIR || "/data";
const PROFILE_PATH = path.join(DATA_DIR, "profile.json");
const LEVELS_PATH = path.join(DATA_DIR, "levels.json");

let profileDB = { users: {} };
let levelsDB = { users: {} };

const DEBUG = false; // Zmienione na false, żeby nie spamować konsoli przy każdej minucie

// ====================== INIT FILES ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ====================== LOAD / SAVE ======================
function loadAll() {
  try {
    if (fs.existsSync(PROFILE_PATH)) {
      profileDB = JSON.parse(fs.readFileSync(PROFILE_PATH, "utf8"));
    }
    if (fs.existsSync(LEVELS_PATH)) {
      levelsDB = JSON.parse(fs.readFileSync(LEVELS_PATH, "utf8"));
    }
    if (!profileDB.users) profileDB.users = {};
    if (!levelsDB.users) levelsDB.users = {};
  } catch (e) {
    console.error("[ACTIVITY] LOAD ERROR", e.message);
  }
}

function saveAll() {
  try {
    fs.writeFileSync(PROFILE_PATH, JSON.stringify(profileDB, null, 2));
    fs.writeFileSync(LEVELS_PATH, JSON.stringify(levelsDB, null, 2));
    if (DEBUG) console.log(`[ACTIVITY] ✅ Zapisano dane w tle`);
  } catch (e) {
    console.error("[ACTIVITY] SAVE ERROR", e.message);
  }
}

// ====================== USER ======================
function ensureUser(userId) {
  // USUNIĘTO loadAll()! Dane są ładowane tylko raz przy starcie.
  if (!profileDB.users[userId]) profileDB.users[userId] = { voice: 0 };
  if (!levelsDB.users[userId]) levelsDB.users[userId] = { xp: 0, level: 0, totalXP: 0 };
  return {
    voice: profileDB.users[userId],
    level: levelsDB.users[userId]
  };
}

// ====================== VOICE ======================
function addVoiceTime(userId, seconds) {
  const amount = Math.floor(Number(seconds));
  if (!userId || amount <= 0) return false;

  const user = ensureUser(userId);
  const before = user.voice.voice || 0;
  user.voice.voice += amount;

  if (DEBUG) {
    console.log(`[ACTIVITY][VOICE] ${userId} +${amount}s | ${before} → ${user.voice.voice} (${Math.floor(user.voice.voice/60)} min)`);
  }

  // USUNIĘTO saveAll()
  return true;
}

function getVoiceMinutes(userId) {
  const user = ensureUser(userId);
  return Math.floor((user.voice.voice || 0) / 60);
}

// ====================== XP + COINS ======================
function addActivityXP(member, xpAmount = 10, coinsAmount = 8) {
  const user = ensureUser(member.id);
  const beforeLevel = user.level.level;
  const beforeXP = user.level.xp;

  user.level.xp += xpAmount;
  user.level.totalXP += xpAmount;

  let leveledUp = false;

  while (user.level.xp >= neededXP(user.level.level)) {
    user.level.xp -= neededXP(user.level.level);
    user.level.level++;
    leveledUp = true;
  }

  // To automatycznie dodaje monety przez system ekonomii
  if (coinsAmount > 0) {
    require("../economy").addCoins(member.id, coinsAmount);
  }

  if (leveledUp) {
    sendLevelUpMessage(member, user.level.level);
    console.log(`[ACTIVITY] ${member.user.tag} LEVEL UP! ${beforeLevel} → ${user.level.level}`);
  }

  if (DEBUG) {
    console.log(`[ACTIVITY][XP] ${member.user.tag} +${xpAmount} XP | ${beforeXP} → ${user.level.xp} | Level ${user.level.level}`);
  }

  // USUNIĘTO saveAll()
}

function neededXP(level) {
  return Math.floor(100 * Math.pow(level + 1, 1.5));
}

// ====================== LEVEL UP EMBED ======================
async function sendLevelUpMessage(member, newLevel) {
  const channel = member.guild.channels.cache.get("1475999590716018719");
  if (!channel) return;

  const rank = getRank(newLevel);

  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setAuthor({ name: `${member.user.username} just leveled up!` })
    .setTitle(`Level ${newLevel}`)
    .setDescription(`${rank.emoji} **${rank.name}**`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: "VYRN CLAN • Keep grinding harder" })
    .setTimestamp();

  channel.send({ embeds: [embed] }).catch(() => {});
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

// ====================== INIT ======================
function init() {
  loadAll();
  console.log("📊 Activity System → załadowany [ZOPTYMALIZOWANY]");
  
  // Zapisujemy dane zbiorczo co 30 sekund zamiast przy każdej wiadomości/minucie
  setInterval(saveAll, 30000);
  
  process.on("SIGINT", saveAll);
  process.on("SIGTERM", saveAll);
}

module.exports = {
  init,
  addVoiceTime,
  getVoiceMinutes,
  addActivityXP,
  getRank,
  getLevelData: (userId) => {
    const user = ensureUser(userId);
    return {
      xp: user.level.xp || 0,
      level: user.level.level || 0,
      totalXP: user.level.totalXP || 0
    };
  }
};
