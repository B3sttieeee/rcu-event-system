const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getCoins } = require("../systems/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("🏆 Economy leaderboard (richest players)"),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // ======================
      // BUILD LEADERBOARD FROM RAW ECONOMY
      // ======================
      const coinsMap = global.__ECONOMY_MAP || null;

      if (!coinsMap || !(coinsMap instanceof Map)) {
        return interaction.editReply("❌ Leaderboard not ready (no data).");
      }

      const top = [...coinsMap.entries()]
        .sort((a, b) => (b[1] || 0) - (a[1] || 0))
        .slice(0, 10);

      const medals = ["🥇", "🥈", "🥉"];

      const description = top.length
        ? top.map(([userId, coins], i) => {
            const medal = medals[i] || `**#${i + 1}**`;
            return `${medal} <@${userId}> • **${Number(coins).toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>`;
          }).join("\n")
        : "```No data available```";

      const embed = new EmbedBuilder()
        .setColor("#0a0a0a")
        .setTitle("🏆 Economy Leaderboard")
        .setDescription(description)
        .setThumbnail(interaction.guild.iconURL() || null)
        .setFooter({ text: "VYRN Economy System" })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("[TOP ERROR]", err);
      return interaction.editReply("❌ Failed to load leaderboard.");
    }
  }
};
