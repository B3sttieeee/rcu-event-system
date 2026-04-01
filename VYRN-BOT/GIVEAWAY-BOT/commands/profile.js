const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

// ===== PATH =====
const LEVEL_DB = "/data/levels.json";
const PROFILE_DB = "/data/profile.json";

// ===== INIT =====
function ensureFile(path, defaultData) {
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, JSON.stringify(defaultData, null, 2));
  }
}

// ===== LOAD =====
function loadLevels() {
  ensureFile(LEVEL_DB, { xp: {} });
  return JSON.parse(fs.readFileSync(LEVEL_DB));
}

function loadProfile() {
  ensureFile(PROFILE_DB, { users: {} });
  return JSON.parse(fs.readFileSync(PROFILE_DB));
}

// ===== XP =====
function neededXP(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// ===== RANK SYSTEM =====
function getRank(level) {
  if (level >= 75) return { name: "Legend", emoji: "<:LegeRank:1488756343190847538>" };
  if (level >= 60) return { name: "Ruby", emoji: "<:RubyRank:1488756400514404372>" };
  if (level >= 45) return { name: "Diamond", emoji: "<:DiaxRank:1488756482924089404>" };
  if (level >= 30) return { name: "Platinum", emoji: "<:PlatRank:1488756557863845958>" };
  if (level >= 15) return { name: "Gold", emoji: "<:GoldRank:1488756524854808686>" };
  if (level >= 5) return { name: "Bronze", emoji: "<:BronzeRank:1488756638285565962>" };
  return { name: "Iron", emoji: "<:Ironrank:1488756604277887039>" };
}

// ===== STATUS =====
function getStatus(percent) {
  if (percent >= 75) return "🟢 High";
  if (percent >= 40) return "🟡 Medium";
  return "🔴 Low";
}

// ===== FORMAT =====
function formatNumber(num) {
  return num.toLocaleString("en-US");
}

// ===== COMMAND =====
module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("📊 Show your profile"),

  async execute(interaction) {
    const levels = loadLevels();
    const profile = loadProfile();

    const lvlData = levels.xp[interaction.user.id] || { xp: 0, level: 0 };

    const user = profile.users?.[interaction.user.id] || {
      voice: 0,
      daily: { msgs: 0, vc: 0 }
    };

    const needed = neededXP(lvlData.level);
    const percent = needed > 0 ? Math.floor((lvlData.xp / needed) * 100) : 0;
    const left = Math.max(0, needed - lvlData.xp);

    const rank = getRank(lvlData.level);
    const status = getStatus(percent);

    const vcMinutes = Math.floor(user.voice / 60);

    // ===== EMBED =====
    const embed = new EmbedBuilder()
      .setColor("#0f172a")
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setThumbnail(interaction.user.displayAvatarURL({ size: 512 }))

      .setDescription(
`🏆 **Level ${lvlData.level}** • ${rank.emoji} ${rank.name}

<a:XP:1488763317857161377> **${formatNumber(lvlData.xp)} / ${formatNumber(needed)} XP** • \`${percent}%\`
<:Next:1488760924193161337> **${formatNumber(left)} XP to next level**

━━━━━━━━━━━━━━━━━━

<a:FIRE:1488765514875404449> **Activity**
<:STATS:1488765485129666683> Status: **${status}**
<a:TimeS:1488760889560797314> Voice: **${formatNumber(vcMinutes)} min**
<:Messages:1488763434966192242> Messages: **${formatNumber(user.daily.msgs)} / 50**
<:Zadania:1488763408026435594> Daily: **${formatNumber(Math.floor(user.daily.vc / 60))} / 30 min**

━━━━━━━━━━━━━━━━━━

<:PEPENOTE:1488765551038959677> *Stay active to gain more XP!*`
      )

      .setFooter({
        text: "VYRN System • Profile",
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
