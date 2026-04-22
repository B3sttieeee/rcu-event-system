const { SlashCommandBuilder } = require("discord.js");
const { buildDailyEmbed } = require("../../utils/dailySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("🎯 Sprawdź postęp i odbierz Daily Quest"),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const userId = interaction.user.id;
      const { embed, components } = buildDailyEmbed(userId);

      await interaction.editReply({
        embeds: [embed],
        components: components || []
      });

    } catch (err) {
      console.error("[DAILY CMD] Błąd:", err);
      await interaction.editReply({
        content: "❌ Wystąpił błąd podczas ładowania daily.",
        embeds: [],
        components: []
      }).catch(() => {});
    }
  }
};
