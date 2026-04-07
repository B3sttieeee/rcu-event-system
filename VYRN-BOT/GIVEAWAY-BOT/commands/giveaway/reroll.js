const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

const { reroll } = require("../../utils/giveawaySystem");   // ← POPRAWIONA ŚCIEŻKA

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reroll")
    .setDescription("🎉 Losuje nowego zwycięzcę z istniejącego giveawayu")
    .addStringOption(option =>
      option
        .setName("message_id")
        .setDescription("ID wiadomości giveawayu (PPM na wiadomość → Copy ID)")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const messageId = interaction.options.getString("message_id").trim();

      // ====================== WALIDACJA ======================
      if (!/^\d{17,20}$/.test(messageId)) {
        return interaction.editReply({
          content: "❌ **Nieprawidłowe ID wiadomości!**\n\nID powinno składać się z 17–20 cyfr.\n\n**Jak znaleźć ID?**\n1. Włącz tryb deweloperski w Discordzie\n2. PPM na wiadomość giveawayu → `Copy Message ID`"
        });
      }

      // ====================== WYKONANIE REROLLA ======================
      const result = await reroll(interaction.client, messageId);

      // Jeśli wynik zawiera błąd
      if (!result || result.startsWith("❌")) {
        return interaction.editReply({
          content: result || "❌ Nie udało się wykonać rerolla. Giveaway mógł zostać usunięty lub jeszcze nie zakończył się."
        });
      }

      // ====================== SUKCES ======================
      const successEmbed = new EmbedBuilder()
        .setColor("#22c55e")
        .setTitle("🎉 Reroll Giveaway")
        .setDescription(result)   // result już zawiera "<@id> Nowy zwycięzca"
        .addFields(
          { name: "📨 ID Wiadomości", value: `\`${messageId}\``, inline: true },
          { name: "👤 Wykonano przez", value: `${interaction.user}`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });
      console.log(`🎉 Reroll wykonany przez ${interaction.user.tag} | Giveaway ID: ${messageId}`);

    } catch (err) {
      console.error("❌ Błąd podczas rerolla:", err);

      const errorMsg = "❌ Wystąpił nieoczekiwany błąd podczas wykonywania rerolla.";

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: errorMsg }).catch(() => {});
      } else {
        await interaction.reply({
          content: errorMsg,
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
};
