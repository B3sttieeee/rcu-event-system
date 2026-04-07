const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getCoins } = require("../../utils/economySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Pokazuje ile masz monet"),

  async execute(interaction) {
    const coins = getCoins(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0x00ff88)
      .setTitle("💰 Twoje Monety")
      .setDescription(`**${coins}** 🪙`)
      .setFooter({ text: "VYRN • Economy" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
