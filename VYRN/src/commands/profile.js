// src/commands/profile.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

// Importy z systemów
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

      // Zawsze świeże dane
      const voiceMin = activity.getVoiceMinutes(userId);
      const coins = getCoins(userId);                    // zawsze aktualne
      const boost = getCurrentBoost(userId) || 1;

      // Level data z activity
      const levelData = activity.getLevelData ? activity.getLevelData(userId) : { xp: 0, level: 0 };
      const nextXP = activity.neededXP ? activity.neededXP(levelData.level) : 100;
      const progress = nextXP > 0 
        ? Math.min(100, Math.floor((levelData.xp / nextXP) * 100)) 
        : 0;

      const rank = activity.getRank ? activity.getRank(levelData.level) : { name: "Iron", emoji: "⚔️" };

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
      console.error("[PROFILE ERROR]", err);
      await interaction.editReply({
        content: "❌ Błąd podczas ładowania profilu.",
        ephemeral: true
      });
    }
  }
};
