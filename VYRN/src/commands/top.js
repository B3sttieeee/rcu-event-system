const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getTopUsers } = require("../systems/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("🏆 View richest players"),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ This command only works in a server.",
          ephemeral: true
        });
      }

      const top = getTopUsers?.(10) || [];

      const medals = ["🥇", "🥈", "🥉"];

      const description = top.length
        ? top
            .map((u, i) => {
              if (!u?.userId) return null;

              const coins = Number(u.coins || 0);

              const medal = medals[i] || `#${i + 1}`;

              return `> ${medal} <@${u.userId}> • **${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>`;
            })
            .filter(Boolean)
            .join("\n")
        : "> No data available";

      const embed = new EmbedBuilder()
        .setColor("#0b0b0f")
        .setTitle("🏆 Economy Leaderboard")
        .setDescription(
          `> **Top richest players on the server**\n\n` +
          `${description}`
        )
        .setThumbnail(interaction.guild.iconURL({ size: 256 }))
        .setFooter({
          text: "VYRN Economy System",
          iconURL: interaction.guild.iconURL()
        })
        .setTimestamp();

      return interaction.reply({
        embeds: [embed]
      });

    } catch (err) {
      console.error("TOP COMMAND ERROR:", err);

      if (!interaction.replied) {
        return interaction.reply({
          content: "❌ Error while loading leaderboard.",
          ephemeral: true
        });
      }
    }
  }
};
