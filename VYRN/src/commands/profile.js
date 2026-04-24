const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

// LEVEL SYSTEM
const levelSystem = require("../systems/level");
const neededXP = levelSystem.neededXP;
const getRank = levelSystem.getRank;
const loadLevelDB = levelSystem.loadDB || (() => ({ xp: {} }));

// SYSTEMS
const { getVoiceMinutes } = require("../systems/profile");
const { getCurrentBoost } = require("../systems/boost");
const { getCoins } = require("../systems/economy");

function progressBar(percent) {
  const size = 12;
  const filled = Math.round((percent / 100) * size);
  return "▰".repeat(filled) + "▱".repeat(size - filled);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("📊 View your VYRN profile"),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const userId = interaction.user.id;

      // ======================
      const db = loadLevelDB();
      const lvl = db?.xp?.[userId] || { xp: 0, level: 0 };

      const coins = getCoins(userId);
      const voice = getVoiceMinutes(userId);
      const boost = getCurrentBoost(userId) || 1;

      const rank = getRank(lvl.level);
      const nextXP = neededXP(lvl.level);

      const progress = nextXP
        ? Math.min(100, Math.floor((lvl.xp / nextXP) * 100))
        : 0;

      const xpLeft = Math.max(0, nextXP - lvl.xp);

      // ======================
      const embed = new EmbedBuilder()
        .setColor("#0a0a0a") // pure black aesthetic
        .setAuthor({
          name: `${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setThumbnail(interaction.user.displayAvatarURL())
        .setDescription(
          `> 🪪 **PROFILE OVERVIEW**\n` +
          `> ━━━━━━━━━━━━━━━━━━\n\n` +

          `🎖️ **Rank**\n` +
          `> ${rank.emoji} **${rank.name}**\n\n` +

          `📊 **Level Progress**\n` +
          `> Level: **${lvl.level}**\n` +
          `> XP: **${lvl.xp} / ${nextXP}**\n` +
          `> ${progressBar(progress)} **${progress}%**\n` +
          `> Next: **${xpLeft} XP**\n\n` +

          `💰 **Economy**\n` +
          `> Balance: **${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>\n\n` +

          `🎧 **Voice Activity**\n` +
          `> Total: **${voice} min**\n\n` +

          `🚀 **Boost Status**\n` +
          `> ${boost > 1 ? `Active **${boost}x XP Boost**` : "No active boost"}\n\n` +

          `> ━━━━━━━━━━━━━━━━━━`
        )
        .setFooter({
          text: "VYRN SYSTEM • black profile UI",
          iconURL: interaction.guild?.iconURL?.() || null
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("PROFILE ERROR:", err);

      return interaction.editReply({
        content: "❌ Failed to load profile."
      });
    }
  }
};
