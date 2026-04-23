// src/commands/giveaway.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const { createGiveaway } = require("../systems/giveaway");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("🎉 Tworzy nowy giveaway")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents) // tylko osoby z Manage Events
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
    .addStringOption(option =>
      option
        .setName("image")
        .setDescription("URL obrazka do embedu")
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: "Tej komendy można używać tylko na serwerze.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const prize = interaction.options.getString("prize");
      const time = interaction.options.getString("time");
      const winners = interaction.options.getInteger("winners");
      const description = interaction.options.getString("description");
      const image = interaction.options.getString("image");

      const options = {
        prize,
        time,
        winners,
        description,
        image
      };

      await createGiveaway(interaction, options);

    } catch (error) {
      console.error("[GIVEAWAY COMMAND ERROR]", error);
      await interaction.editReply({
        content: "❌ Wystąpił błąd podczas tworzenia giveawayu.",
        ephemeral: true
      });
    }
  }
};
