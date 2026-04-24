const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getTopUsers } = require("../systems/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("🏆 Economy leaderboard (richest players)"),

  async execute(interaction) {
    try {
      const top = typeof getTopUsers === "function" ? getTopUsers(10) : [];

      const medals = ["🥇", "🥈", "🥉"];

      const description = (Array.isArray(top) && top.length > 0)
        ? top.map((u, i) => {
            if (!u) return null;

            const medal = medals[i] || `**#${i + 1}**`;
            const userId = u.userId || u.id;
            const coins = Number(u.coins || 0);

            return `${medal} <@${userId}> • **${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>`;
          }).filter(Boolean).join("\n")
        : "```No data available```";

      const embed = new EmbedBuilder()
        .setColor("#0a0a0a") // BLACK MOTYW
        .setTitle("🏆 Economy Leaderboard")
        .setDescription(
          `> **Top richest players on the server**\n\n` +
          `${description}\n\n` +
          `━━━━━━━━━━━━━━━━━━`
        )
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }) || null)
        .setFooter({
          text: "VYRN ECONOMY • leaderboard system",
          iconURL: interaction.guild.iconURL() || null
        })
        .setTimestamp();

      return await interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error("[TOP COMMAND ERROR]", err);

      return interaction.reply({
        content: "❌ Error while loading leaderboard.",
        ephemeral: true
      });
    }
  }
};
