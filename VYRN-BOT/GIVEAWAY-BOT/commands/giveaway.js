const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { createGiveaway } = require("../utils/giveawaySystem");

function isValidTime(time) {
  return /^[0-9]+[smhd]$/.test(time);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Create giveaway")

    .addStringOption(opt =>
      opt.setName("prize")
        .setDescription("Prize")
        .setRequired(true)
    )

    .addIntegerOption(opt =>
      opt.setName("winners")
        .setDescription("Number of winners")
        .setRequired(true)
    )

    .addStringOption(opt =>
      opt.setName("time")
        .setDescription("Time (10s, 5m, 1h, 1d)")
        .setRequired(true)
    )

    .addAttachmentOption(opt =>
      opt.setName("image")
        .setDescription("Upload image (optional)")
        .setRequired(false)
    )

    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {

    try {

      // 🔥 defer NA START
      await interaction.deferReply({ flags: 64 }); // zamiast ephemeral

      const prize = interaction.options.getString("prize");
      const winners = interaction.options.getInteger("winners");
      const time = interaction.options.getString("time");
      const attachment = interaction.options.getAttachment("image");

      if (!isValidTime(time)) {
        return interaction.editReply({
          content: "❌ Zły format czasu (np: 10s, 5m, 1h, 1d)"
        });
      }

      if (winners <= 0 || winners > 20) {
        return interaction.editReply({
          content: "❌ Winners musi być między 1 a 20"
        });
      }

      const image = attachment ? attachment.url : null;

      await createGiveaway(interaction, {
        prize,
        winners,
        time,
        image
      });

      return interaction.editReply({
        content: "🎉 Giveaway created!"
      });

    } catch (err) {
      console.log("❌ GIVEAWAY ERROR:", err);

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({
          content: "❌ Error creating giveaway"
        });
      } else {
        return interaction.reply({
          content: "❌ Error creating giveaway",
          flags: 64
        });
      }
    }
  }
};
