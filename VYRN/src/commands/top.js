const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getTopUsers } = require("../systems/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("🏆 View the richest players"),

  async execute(interaction) {
    const top = getTopUsers(10);

    const medals = ["🥇", "🥈", "🥉"];

    const description =
      top.length > 0
        ? top
            .map((u, i) => {
              const medal = medals[i] || `**#${i + 1}**`;
              return `${medal} <@${u.userId}> • **${u.coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>`;
            })
            .join("\n")
        : "```No data available```";

    const embed = new EmbedBuilder()
      .setColor("#0a0a0a") // pure black aesthetic
      .setTitle("🏆 Economy Leaderboard")
      .setDescription(
        `> **Top richest players on the server**\n\n` +
        description +
        `\n\n━━━━━━━━━━━━━━━━━━`
      )
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setFooter({
        text: "VYRN ECONOMY • competitive ranking system",
        iconURL: interaction.guild.iconURL()
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
