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

// ===== RANK =====
function getRank(level) {
  if (level >= 75) return { name: "Legend", emoji: "<:LegeRank:1488756343190847538>" };
  if (level >= 60) return { name: "Ruby", emoji: "<:RubyRank:1488756400514404372>" };
  if (level >= 45) return { name: "Diamond", emoji: "<:DiaxRank:1488756482924089404>" };
  if (level >= 30) return { name: "Platinum", emoji: "<:PlatRank:1488756557863845958>" };
  if (level >= 15) return { name: "Gold", emoji: "<:GoldRank:1488756524854808686>" };
  if (level >= 5) return { name: "Bronze", emoji: "<:BronzeRank:1488756638285565962>" };
  return { name: "Iron", emoji: "<:Ironrank:1488756604277887039>" };
}

// ===== FORMAT =====
function formatNumber(num) {
  return num.toLocaleString("en-US");
}

// ===== BAR =====
function progressBar(percent) {
  const filled = Math.round(percent / 10);
  return "▰".repeat(filled) + "▱".repeat(10 - filled);
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

    const vcMinutes = Math.floor((user.voice || 0) / 60);
    const dailyVc = Math.floor((user.daily?.vc || 0) / 60);

    const embed = new EmbedBuilder()
      .setColor("#0f172a")
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL()
      })

      .setDescription(
`${rank.emoji} **Level ${lvlData.level} • ${rank.name}**

<a:XP:1488763317857161377> ${formatNumber(lvlData.xp)} / ${formatNumber(needed)} XP  
${progressBar(percent)} \`${percent}%\`

<:Next:1488760924193161337> ${formatNumber(left)} XP to next level

<a:TimeS:1488760889560797314> Voice: **${vcMinutes} min**  
<:Messages:1488763434966192242> Messages: **${user.daily?.msgs || 0} / 50**  
<:Zadania:1488763408026435594> Daily VC: **${dailyVc} / 30 min**

<:PEPENOTE:1488765551038959677> *Stay active and keep grinding*`
      )

      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
