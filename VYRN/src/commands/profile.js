const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const activity = require("../systems/activity");
const economy = require("../systems/economy");
const boostSystem = require("../systems/boost"); // Zakładam, że tam też jest folder z index.js

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
    const userId = interaction.user.id;

    try {
      const voiceMin = activity.getVoiceMinutes(userId);
      const levelData = activity.getLevelData(userId);
      const coins = economy.getCoins(userId);
      const boost = boostSystem?.getCurrentBoost ? boostSystem.getCurrentBoost(userId) : 1;

      const progress = Math.min(100, Math.floor((levelData.xp / levelData.nextXP) * 100));
      const rank = activity.getRank(levelData.level);

      const embed = new EmbedBuilder()
        .setColor("#0a0a0a")
        .setAuthor({ name: `${interaction.user.username} • VYRN Profile`, iconURL: interaction.user.displayAvatarURL() })
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `**${rank.emoji} ${rank.name}** — Level **${levelData.level}**\n\n` +
          `**Experience**\n` +
          `> \`${levelData.xp} / ${levelData.nextXP} XP\`\n` +
          `> ${createProgressBar(progress)} **${progress}%**\n\n` +
          `**Voice Activity**\n` +
          `> **${voiceMin}** minut\n\n` +
          `**Economy**\n` +
          `> **${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>\n\n` +
          `**Active Boost**\n` +
          `> ${boost > 1 ? `**${boost}x XP** 🚀` : "**Brak**"}`
        )
        .setFooter({ text: "VYRN Clan • Activity System" }).setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("[PROFILE ERROR]", err);
      await interaction.editReply({ content: "❌ Błąd ładowania profilu.", ephemeral: true });
    }
  }
};
