const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { resumeGiveaway } = require("../../utils/giveawaySystem");   // ← POPRAWIONA ŚCIEŻKA

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gwresume")
    .setDescription("Wznowienie giveaway po restarcie bota")
    .addStringOption(option =>
      option
        .setName("message_id")
        .setDescription("ID wiadomości giveawayu")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const messageId = interaction.options.getString("message_id");

      const result = await resumeGiveaway(interaction.client, messageId);

      if (!result) {
        return interaction.editReply({
          content: "❌ Nie znaleziono giveawayu lub nie można go wznowić."
        });
      }

      return interaction.editReply({
        content: "✅ Giveaway został pomyślnie wznowiony!"
      });

    } catch (err) {
      console.error("❌ Błąd podczas wznawiania giveaway:", err);
      return interaction.editReply({
        content: "❌ Wystąpił błąd podczas wznawiania giveawayu."
      });
    }
  }
};
