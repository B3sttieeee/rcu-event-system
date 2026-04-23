// src/commands/giveaway.js
const {
  SlashCommandBuilder,
  MessageFlags
} = require("discord.js");

const { createGiveaway } = require("../systems/giveaway");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("🎉 Tworzy nowy giveaway")
    .setDefaultMemberPermissions(8) // Administrator
    .addStringOption(option =>
      option
        .setName("prize")
        .setDescription("Nagroda w giveawayu")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("time")
        .setDescription("Czas trwania (np. 1h, 30m, 2d)")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("winners")
        .setDescription("Liczba zwycięzców")
        .setMinValue(1)
        .setMaxValue(20)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("description")
        .setDescription("Dodatkowy opis giveawayu")
        .setRequired(false)
    )
    .addAttachmentOption(option =>           // <-- Zmienione na AttachmentOption
      option
        .setName("image")
        .setDescription("Obrazek do embedu giveawayu")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });   // <-- Poprawione

    try {
      const prize = interaction.options.getString("prize");
      const time = interaction.options.getString("time");
      const winners = interaction.options.getInteger("winners");
      const description = interaction.options.getString("description");
      const imageAttachment = interaction.options.getAttachment("image"); // <-- Attachment

      const options = {
        prize,
        time,
        winners,
        description,
        image: imageAttachment ? imageAttachment.url : null   // Pobieramy URL z attachment
      };

      await createGiveaway(interaction, options);

    } catch (error) {
      console.error("[GIVEAWAY COMMAND ERROR]", error);
      await interaction.editReply({
        content: "❌ Wystąpił błąd podczas tworzenia giveawayu.",
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
