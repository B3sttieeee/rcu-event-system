// src/commands/profile.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

// Import z Activity System
const activity = require("../systems/activity");
const { getCoins } = require("../systems/economy");
const { getCurrentBoost } = require("../systems/boost");

function createProgressBar(percent) {
  const size = 12;
  const filled = Math.round((percent / 100) * size);
  return "▰".repeat(filled) + "▱".repeat(size - filled);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("📊 Twój profil w VYRN"),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const userId = interaction.user.id;

      // Zawsze świeże dane z Activity System
      const voiceMin = typeof activity.getVoiceMinutes === "function" 
        ? activity.getVoiceMinutes(userId) 
        : 0;

      let levelData = { xp: 0, level: 0 };
      if (typeof activity.getLevelData === "function") {
        levelData = activity.getLevelData(userId);
      }

      const coins = getCoins(userId);
      const boost = getCurrentBoost(userId) || 1;

      // Bezpieczne obliczenie nextXP
      let nextXP = 100;
      if (typeof activity.neededXP === "function") {
        nextXP = activity.neededXP(levelData.level);
      }

      const progress = nextXP > 0 
        ? Math.min(100, Math.floor((levelData.xp / nextXP) * 100)) 
        : 0;

      const rank = typeof activity.getRank === "function" 
        ? activity.getRank(levelData.level) 
        : { name: "Iron", emoji: "⚔️" };

      const embed = new EmbedBuilder()
        .setColor("#0b0b0f")
        .setAuthor({
          name: `${interaction.user.username} • VYRN Profile`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `**${rank.emoji} ${rank.name}** — Level **${levelData.level}**\n\n` +
          `**Experience**\n` +
          `> \`${levelData.xp} / ${nextXP} XP\`\n` +
          `> ${createProgressBar(progress)} **${progress}%**\n\n` +
          `**Voice Activity**\n` +
          `> **${voiceMin}** minut\n\n` +
          `**Economy**\n` +
          `> **${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>\n\n` +
          `**Active Boost**\n` +
          `> ${boost > 1 ? `**${boost}x XP** 🚀` : "**Brak**"}`
        )
        .setFooter({
          text: "VYRN Clan • Activity System",
          iconURL: interaction.guild?.iconURL({ dynamic: true })
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("[PROFILE COMMAND ERROR]", err);
      await interaction.editReply({
        content: "❌ Wystąpił błąd podczas ładowania profilu.",
        ephemeral: true
      });
    }
  }
};
