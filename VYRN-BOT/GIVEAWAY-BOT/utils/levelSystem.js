const fs = require("fs");
const path = require("path");
const { ChannelType, EmbedBuilder } = require("discord.js");

const { getCurrentBoost } = require("./boostSystem");
const { addVoiceTime, addMessage } = require("./profileSystem");

const DATA_DIR = process.env.DATA_DIR || "/data";
const DB_PATH = path.join(DATA_DIR, "levels.json");
const CONFIG_PATH = path.join(DATA_DIR, "levelConfig.json");
const DB_TMP_PATH = `${DB_PATH}.tmp`;

const DEFAULT_CONFIG = {
  messageXP: 5,
  voiceXP: 5,
  lengthBonus: 0.3,
  lengthThreshold: 30,
  globalMultiplier: 1,
  boostRole: "1476000398107217980"
};

// =====================================================
// INIT
// =====================================================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`[LEVEL] Data directory ready: ${DATA_DIR}`);
}

// =====================================================
// CACHE & WRITE QUEUE
// =====================================================
let dbCache = null;
let configCache = null;
let writeQueue = Promise.resolve();
let voiceLoopStarted = false;

const xpCooldown = new Map();

// =====================================================
// HELPERS
// =====================================================
const normalizeUserXP = (user = {}) => ({
  xp: Number.isFinite(Number(user.xp)) ? Number(user.xp) : 0,
  level: Number.isFinite(Number(user.level)) ? Number(user.level) : 0
});

const logError = (scope, error) => {
  console.error(`[LEVEL] ${scope}`);
  if (error?.stack) console.error(error.stack);
  else console.error(error);
};

const triggerDailyCheck = async (member) => {
  try {
    const { checkDailyDM } = require("./dailySystem");
    if (typeof checkDailyDM === "function") await checkDailyDM(member);
  } catch (e) {}
};

const isEligibleVoiceMember = (member) => {
  if (!member || member.user?.bot) return false;
  if (!member.voice?.channelId) return false;
  if (member.voice.selfMute || member.voice.selfDeaf) return false;
  if (member.voice.serverMute || member.voice.serverDeaf) return false;
  return true;
};

// =====================================================
// RANK SYSTEM
// =====================================================
function getRank(level) {
  if (level >= 75) return { name: "Legend", emoji: "<:LegeRank:1488756343190847538>" };
  if (level >= 60) return { name: "Ruby", emoji: "<:RubyRank:1488756400514404372>" };
  if (level >= 45) return { name: "Diamond", emoji: "<:DiaxRank:1488756482924089404>" };
  if (level >= 30) return { name: "Platinum", emoji: "<:PlatRank:1488756557863845958>" };
  if (level >= 15) return { name: "Gold", emoji: "<:GoldRank:1488756524854808686>" };
  if (level >= 5)  return { name: "Bronze", emoji: "<:BronzeRank:1488756638285565962>" };
  return { name: "Iron", emoji: "<:Ironrank:1488756604277887039>" };
}

// =====================================================
// LEVEL UP MESSAGE (wysoka jakość)
// =====================================================
async function sendLevelUpMessage(member, newLevel, xpGained) {
  if (!member || member.user.bot) return;

  const rank = getRank(newLevel);

  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🎉 Level Up!")
    .setDescription(
      `> **${rank.emoji} ${rank.name}**\n` +
      `> **Level ${newLevel}**\n\n` +
      `**Zdobyto XP:** \`${xpGained}\`\n` +
      `**Nowy poziom:** **${newLevel}**`
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({
      text: "VYRN CLAN • Keep grinding 🔥",
      iconURL: member.guild.iconURL({ dynamic: true })
    })
    .setTimestamp();

  // Wysyłanie z wzmianką poza embedem
  try {
    await member.channel?.send({
      content: `> **${member}** właśnie awansował!`,
      embeds: [embed]
    }).catch(() => {});
  } catch (err) {
    console.error(`[LEVEL] Nie udało się wysłać level-up dla ${member.user.tag}`);
  }
}

// =====================================================
// DATABASE + CONFIG (bez zmian, tylko dla kompletności)
// =====================================================
function loadDB() { /* ... Twój istniejący kod ... */ }
function saveDB() { /* ... Twój istniejący kod ... */ }
function loadConfig() { /* ... Twój istniejący kod ... */ }
function saveConfig() { /* ... Twój istniejący kod ... */ }

function neededXP(level) {
  const currentLevel = Math.max(0, Number(level) || 0);
  return Math.floor(100 * Math.pow(currentLevel + 1, 1.5));
}

function getMultiplier(member) {
  const cfg = loadConfig();
  let multiplier = Number(cfg.globalMultiplier) || 1;
  multiplier *= getCurrentBoost(member.id) || 1;
  if (cfg.boostRole && member.roles?.cache?.has(cfg.boostRole)) multiplier *= 1.75;
  return multiplier;
}

// =====================================================
// CORE XP FUNCTION (z level up)
// =====================================================
async function addXP(member, base = 0, length = 0, options = {}) {
  const { useCooldown = true } = options;
  if (!member || member.user?.bot) return null;

  const safeBase = Number(base);
  if (!Number.isFinite(safeBase) || safeBase <= 0) return null;

  if (useCooldown) {
    const now = Date.now();
    if (xpCooldown.has(member.id) && now - xpCooldown.get(member.id) < 2500) return null;
    xpCooldown.set(member.id, now);
  }

  const db = loadDB();
  const cfg = loadConfig();

  if (!db.xp[member.id]) db.xp[member.id] = normalizeUserXP();

  let gain = safeBase;
  if ((length || 0) >= cfg.lengthThreshold) gain *= 1 + cfg.lengthBonus;

  gain = Math.floor(gain * getMultiplier(member));
  if (gain <= 0) return null;

  const user = db.xp[member.id];
  const oldLevel = user.level;

  user.xp += gain;

  let leveled = false;
  while (user.xp >= neededXP(user.level)) {
    user.xp -= neededXP(user.level);
    user.level += 1;
    leveled = true;
  }

  if (leveled) {
    await checkRoles(member, user.level);
    await sendLevelUpMessage(member, user.level, gain);   // ← Level Up Message
  }

  saveDB();

  return {
    leveledUp: leveled,
    level: user.level,
    xp: user.xp,
    gained: gain
  };
}

// Reszta funkcji bez zmian (checkRoles, handleMessageXP, startVoiceXP, setters...)

function checkRoles(member, level) { /* Twój istniejący kod */ }
async function handleMessageXP(member, content) { /* Twój istniejący kod */ }
function startVoiceXP(client) { /* Twój istniejący kod */ }
function setMessageXP(value) { /* Twój istniejący kod */ }
function setVoiceXP(value) { /* Twój istniejący kod */ }

// ====================== EXPORT ======================
module.exports = {
  addXP,
  startVoiceXP,
  handleMessageXP,
  loadDB,
  loadConfig,
  neededXP,
  getMultiplier,
  checkRoles,
  setMessageXP,
  setVoiceXP,
  sendLevelUpMessage,   // eksportujemy
  getRank               // przydatne też w innych miejscach
};
