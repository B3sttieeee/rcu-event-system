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
          content: "❌ This command only works in servers.",
          ephemeral: true
        });
      }

      const top = getTopUsers?.(10) || [];

      const embed = new EmbedBuilder()
        .setColor("#0b0b0f")
        .setTitle("🏆 Economy Leaderboard")
        .setDescription(
          top.length
            ? top
                .map((u, i) => {
                  const coins = Number(u?.coins || 0);
                  const userId = u?.userId;

                  if (!userId) return null;

                  const medal =
                    i === 0 ? "🥇" :
                    i === 1 ? "🥈" :
                    i === 2 ? "🥉" :
                    `#${i + 1}`;

                  return `> ${medal} <@${userId}> — **${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>`;
                })
                .filter(Boolean)
                .join("\n")
            : "> No data available"
        )
        .setThumbnail(interaction.guild.iconURL({ size: 256 }))
        .setFooter({
          text: "VYRN Economy System"
        })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error("TOP COMMAND ERROR:", err);

      if (!interaction.replied) {
        return interaction.reply({
          content: "❌ Failed to load leaderboard.",
          ephemeral: true
        });
      }
    }
  }
};
