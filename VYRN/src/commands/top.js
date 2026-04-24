const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getTopUsers } = require("../systems/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("🏆 View the richest players"),

  async execute(interaction) {
    try {
      const top = getTopUsers(10);

      const medals = ["🥇", "🥈", "🥉"];

      const description = top?.length
        ? top.map((u, i) => {
            const medal = medals[i] || `**#${i + 1}**`;

            return (
              `${medal} <@${u.userId}>` +
              ` • **${Number(u.coins || 0).toLocaleString("pl-PL")}**` +
              ` <:CASHH:1491180511308157041>`
            );
          }).join("\n")
        : "No data available.";

      const embed = new EmbedBuilder()
        .setColor("#0b0b0f")
        .setTitle("🏆 Economy Leaderboard")
        .setDescription(
          `**Top richest players on the server**\n\n` +
          description +
          `\n\n> Updated live ranking system`
        )
        .setThumbnail(interaction.guild?.iconURL({ dynamic: true }))
        .setFooter({
          text: "VYRN Economy • Leaderboard",
          iconURL: interaction.guild?.iconURL()
        })
        .setTimestamp();

      return await interaction.reply({
        embeds: [embed]
      });

    } catch (err) {
      console.error("[TOP COMMAND ERROR]", err);

      if (!interaction.replied) {
        return interaction.reply({
          content: "❌ Error while loading leaderboard.",
          ephemeral: true
        });
      }
    }
  }
};
