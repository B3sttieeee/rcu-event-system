// src/commands/top.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getTopUsers } = require("../systems/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("🏆 Top 10 najbogatszych graczy"),

  async execute(interaction) {
    try {
      const top = getTopUsers(10);

      if (top.length === 0) {
        return interaction.reply({
          content: "❌ Jeszcze nikt nie zdobył monet.",
          ephemeral: true
        });
      }

      const medals = ["🥇", "🥈", "🥉"];

      const description = top
        .map((entry, i) => {
          const medal = medals[i] || `**${i + 1}.**`;
          return `${medal} <@${entry.userId}> — **${entry.coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>`;
        })
        .join("\n");

      const embed = new EmbedBuilder()
        .setColor("#0b0b0f")
        .setTitle("🏆 TOP 10 NAJBOGATSZYCH")
        .setDescription(description)
        .setThumbnail(interaction.guild?.iconURL({ dynamic: true }) || null)
        .setFooter({ text: "VYRN Clan • Economy" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("[TOP COMMAND ERROR]", err);
      await interaction.reply({
        content: "❌ Wystąpił błąd podczas wyświetlania rankingu.",
        ephemeral: true
      });
    }
  }
};
