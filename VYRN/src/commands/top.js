const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("🏆 Economy leaderboard"),

  async execute(interaction) {
    try {
      const economy = require("../systems/economy");
      const getTopUsers = economy?.getTopUsers;

      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ This command works only in servers.",
          ephemeral: true
        });
      }

      if (typeof getTopUsers !== "function") {
        return interaction.reply({
          content: "❌ Leaderboard system not available.",
          ephemeral: true
        });
      }

      const top = getTopUsers(10) || [];

      const embed = new EmbedBuilder()
        .setColor("#0b0b0f")
        .setTitle("🏆 Economy Leaderboard")
        .setDescription(
          top.length
            ? top.map((u, i) => {
                const coins = Number(u?.coins || 0);

                const medal =
                  i === 0 ? "🥇" :
                  i === 1 ? "🥈" :
                  i === 2 ? "🥉" :
                  `#${i + 1}`;

                return `> ${medal} <@${u.userId}> — **${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>`;
              }).join("\n")
            : "> No data available"
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error("TOP ERROR:", err);

      return interaction.reply({
        content: "❌ Error loading leaderboard.",
        ephemeral: true
      });
    }
  }
};
