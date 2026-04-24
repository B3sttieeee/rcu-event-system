// =====================================================
// TOP COMMAND - VYRN ECONOMY LEADERBOARD (FIXED)
// =====================================================

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getTopUsers } = require("../systems/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("🏆 Economy leaderboard (richest players)"),

  async execute(interaction) {
    try {
      const top = getTopUsers?.(10) || [];

      const medals = ["🥇", "🥈", "🥉"];

      if (!Array.isArray(top) || top.length === 0) {
        return interaction.reply({
          content: "❌ Brak danych w economy",
          ephemeral: true
        });
      }

      const description = top
        .map((u, i) => {
          if (!u?.userId) return null;

          const medal = medals[i] || `#${i + 1}`;
          const coins = Number(u.coins || 0);

          return `${medal} <@${u.userId}> • **${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>`;
        })
        .filter(Boolean)
        .join("\n");

      const embed = new EmbedBuilder()
        .setColor("#0b0b0f")
        .setTitle("🏆 Economy Leaderboard")
        .setDescription(`**Top richest players**\n\n${description}`)
        .setThumbnail(interaction.guild?.iconURL() || null)
        .setFooter({ text: "VYRN Economy System" })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error("[TOP COMMAND ERROR]", err);

      if (!interaction.replied) {
        return interaction.reply({
          content: "❌ TOP command crashed",
          ephemeral: true
        });
      }
    }
  }
};
