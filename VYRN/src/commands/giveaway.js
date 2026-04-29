// src/commands/giveaway.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const { createGiveaway } = require("../systems/giveaway");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("🎉 Create a high-prestige VYRN Clan giveaway")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // 1. Prize (Required)
    .addStringOption(option =>
      option
        .setName("prize")
        .setDescription("What is the prize? (e.g. 1,000,000 Coins / Rare Pet)")
        .setRequired(true)
    )
    // 2. Duration (Required)
    .addStringOption(option =>
      option
        .setName("time")
        .setDescription("Duration (e.g. 1h, 30m, 1d, 7d)")
        .setRequired(true)
    )
    // 3. Winners (Required)
    .addIntegerOption(option =>
      option
        .setName("winners")
        .setDescription("Number of lucky winners")
        .setMinValue(1)
        .setMaxValue(50)
        .setRequired(true)
    )
    // 4. Channel (Optional) - NEW
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Where to start the giveaway? (Default: current channel)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    // 5. Requirements (Optional) - NEW
    .addRoleOption(option =>
      option
        .setName("requirement")
        .setDescription("Only members with this role can enter")
        .setRequired(false)
    )
    // 6. Description (Optional)
    .addStringOption(option =>
      option
        .setName("description")
        .setDescription("Additional info or rules for the giveaway")
        .setRequired(false)
    )
    // 7. Image (Optional)
    .addAttachmentOption(option =>
      option
        .setName("image")
        .setDescription("Promotional image for the giveaway embed")
        .setRequired(false)
    ),

  async execute(interaction) {
    // Używamy ephemeral reply, żeby nie śmiecić kanału podczas ustawiania
    await interaction.deferReply({ ephemeral: true });

    try {
      const prize = interaction.options.getString("prize");
      const time = interaction.options.getString("time");
      const winners = interaction.options.getInteger("winners");
      const channel = interaction.options.getChannel("channel") || interaction.channel;
      const requirement = interaction.options.getRole("requirement");
      const description = interaction.options.getString("description");
      const imageAttachment = interaction.options.getAttachment("image");

      const options = {
        prize,
        time,
        winners,
        channelId: channel.id,
        requirementId: requirement ? requirement.id : null,
        description: description || "No additional description provided.",
        image: imageAttachment ? imageAttachment.url : null
      };

      // Wywołanie systemu tworzenia giveawayu
      await createGiveaway(interaction, options);

      // Potwierdzenie dla administratora
      await interaction.editReply({
        content: `✅ **Success!** The giveaway for **${prize}** has been started in ${channel}.`
      });

    } catch (error) {
      console.error("🔥 [GIVEAWAY COMMAND ERROR]", error);
      await interaction.editReply({
        content: "❌ **Error:** Failed to initialize the giveaway system. Check console logs."
      });
    }
  }
};
