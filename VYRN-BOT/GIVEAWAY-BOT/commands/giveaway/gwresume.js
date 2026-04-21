const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const { resumeGiveaway } = require("../../utils/giveawaySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gwresume")
    .setDescription("Wznowienie timera giveaway po restarcie bota")
    .addStringOption(option =>
      option
        .setName("message_id")
        .setDescription("ID wiadomości giveawayu (Copy Message ID)")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const messageId = interaction.options.getString("message_id").trim();

      // Podstawowa walidacja ID
      if (!/^\d{17,20}$/.test(messageId)) {
        return interaction.editReply({
          content: "❌ Nieprawidłowe ID wiadomości.\nUżyj **Copy Message ID** z menu kontekstowego."
        });
      }

      const success = await resumeGiveaway(interaction.client, messageId);

      if (success) {
        await interaction.editReply({
          content: "✅ **Timer giveaway został pomyślnie wznowiony!**\nBot będzie teraz regularnie aktualizował czas."
        });
      } else {
        await interaction.editReply({
          content: "❌ Nie udało się wznowić giveawayu.\nSprawdź czy:\n• Giveaway istnieje\n• Nie jest już zakończony\n• Bot widzi kanał"
        });
      }

    } catch (err) {
      console.error("❌ Błąd w komendzie /gwresume:", err);
      await interaction.editReply({
        content: "❌ Wystąpił nieoczekiwany błąd podczas wznawiania giveawayu."
      }).catch(() => {});
    }
  }
};
