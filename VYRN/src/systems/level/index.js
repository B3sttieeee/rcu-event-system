// =====================================================
// LEVEL SYSTEM - HYBRID MODULAR
// =====================================================
const fs = require("fs");
const path = require("path");
const { ChannelType, EmbedBuilder } = require("discord.js");

const { getCurrentBoost } = require("../boost");
const { addCoins } = require("../economy");

const DATA_DIR = process.env.DATA_DIR || "/data";
const DB_PATH = path.join(DATA_DIR, "levels.json");
const CONFIG_PATH = path.join(DATA_DIR, "levelConfig.json");

const LEVEL_UP_CHANNEL_ID = "1475999590716018719";

const DEFAULT_CONFIG = {
  messageXP: 5,
  voiceXP: 5,
  lengthBonus: 0.3,
  lengthThreshold: 30,
  globalMultiplier: 1,
  boostRole: "1476000398107217980"
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
let writeQueue = Promise.resolve();
let voiceLoopStarted = false;

const xpCooldown = new Map();

// ====================== INIT ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ====================== HELPERS ======================
const normalizeUserXP = (user = {}) => ({
  xp: Number.isFinite(Number(user.xp)) ? Number(user.xp) : 0,
  level: Number.isFinite(Number(user.level)) ? Number(user.level) : 0
});

const logError = (scope, error) => {
  console.error(`[LEVEL] ${scope}`);
  if (error?.stack) console.error(error.stack);
  else console.error(error);
};

function getRank(level) {
  if (level >= 75) return { name: "Legend", emoji: "<:LegeRank:1488756343190847538>" };
  if (level >= 60) return { name: "Ruby", emoji: "<:RubyRank:1488756400514404372>" };
  if (level >= 45) return { name: "Diamond", emoji: "<:DiaxRank:1488756482924089404>" };
  if (level >= 30) return { name: "Platinum", emoji: "<:PlatRank:1488756557863845958>" };
  if (level >= 15) return { name: "Gold", emoji: "<:GoldRank:1488756524854808686>" };
  if (level >= 5) return { name: "Bronze", emoji: "<:BronzeRank:1488756638285565962>" };
  return { name: "Iron", emoji: "<:Ironrank:1488756604277887039>" };
}

async function sendLevelUpMessage(member, newLevel, xpGained) {
  if (!member || member.user.bot) return;

  const rank = getRank(newLevel);
  const coinReward = 50;
  addCoins(member.id, coinReward);

  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🎉 Level Up!")
    .setDescription(
      `> **${rank.emoji} ${rank.name}**\n` +
      `> **Level ${newLevel}**\n\n` +
      `**XP Gained:** \`${xpGained}\`\n` +
      `**Coins Reward:** \`+${coinReward}\` <:CASHH:1491180511308157041>`
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({
      text: "VYRN CLAN • Keep grinding harder 🔥",
      iconURL: member.guild.iconURL({ dynamic: true })
    })
    .setTimestamp();

  try {
    const levelUpChannel = member.guild.channels.cache.get(LEVEL_UP_CHANNEL_ID) ||
                           await member.guild.channels.fetch(LEVEL_UP_CHANNEL_ID).catch(() => null);

    if (levelUpChannel) {
      await levelUpChannel.send({
        content: `> **${member}** just leveled up!`,
        embeds: [embed]
      });
    }
  } catch (err) {
    console.error(`[LEVEL] Failed to send level-up for ${member.user.tag}:`, err.message);
  }
}

// ====================== LOAD & SAVE ======================
function loadDB() {
  if (dbCache) return dbCache;
  try {
    if (!fs.existsSync(DB_PATH)) {
      dbCache = { xp: {} };
      fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
      return dbCache;
    }

    const raw = fs.readFileSync(DB_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : { xp: {} };
    dbCache = { xp: {} };

    for (const [userId, userData] of Object.entries(parsed.xp || {})) {
      dbCache.xp[userId] = normalizeUserXP(userData);
    }
    return dbCache;
  } catch (error) {
    logError("DB LOAD ERROR", error);
    dbCache = { xp: {} };
    return dbCache;
  }
}

function saveDB() {
  if (!dbCache) return writeQueue;
  const snapshot = JSON.stringify(dbCache, null, 2);

  writeQueue = writeQueue
    .catch(() => null)
    .then(async () => {
      try {
        await fs.promises.writeFile(`${DB_PATH}.tmp`, snapshot, "utf8");
        await fs.promises.rename(`${DB_PATH}.tmp`, DB_PATH);
        dbCache = null;
      } catch (error) {
        logError("DB SAVE ERROR", error);
      }
    });
  return writeQueue;
}

function loadConfig() {
  if (configCache) return configCache;
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      configCache = { ...DEFAULT_CONFIG };
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(configCache, null, 2));
      return configCache;
    }

    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : {};
    configCache = { ...DEFAULT_CONFIG, ...parsed };
    return configCache;
  } catch (error) {
    logError("CONFIG LOAD ERROR", error);
    configCache = { ...DEFAULT_CONFIG };
    return configCache;
  }
}

function saveConfig() {
  if (!configCache) return;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(configCache, null, 2));
}

// ====================== CORE LOGIC ======================
function neededXP(level) {
  const currentLevel = Math.max(0, Number(level) || 0);
  return Math.floor(100 * Math.pow(currentLevel + 1, 1.5));
}

function getMultiplier(member) {
  const cfg = loadConfig();
  let multiplier = Number(cfg.globalMultiplier) || 1;
  multiplier *= getCurrentBoost(member.id) || 1;

  if (cfg.boostRole && member.roles?.cache?.has(cfg.boostRole)) {
    multiplier *= 1.75;
  }
  return multiplier;
}

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
  user.xp += gain;

  let leveled = false;
  while (user.xp >= neededXP(user.level)) {
    user.xp -= neededXP(user.level);
    user.level += 1;
    leveled = true;
  }

  if (leveled) {
    await checkRoles(member, user.level);
    await sendLevelUpMessage(member, user.level, gain);
  }

  saveDB();
  return { leveledUp: leveled, level: user.level, xp: user.xp, gained: gain };
}

async function checkRoles(member, level) {
  for (const [reqLevel, roleId] of Object.entries(LEVEL_ROLES)) {
    if (level >= Number(reqLevel) && !member.roles.cache.has(roleId)) {
      await member.roles.add(roleId).catch(err =>
        console.error(`[LEVEL] Failed to add role ${roleId}:`, err.message)
      );
    }
  }
}

async function handleMessageXP(member, content) {
  if (!member || member.user?.bot) return null;
  const cfg = loadConfig();
  return await addXP(member, cfg.messageXP, content?.length || 0, { useCooldown: true });
}

function startVoiceXP(client) {
  if (voiceLoopStarted) return;
  voiceLoopStarted = true;

  console.log("🎤 Voice XP loop started");

  setInterval(async () => {
    const cfg = loadConfig();
    const processedUsers = new Set();

    for (const guild of client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice) continue;

        for (const member of channel.members.values()) {
          if (member.user?.bot || processedUsers.has(member.id)) continue;
          processedUsers.add(member.id);

          await addXP(member, cfg.voiceXP, 0, { useCooldown: false }).catch(() => null);
        }
      }
    }
  }, 60_000);
}

// ====================== INIT ======================
function init(client) {
  loadDB();
  loadConfig();
  startVoiceXP(client);
  console.log("📈 Level System → załadowany");
}

module.exports = {
  init,
  addXP,
  handleMessageXP,
  startVoiceXP,
  loadDB,
  loadConfig,
  neededXP,
  getMultiplier,
  checkRoles,
  getRank,
  sendLevelUpMessage
};
