const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getCoins } = require("../systems/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("💰 Check your current balance"),

  async execute(interaction) {
    const coins = getCoins(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor("#0a0a0a")
      .setTitle("💰 Wallet Balance")
      .setDescription(
        `Hey **${interaction.user.username}**, here is your current balance:\n\n` +
        `💵 **${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>`
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setFooter({
        text: "VYRN Economy System",
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
