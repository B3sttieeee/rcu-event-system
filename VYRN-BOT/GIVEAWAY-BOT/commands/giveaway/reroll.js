const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

const { reroll } = require("../../utils/giveawaySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reroll")
    .setDescription("🎉 Losuje nowych zwycięzców z zakończonego giveawayu")
    .addStringOption(option =>
      option
        .setName("message_id")
        .setDescription("ID wiadomości giveawayu (PPM → Copy Message ID)")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("winners")
        .setDescription("Ile osób ma być wylosowanych ponownie? (domyślnie oryginalna liczba)")
        .setMinValue(1)
        .setMaxValue(15)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const messageId = interaction.options.getString("message_id").trim();
      const rerollWinners = interaction.options.getInteger("winners");

      // Walidacja ID wiadomości
      if (!/^\d{17,20}$/.test(messageId)) {
        return interaction.editReply({
          content: "❌ **Nieprawidłowe ID wiadomości!**\nUżyj prawego przycisku na wiadomości giveawayu → **Copy Message ID**."
        });
      }

      console.log(`[REROLL] ${interaction.user.tag} | ID: ${messageId} | Winners: ${rerollWinners || "domyślna"}`);

      const result = await reroll(interaction.client, messageId, rerollWinners);

      if (result.startsWith("❌")) {
        return interaction.editReply({ content: result });
      }

      // Sukces - ładny embed
      const successEmbed = new EmbedBuilder()
        .setColor("#22c55e")
        .setTitle("🎉 Reroll Giveaway")
        .setDescription(result)
        .addFields(
          { name: "📨 ID Wiadomości", value: `\`${messageId}\``, inline: true },
          { name: "👤 Wykonano przez", value: `${interaction.user}`, inline: true },
          { name: "🔄 Liczba zwycięzców", value: `\`${rerollWinners || "oryginalna"}\``, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });
      console.log(`[REROLL SUCCESS] Ukończono dla ${messageId}`);

    } catch (err) {
      console.error("❌ Błąd w komendzie /reroll:", err);
      await interaction.editReply({
        content: "❌ Wystąpił nieoczekiwany błąd podczas rerolla."
      }).catch(() => {});
    }
  }
};
