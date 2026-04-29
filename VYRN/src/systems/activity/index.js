// src/systems/activity/index.js
const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

// ====================== CONFIG ======================
const DATA_DIR = process.env.DATA_DIR || "./";
const PROFILE_PATH = path.join(DATA_DIR, "profile.json");
const LEVELS_PATH = path.join(DATA_DIR, "levels.json");

const CONFIG = {
  CHANNEL_ID: "1475999590716018719", // Channel for level-up notifications
  THEME: {
    GOLD: "#FFD700",
    BLACK: "#0a0a0a"
  },
  // Ranks Configuration: Required Level -> Role ID, Name, and Emoji
  RANKS: [
    { level: 75, roleId: "1476000992351879229", name: "Legend", emoji: "<:LegeRank:1488756343190847538>" },
    { level: 60, roleId: "1476000991823532032", name: "Ruby", emoji: "<:RubyRank:1488756400514404372>" },
    { level: 45, roleId: "1476000991206707221", name: "Diamond", emoji: "<:DiaxRank:1488756482924089404>" },
    { level: 30, roleId: "1476000459595448442", name: "Platinum", emoji: "<:PlatRank:1488756557863845958>" },
    { level: 15, roleId: "1476000995501670534", name: "Gold", emoji: "<:GoldRank:1488756524854808686>" },
    { level: 5,  roleId: "1476000458987278397", name: "Bronze", emoji: "<:BronzeRank:1488756638285565962>" },
    { level: 0,  roleId: null,                  name: "Iron", emoji: "<:Ironrank:1488756604277887039>" }
  ]
};

// ====================== DATABASE ======================
let profileDB = { users: {} };
let levelsDB = { users: {} };

function loadAll() {
  try {
    if (fs.existsSync(PROFILE_PATH)) profileDB = JSON.parse(fs.readFileSync(PROFILE_PATH, "utf8"));
    if (fs.existsSync(LEVELS_PATH)) levelsDB = JSON.parse(fs.readFileSync(LEVELS_PATH, "utf8"));
    if (!profileDB.users) profileDB.users = {};
    if (!levelsDB.users) levelsDB.users = {};
  } catch (e) { console.error("🔥 [ACTIVITY] LOAD ERROR", e.message); }
}

function saveAll() {
  try {
    fs.writeFileSync(PROFILE_PATH, JSON.stringify(profileDB, null, 2));
    fs.writeFileSync(LEVELS_PATH, JSON.stringify(levelsDB, null, 2));
  } catch (e) { console.error("🔥 [ACTIVITY] SAVE ERROR", e.message); }
}

function ensureUser(userId) {
  if (!profileDB.users[userId]) profileDB.users[userId] = { voice: 0 };
  if (!levelsDB.users[userId]) levelsDB.users[userId] = { xp: 0, level: 0, totalXP: 0 };
  return { voice: profileDB.users[userId], level: levelsDB.users[userId] };
}

function neededXP(level) { 
  return Math.floor(100 * Math.pow(level + 1, 1.5)); 
}

// ====================== CORE LOGIC ======================
function getRank(level) {
  return CONFIG.RANKS.find(r => level >= r.level) || CONFIG.RANKS[CONFIG.RANKS.length - 1];
}

// System that automatically gives the new role AND removes the old ones
async function syncRankRoles(member, currentLevel) {
  const currentRank = getRank(currentLevel);
  if (!currentRank.roleId) return; 
  
  try {
    for (const rank of CONFIG.RANKS) {
      if (!rank.roleId) continue;
      
      const role = member.guild.roles.cache.get(rank.roleId);
      if (!role) continue;

      if (rank.roleId === currentRank.roleId) {
        if (!member.roles.cache.has(role.id)) await member.roles.add(role).catch(() => {});
      } else {
        if (member.roles.cache.has(role.id)) await member.roles.remove(role).catch(() => {});
      }
    }
  } catch (error) {
    console.error("🔥 [ACTIVITY] Role Sync Error:", error.message);
  }
}

async function addActivityXP(member, xpAmount = 10) {
  const user = ensureUser(member.id);

  // Add XP
  user.level.xp += xpAmount;
  user.level.totalXP += xpAmount;

  // Level up loop
  let leveledUp = false;
  while (user.level.xp >= neededXP(user.level.level)) {
    user.level.xp -= neededXP(user.level.level);
    user.level.level++;
    leveledUp = true;
  }

  // Trigger rewards and notifications if leveled up
  if (leveledUp) {
    await syncRankRoles(member, user.level.level);
    await sendLevelUpMessage(member, user.level.level);
  }
}

// ====================== LEVEL UP NOTIFICATION ======================
async function sendLevelUpMessage(member, newLevel) {
  const channel = member.guild.channels.cache.get(CONFIG.CHANNEL_ID);
  if (!channel) return;

  const rank = getRank(newLevel);
  const nextRank = CONFIG.RANKS.slice().reverse().find(r => r.level > newLevel);
  const nextRankText = nextRank ? `Next Rank: ${nextRank.name} (Level ${nextRank.level})` : `MAX RANK REACHED 👑`;
  
  const embed = new EmbedBuilder()
    .setColor(CONFIG.THEME.GOLD)
    .setAuthor({ 
        name: `🏆 VYRN ACTIVITY SYSTEM`, 
        iconURL: member.guild.iconURL({ dynamic: true }) 
    })
    .setTitle(`✨ LEVEL UP!`)
    .setDescription(
      `**Congratulations** ${member}!\n` +
      `You just advanced to **Level ${newLevel}**!\n\n` +
      `**Current Clan Rank:** ${rank.emoji} \`${rank.name}\``
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `Keep grinding harder • ${nextRankText}` })
    .setTimestamp();

  channel.send({ content: `🎊 **GG** ${member}!`, embeds: [embed] }).catch(() => {});
}

// ====================== INIT & EXPORTS ======================
function init() {
  loadAll();
  setInterval(saveAll, 30000); // Auto-save every 30 seconds
  console.log("👑 [VYRN] Clan Activity & Leveling System Loaded!");
}

module.exports = {
  init,
  addVoiceTime: (userId, sec) => { ensureUser(userId).voice.voice += sec; },
  getVoiceMinutes: (userId) => Math.floor((ensureUser(userId).voice.voice || 0) / 60),
  addActivityXP,
  getRank,
  getLevelData: (userId) => {
    const user = ensureUser(userId);
    const lvl = user.level.level || 0;
    return { 
      xp: user.level.xp || 0, 
      level: lvl, 
      nextXP: neededXP(lvl),
      rank: getRank(lvl)
    };
  }
};
