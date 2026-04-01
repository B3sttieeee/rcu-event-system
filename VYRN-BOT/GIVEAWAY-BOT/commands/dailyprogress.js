const { SlashCommandBuilder } = require("discord.js");
const { buildDailyEmbed } = require("../utils/dailySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dailyprogress")
    .setDescription("📊 Show daily progress"),

  async execute(interaction) {
    const { embed, row } = buildDailyEmbed(interaction.user.id);

    await interaction.reply({
      embeds: [embed],
      components: row ? [row] : []
    });
  }
};
