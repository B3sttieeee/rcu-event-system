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

    // 🔥 NOWE (OBRAZEK)
    .addAttachmentOption(opt =>
      opt.setName("image")
        .setDescription("Upload image (optional)")
        .setRequired(false)
    )

    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {

    await interaction.deferReply({ ephemeral: true });

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

    // 🔥 pobieranie URL obrazka
    const image = attachment ? attachment.url : null;

    const data = {
      prize,
      winners,
      time,
      image // 👈 dodajemy do systemu
    };

    try {
      await createGiveaway(interaction, data);

      await interaction.editReply({
        content: "🎉 Giveaway created!"
      });

    } catch (err) {
      console.log(err);

      await interaction.editReply({
        content: "❌ Error creating giveaway"
      });
    }
  }
};
