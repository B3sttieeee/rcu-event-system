const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");
const { reroll } = require("../../utils/giveawaySystem"); // Poprawiona ścieżka

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reroll")
    .setDescription("🎉 Losuje nowego zwycięzcę z istniejącego giveawayu")
    .addStringOption(option =>
      option
        .setName("message_id")
        .setDescription("ID wiadomości giveawayu (PPM → Copy Message ID)")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const messageId = interaction.options.getString("message_id").trim();
      
      // Walidacja ID
      if (!/^\d{17,20}$/.test(messageId)) {
        return interaction.editReply({
          content: "❌ **Nieprawidłowe ID wiadomości!**\n\nUpewnij się, że skopiowałeś dokładnie `Copy Message ID`."
        });
      }
      
      console.log(`[REROLL CMD] Użytkownik ${interaction.user.tag} próbuje reroll dla ID: ${messageId}`);
      const result = await reroll(interaction.client, messageId);
      
      if (result.startsWith("❌")) {
        return interaction.editReply({ content: result });
      }
      
      // Sukces
      const successEmbed = new EmbedBuilder()
        .setColor("#22c55e")
        .setTitle("🎉 Reroll Giveaway")
        .setDescription(result)
        .addFields(
          { name: "📨 ID Wiadomości", value: `\`${messageId}\``, inline: true },
          { name: "👤 Wykonano przez", value: `${interaction.user}`, inline: true }
        )
        .setTimestamp();
      
      await interaction.editReply({ embeds: [successEmbed] });
      console.log(`[REROLL SUCCESS] Reroll wykonany dla ${messageId}`);
    } catch (err) {
      console.error("❌ Błąd w komendzie reroll:", err);
      await interaction.editReply({
        content: "❌ Wystąpił nieoczekiwany błąd podczas rerolla."
      }).catch(() => {});
    }
  }
};
