// src/commands/reroll.js
const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { reroll } = require("../systems/giveaway");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reroll")
    .setDescription("🔄 Przeprowadza reroll giveawayu")
    .setDefaultMemberPermissions(8) // Administrator
    .addStringOption(option =>
      option
        .setName("message_id")
        .setDescription("ID wiadomości giveawayu, który chcesz rerollować")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const messageId = interaction.options.getString("message_id");

      // Wywołanie reroll z systemu giveaway
      await reroll(interaction, messageId);

    } catch (error) {
      console.error("[REROLL COMMAND ERROR]", error);
      await interaction.editReply({
        content: "❌ Wystąpił błąd podczas wykonywania rerollu.",
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
