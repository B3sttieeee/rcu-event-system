const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("🏆 Economy leaderboard"),

  async execute(interaction) {
    try {
      if (!interaction?.guild) {
        return interaction.reply({
          content: "❌ This command only works in servers.",
          ephemeral: true
        });
      }

      // SAFE IMPORT (to jest KLUCZ FIXA)
      let getTopUsers;
      try {
        getTopUsers = require("../systems/economy")?.getTopUsers;
      } catch (e) {
        console.error("TOP IMPORT ERROR:", e);
        return interaction.reply({
          content: "❌ Economy system not loaded.",
          ephemeral: true
        });
      }

      const top = typeof getTopUsers === "function"
        ? getTopUsers(10)
        : [];

      const embed = new EmbedBuilder()
        .setColor("#0b0b0f")
        .setTitle("🏆 Economy Leaderboard")
        .setDescription(
          top.length
            ? top.map((u, i) => {
                if (!u) return null;

                const coins = Number(u.coins || 0);
                const userId = u.userId;

                const medal =
                  i === 0 ? "🥇" :
                  i === 1 ? "🥈" :
                  i === 2 ? "🥉" :
                  `#${i + 1}`;

                return `> ${medal} <@${userId}> — **${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>`;
              }).filter(Boolean).join("\n")
            : "> No data available"
        )
        .setThumbnail(interaction.guild.iconURL({ size: 256 }))
        .setFooter({ text: "VYRN Economy System" })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error("TOP COMMAND CRASH:", err);

      if (!interaction.replied) {
        return interaction.reply({
          content: "❌ Command error.",
          ephemeral: true
        });
      }
    }
  }
};
