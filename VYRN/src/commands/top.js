// src/commands/top.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getTopUsers } = require("../systems/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("🏆 Top 10 najbogatszych graczy"),

  async execute(interaction) {
    const top = getTopUsers(10);

    const description = top.length 
      ? top.map((u, i) => `**${i+1}.** <@${u.userId}> — **${u.coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>`)
          .join("\n")
      : "Brak danych";

    const embed = new EmbedBuilder()
      .setColor("#0a0a0a")
      .setTitle("🏆 TOP 10 NAJBOGATSZYCH")
      .setDescription(description)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
