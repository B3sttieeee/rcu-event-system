const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { buildDailyEmbed } = require("../../utils/dailySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("🌙 Sprawdź postęp Daily Quest i odbierz nagrodę"),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const userId = interaction.user.id;

      // Zawsze ładujemy świeżą wersję embeda
      const { embed, components } = buildDailyEmbed(userId);

      await interaction.editReply({
        embeds: [embed],
        components: components || []
      });

      // Lepsze logowanie streak (bezpieczniejsze)
      const streakField = embed.data.fields?.find(f => f.name.includes("Streak") || f.name.includes("🔥"));
      const streakValue = streakField ? streakField.value.replace(/[^0-9]/g, '') : "?";

      console.log(`[DAILY CMD] Wyświetlono daily dla ${interaction.user.tag} | Streak: ${streakValue}`);

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
