const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const { getCase } = require("../utils/moderation");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("case")
    .setDescription("Check case")
    .addIntegerOption(opt =>
      opt.setName("id").setDescription("Case ID").setRequired(true)
    ),

  async execute(interaction) {
    const id = interaction.options.getInteger("id");

    const c = getCase(id);

    if (!c) {
      return interaction.reply({
        content: "❌ Case not found",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor("#f59e0b")
      .setTitle(`🆔 Case #${c.id}`)
      .setDescription(
        `👤 <@${c.userId}>\n` +
        `👮 <@${c.moderatorId}>\n\n` +
        `📌 Type: **${c.type}**\n` +
        `📝 Reason: **${c.reason}**\n` +
        `⏱ Duration: **${c.duration || "—"}**`
      );

    interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
