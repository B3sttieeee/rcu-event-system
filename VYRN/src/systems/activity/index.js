// src/systems/activity/index.js
const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");
const economy = require("../economy");

const DATA_DIR = process.env.DATA_DIR || "/data";
const PROFILE_PATH = path.join(DATA_DIR, "profile.json");
const LEVELS_PATH = path.join(DATA_DIR, "levels.json");

// ====================== KONFIGURACJA NAGRÓD (ID ROLEK) ======================
// Wklej tutaj ID rolek ze swojego serwera, aby bot faktycznie je nadawał!
const RANK_ROLES = {
  75: "1476000992351879229",
  60: "1476000991823532032",
  45: "1476000991206707221",
  30: "1476000459595448442",
  15: "1476000995501670534",
  5:  "1476000458987278397",
};

let profileDB = { users: {} };
let levelsDB = { users: {} };

function loadAll() {
  try {
    if (fs.existsSync(PROFILE_PATH)) profileDB = JSON.parse(fs.readFileSync(PROFILE_PATH, "utf8"));
    if (fs.existsSync(LEVELS_PATH)) levelsDB = JSON.parse(fs.readFileSync(LEVELS_PATH, "utf8"));
    if (!profileDB.users) profileDB.users = {};
    if (!levelsDB.users) levelsDB.users = {};
  } catch (e) { console.error("[ACTIVITY] LOAD ERROR", e.message); }
}

function saveAll() {
  try {
    fs.writeFileSync(PROFILE_PATH, JSON.stringify(profileDB, null, 2));
    fs.writeFileSync(LEVELS_PATH, JSON.stringify(levelsDB, null, 2));
  } catch (e) { console.error("[ACTIVITY] SAVE ERROR", e.message); }
}

function ensureUser(userId) {
  if (!profileDB.users[userId]) profileDB.users[userId] = { voice: 0 };
  if (!levelsDB.users[userId]) levelsDB.users[userId] = { xp: 0, level: 0, totalXP: 0 };
  return { voice: profileDB.users[userId], level: levelsDB.users[userId] };
}

function neededXP(level) { return Math.floor(100 * Math.pow(level + 1, 1.5)); }

// ====================== SYSTEM AWANSU ======================
async function addActivityXP(member, xpAmount = 10, coinsAmount = 8) {
  const user = ensureUser(member.id);
  user.level.xp += xpAmount;
  user.level.totalXP += xpAmount;

  let leveledUp = false;
  while (user.level.xp >= neededXP(user.level.level)) {
    user.level.xp -= neededXP(user.level.level);
    user.level.level++;
    leveledUp = true;
  }

  if (coinsAmount > 0) economy.addCoins(member.id, coinsAmount);

  if (leveledUp) {
    // 1. Nadawanie roli na Discordzie (jeśli poziom odpowiada randze)
    await checkAndGiveRankRole(member, user.level.level);
    // 2. Wysyłanie estetycznej wiadomości
    await sendLevelUpMessage(member, user.level.level);
  }
}

async function checkAndGiveRankRole(member, level) {
  const roleId = RANK_ROLES[level];
  if (roleId) {
    const role = member.guild.roles.cache.get(roleId);
    if (role) await member.roles.add(role).catch(() => {});
  }
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

// ====================== ESTETYCZNE POWIADOMIENIE ======================
async function sendLevelUpMessage(member, newLevel) {
  const channel = member.guild.channels.cache.get("1475999590716018719");
  if (!channel) return;

  const rank = getRank(newLevel);
  
  const embed = new EmbedBuilder()
    .setColor("#0a0a0a") // Black Edition
    .setAuthor({ 
        name: `VYRN ACTIVITY SYSTEM`, 
        iconURL: member.guild.iconURL({ dynamic: true }) 
    })
    .setTitle(`✨ AWANS NA NOWY POZIOM!`)
    .setDescription(
      `> **Gratulacje** ${member}!\n` +
      `> Wbiłeś właśnie **${newLevel} poziom** aktywności!\n` +
      `> \n` +
      `> **Ranga:** ${rank.emoji} \`${rank.name}\`\n` +
      `> **Nagroda:** \`+8\` <:CASHH:1491180511308157041>`
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `Keep grinding harder • VYRN CLAN` })
    .setTimestamp();

  channel.send({ content: `🎊 Brawo ${member}!`, embeds: [embed] }).catch(() => {});
}

function init() {
  loadAll();
  setInterval(saveAll, 30000);
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
    return { xp: user.level.xp || 0, level: lvl, nextXP: neededXP(lvl) };
  }
};
