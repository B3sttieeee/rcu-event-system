// =====================================================
// LEVEL SYSTEM - PROFESSIONAL VERSION + AUTO COINS
// =====================================================
const fs = require("fs");
const path = require("path");
const { ChannelType, EmbedBuilder } = require("discord.js");

const { getCurrentBoost } = require("../boost");
const { addCoins } = require("../economy");
const { addVoiceTime } = require("../profile");

const DATA_DIR = process.env.DATA_DIR || "/data";
const DB_PATH = path.join(DATA_DIR, "levels.json");
const CONFIG_PATH = path.join(DATA_DIR, "levelConfig.json");

const LEVEL_UP_CHANNEL_ID = "1475999590716018719";

const DEFAULT_CONFIG = {
  messageXP: 10,
  voiceXP: 8,
  messageCoins: 8,      // monety za wiadomość
  voiceCoins: 6,        // monety za minutę na voice
  lengthBonus: 0.3,
  lengthThreshold: 30,
  globalMultiplier: 1,
  boostRole: "1476000398107217980"
};

const LEVEL_ROLES = {
  5:  "1476000458987278397",
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
const lastLevelUp = new Map(); // anti-spam level up

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ====================== HELPERS ======================
function neededXP(level) {
  return Math.floor(100 * Math.pow(level + 1, 1.5));
}

function getRank(level) {
  if (level >= 75) return { name: "Legend", emoji: "<:LegeRank:1488756343190847538>" };
  if (level >= 60) return { name: "Ruby",   emoji: "<:RubyRank:1488756400514404372>" };
  if (level >= 45) return { name: "Diamond", emoji: "<:DiaxRank:1488756482924089404>" };
  if (level >= 30) return { name: "Platinum", emoji: "<:PlatRank:1488756557863845958>" };
  if (level >= 15) return { name: "Gold",    emoji: "<:GoldRank:1488756524854808686>" };
  if (level >= 5)  return { name: "Bronze",  emoji: "<:BronzeRank:1488756638285565962>" };
  return { name: "Iron", emoji: "<:Ironrank:1488756604277887039>" };
}

function getMultiplier(member) {
  const cfg = loadConfig();
  let multi = cfg.globalMultiplier;

  if (member.roles.cache.has(cfg.boostRole)) multi += 0.5;

  const boost = getCurrentBoost(member.id);
  if (boost?.multiplier) multi *= boost.multiplier;

  return multi;
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
    dbCache = JSON.parse(raw);
    if (!dbCache.xp) dbCache.xp = {};
    return dbCache;
  } catch (error) {
    console.error(`[LEVEL] LOAD ERROR: ${error.message}`);
    dbCache = { xp: {} };
    return dbCache;
  }
}

function saveDB() {
  if (!dbCache) return;
  const snapshot = JSON.stringify(dbCache, null, 2);
  writeQueue = writeQueue
    .catch(() => null)
    .then(async () => {
      try {
        await fs.promises.writeFile(`${DB_PATH}.tmp`, snapshot, "utf8");
        await fs.promises.rename(`${DB_PATH}.tmp`, DB_PATH);
        dbCache = null;
        console.log(`[LEVEL] ✅ Zapisano levels.json`);
      } catch (error) {
        console.error(`[LEVEL] SAVE ERROR: ${error.message}`);
      }
    });
}

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
  } catch {
    configCache = { ...DEFAULT_CONFIG };
    return configCache;
  }
}

// ====================== CORE ======================
async function addXP(member, baseAmount, messageLength = 0) {
  if (!member || member.user?.bot) return null;

  const cfg = loadConfig();
  let xpAmount = baseAmount;
  let coinAmount = 0;

  // Monety + XP za wiadomość
  if (messageLength > 0) {
    coinAmount += cfg.messageCoins;
    if (messageLength > cfg.lengthThreshold) {
      xpAmount += Math.floor(messageLength * cfg.lengthBonus);
    }
  }

  const multi = getMultiplier(member);
  const finalXP = Math.floor(xpAmount * multi);

  const db = loadDB();
  if (!db.xp[member.id]) db.xp[member.id] = { xp: 0, level: 0 };

  const user = db.xp[member.id];
  user.xp += finalXP;

  let leveledUp = false;
  while (user.xp >= neededXP(user.level)) {
    user.xp -= neededXP(user.level);
    user.level++;
    leveledUp = true;
  }

  saveDB();

  // Dodaj monety
  if (coinAmount > 0) {
    addCoins(member.id, coinAmount);
  }

  if (leveledUp) {
    await checkRoles(member, user.level);
    await sendLevelUpMessage(member, user.level, finalXP);
    addCoins(member.id, 50 + user.level * 5).catch(() => {});
  }

  return { leveledUp, level: user.level, xp: user.xp };
}

async function sendLevelUpMessage(member, level, gained) {
  const now = Date.now();
  if (now - (lastLevelUp.get(member.id) || 0) < 30000) return;
  lastLevelUp.set(member.id, now);

  const channel = member.guild.channels.cache.get(LEVEL_UP_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle(`🎉 ${member.user.tag} awansował!`)
    .setDescription(`**Level ${level}**`)
    .addFields({ name: "XP Gained", value: `+${gained} XP`, inline: true })
    .setTimestamp();

  channel.send({ embeds: [embed] }).catch(() => {});
}

async function checkRoles(member, level) {
  for (const [reqLevel, roleId] of Object.entries(LEVEL_ROLES)) {
    if (level >= Number(reqLevel) && !member.roles.cache.has(roleId)) {
      await member.roles.add(roleId).catch(() => {});
    }
  }
}

async function handleMessageXP(member, content) {
  if (!member || member.user?.bot) return null;
  const cfg = loadConfig();
  return await addXP(member, cfg.messageXP, content?.length || 0);
}

// ====================== VOICE XP + COINS ======================
function startVoiceXP(client) {
  if (voiceLoopStarted) return;
  voiceLoopStarted = true;
  console.log("🎤 Voice XP + Coins loop started");

  setInterval(async () => {
    const cfg = loadConfig();
    const processed = new Set();

    for (const guild of client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice) continue;

        for (const member of channel.members.values()) {
          if (member.user?.bot || processed.has(member.id)) continue;
          processed.add(member.id);

          addVoiceTime(member.id, 60);
          await addXP(member, cfg.voiceXP, 0).catch(() => {});
          addCoins(member.id, cfg.voiceCoins);        // ← MONETY ZA VOICE
        }
      }
    }
  }, 60000);
}

// ====================== INIT ======================
function init(client) {
  loadDB();
  loadConfig();
  startVoiceXP(client);
  console.log("📈 Level System → załadowany (z automatycznymi monetami)");
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
