const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { buildDailyEmbed } = require("../../utils/dailySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("🎯 Sprawdź postęp Daily Quest i odbierz nagrodę"),

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
