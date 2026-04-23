// src/commands/balance.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getCoins } = require("../systems/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("💰 Sprawdź ile masz monet"),

  async execute(interaction) {
    const coins = getCoins(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor("#0a0a0a")
      .setTitle(`${interaction.user.username} — Stan konta`)
      .setDescription(`**${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>`)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: "VYRN Clan • Economy" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
