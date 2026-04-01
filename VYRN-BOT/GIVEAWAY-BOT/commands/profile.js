const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

// ===== PATH =====
const LEVEL_DB = "/data/levels.json";
const PROFILE_DB = "/data/profile.json";

// ===== EMOJI =====
const EMOJI = {
  xp: "<a:XP:1488763317857161377>",
  next: "<:Next:1488760924193161337>",
  fire: "<a:FIRE:1488765514875404449>",
  voice: "<a:TimeS:1488760889560797314>",
  msg: "<:Messages:1488763434966192242>",
  daily: "🎯",
  tip: "<:PEPENOTE:1488765551038959677>"
};

// ===== RANKS =====
function getRank(level) {
  if (level >= 75) return "<:LegeRank:1488756343190847538> Legendary";
  if (level >= 60) return "<:RubyRank:1488756400514404372> Ruby";
  if (level >= 45) return "<:DiaxRank:1488756482924089404> Diamond";
  if (level >= 30) return "<:PlatRank:1488756557863845958> Platinum";
  if (level >= 15) return "<:GoldRank:1488756524854808686> Gold";
  if (level >= 5) return "<:BronzeRank:1488756638285565962> Bronze";
  return "<:Ironrank:1488756604277887039> Iron";
}

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
    const percent = Math.floor((lvlData.xp / needed) * 100);

    const vcMinutes = Math.floor(user.voice / 60);

    // ===== STATUS =====
    let status = "🔴 Low";
    if (percent >= 40) status = "🟡 Medium";
    if (percent >= 75) status = "🟢 High";

    const nextXP = needed - lvlData.xp;

    // ===== EMBED =====
    const embed = new EmbedBuilder()
      .setColor("#0f172a")
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setThumbnail(interaction.user.displayAvatarURL({ size: 512 }))

      .setDescription(
`🏆 **Level ${lvlData.level}** • ${getRank(lvlData.level)}

${EMOJI.xp} **${lvlData.xp} / ${needed} XP • ${percent}%**
${EMOJI.next} **${nextXP} XP to next level**

──────────────

${EMOJI.fire} ${status} | ${EMOJI.voice} ${vcMinutes}m | ${EMOJI.msg} ${user.daily.msgs}/50 | ${EMOJI.daily} ${Math.floor(user.daily.vc / 60)}/30

${EMOJI.tip} *Be active to level up faster!*`
      )

      .setFooter({
        text: "VYRN System • Profile",
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
