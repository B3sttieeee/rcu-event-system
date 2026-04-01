const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const LEVEL_DB = "/data/levels.json";
const PROFILE_DB = "/data/profile.json";

// ===== LOAD =====
function loadLevels() {
  if (!fs.existsSync(LEVEL_DB)) {
    fs.writeFileSync(LEVEL_DB, JSON.stringify({ xp: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(LEVEL_DB));
}

function loadProfile() {
  if (!fs.existsSync(PROFILE_DB)) {
    fs.writeFileSync(PROFILE_DB, JSON.stringify({ users: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(PROFILE_DB));
}

// ===== XP =====
function neededXP(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// ===== RANK =====
function getRank(level) {
  if (level >= 75) return "<:LegeRank:1488756343190847538>";
  if (level >= 60) return "<:RubyRank:1488756400514404372>";
  if (level >= 45) return "<:DiaxRank:1488756482924089404>";
  if (level >= 30) return "<:PlatRank:1488756557863845958>";
  if (level >= 15) return "<:GoldRank:1488756524854808686>";
  if (level >= 5) return "<:BronzeRank:1488756638285565962>";
  return "<:Ironrank:1488756604277887039>";
}

// ===== PROGRESS =====
function getProgress(current, needed) {
  const percent = Math.floor((current / needed) * 100);
  return percent > 100 ? 100 : percent;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("🔥 Advanced profile"),

  async execute(interaction) {

    const levels = loadLevels();
    const profile = loadProfile();

    const lvlData = levels.xp[interaction.user.id] || { xp: 0, level: 0 };
    const user = profile.users?.[interaction.user.id] || {
      voice: 0,
      daily: { msgs: 0, vc: 0 }
    };

    const needed = neededXP(lvlData.level);
    const percent = getProgress(lvlData.xp, needed);
    const vcMinutes = Math.floor(user.voice / 60);
    const rank = getRank(lvlData.level);

    // ===== STATUS =====
    let status = "🔴 Low";
    if (percent >= 40) status = "🟡 Medium";
    if (percent >= 75) status = "🟢 High";

    const embed = new EmbedBuilder()
      .setColor("#0f172a")
      .setAuthor({
        name: `${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setThumbnail(interaction.user.displayAvatarURL({ size: 512 }))

      .setDescription(
`🏆 **Level ${lvlData.level}** ${rank}

<a:XP:1488763317857161377> \`${lvlData.xp} / ${needed}\` (**${percent}%**)
<:Next:1488760924193161337> \`${needed - lvlData.xp} XP to next level\`

<a:FIRE:1488765514875404449> **${status}** • <a:TimeS:1488760889560797314> \`${vcMinutes}m\` • <:Messages:1488763434966192242> \`${user.daily.msgs}/50\` • <:Zadania:1488763408026435594> \`${Math.floor(user.daily.vc / 60)}/30\`

<:PEPENOTE:1488765551038959677> *Stay active to gain more XP!*`
      )

      .setFooter({
        text: "VYRN System",
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
