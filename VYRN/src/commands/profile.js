const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const levelSystem = require("../systems/level");
const neededXP = levelSystem.neededXP;
const getRank = levelSystem.getRank;
const loadLevelDB = levelSystem.loadDB || (() => ({ xp: {} }));

const { getCoins } = require("../systems/economy");
const { getVoiceMinutes } = require("../systems/profile");
const { getCurrentBoost } = require("../systems/boost");

function bar(p) {
  return "▰".repeat(Math.round(p / 10)) + "▱".repeat(10 - Math.round(p / 10));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("📊 View your profile"),

  async execute(interaction) {
    await interaction.deferReply();

    const db = loadLevelDB();
    const u = db.xp[interaction.user.id] || { xp: 0, level: 0 };

    const coins = getCoins(interaction.user.id);
    const voice = getVoiceMinutes(interaction.user.id);
    const boost = getCurrentBoost(interaction.user.id) || 1;

    const rank = getRank(u.level);
    const next = neededXP(u.level);
    const percent = Math.min(100, Math.floor((u.xp / next) * 100));

    const embed = new EmbedBuilder()
      .setColor("#0b0b0f")
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(
        `${rank.emoji} ${rank.name} • Level ${u.level}\n\n` +

        `XP \`${u.xp}/${next}\` • ${percent}%\n` +
        `${bar(percent)}\n\n` +

        `Coins \`${coins.toLocaleString("en-US")}\`\n` +
        `Voice \`${voice} min\`\n` +
        `Boost \`${boost > 1 ? boost + "x" : "none"}\``
      )
      .setFooter({ text: "VYRN • profile system" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
