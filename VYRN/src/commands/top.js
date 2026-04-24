const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

let getTopUsers;

try {
  getTopUsers = require("../systems/economy")?.getTopUsers;
} catch (e) {
  console.error("TOP IMPORT ERROR:", e.message);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("🏆 View economy leaderboard"),

  execute: async (interaction) => {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ This command only works in servers.",
          ephemeral: true
        });
      }

      if (typeof getTopUsers !== "function") {
        return interaction.reply({
          content: "❌ Leaderboard system is currently unavailable.",
          ephemeral: true
        });
      }

      const top = getTopUsers(10) || [];

      const embed = new EmbedBuilder()
        .setColor("#0b0b0f")
        .setTitle("🏆 Economy Leaderboard")
        .setDescription(
          top.length
            ? top
                .map((u, i) => {
                  if (!u?.userId) return null;

                  const coins = Number(u.coins || 0);

                  const medal =
                    i === 0 ? "🥇" :
                    i === 1 ? "🥈" :
                    i === 2 ? "🥉" :
                    `#${i + 1}`;

                  return `> ${medal} <@${u.userId}> — **${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>`;
                })
                .filter(Boolean)
                .join("\n")
            : "> No data available yet"
        )
        .setThumbnail(interaction.guild.iconURL({ size: 256 }))
        .setFooter({ text: "VYRN Economy System" })
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
