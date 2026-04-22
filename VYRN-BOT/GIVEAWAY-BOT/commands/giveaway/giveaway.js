const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

const { createGiveaway } = require("../../utils/giveawaySystem");

// ====================== WALIDACJA ======================
function isValidTime(time) {
  return /^[0-9]+[smhd]$/.test(time.toLowerCase());
}

function validatePrize(prize) {
  if (prize.length < 3) return "❌ Nazwa nagrody jest za krótka (minimum 3 znaki).";
  if (prize.length > 100) return "❌ Nazwa nagrody jest za długa (maksymalnie 100 znaków).";
  return null;
}

function validateDescription(desc) {
  if (!desc) return null;
  if (desc.length > 500) return "❌ Opis giveawayu jest za długi (maksymalnie 500 znaków).";
  return null;
}

// ====================== KOMENDA ======================
module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("🎉 Tworzy profesjonalny giveaway")
    .addStringOption(option =>
      option
        .setName("prize")
        .setDescription("🎁 Nagroda w giveawayu")
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(100)
    )
    .addIntegerOption(option =>
      option
        .setName("winners")
        .setDescription("🏆 Liczba zwycięzców (1-20)")
        .setMinValue(1)
        .setMaxValue(20)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("time")
        .setDescription("⏳ Czas trwania (np. 30m, 2h, 1d, 45s)")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("description")
        .setDescription("📝 Dodatkowy opis giveawayu")
        .setRequired(false)
    )
    .addAttachmentOption(option =>
      option
        .setName("image")
        .setDescription("🖼 Obraz do embeda giveawayu")
        .setRequired(false)
    )
    .addRoleOption(option =>
      option
        .setName("required_role")
        .setDescription("🔒 Wymagana rola do udziału (opcjonalnie)")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const prize = interaction.options.getString("prize").trim();
      const winners = interaction.options.getInteger("winners");
      const time = interaction.options.getString("time").trim().toLowerCase();
      const description = interaction.options.getString("description")?.trim() || null;
      const image = interaction.options.getAttachment("image")?.url || null;
      const requiredRole = interaction.options.getRole("required_role");

      // Walidacja
      const prizeError = validatePrize(prize);
      if (prizeError) return interaction.editReply({ content: prizeError });

      const descError = validateDescription(description);
      if (descError) return interaction.editReply({ content: descError });

      if (!isValidTime(time)) {
        return interaction.editReply({
          content: "❌ Nieprawidłowy format czasu!\nPoprawne przykłady: `30m`, `2h`, `1d`, `45s`, `10m`"
        });
      }

      const options = {
        prize,
        winners,
        time,
        description,
        image,
        requiredRole: requiredRole?.id || null
      };

      // Tworzenie giveawayu
      const result = await createGiveaway(interaction, options);

      // Sukces
      const successEmbed = new EmbedBuilder()
        .setColor("#22c55e")
        .setTitle("✅ Giveaway utworzony pomyślnie!")
        .setDescription(`**Nagroda:** ${prize}`)
        .addFields(
          { name: "🏆 Zwycięzców", value: `\`${winners}\``, inline: true },
          { name: "⏳ Czas trwania", value: `\`${time}\``, inline: true },
          ...(description ? [{ name: "📝 Opis", value: description, inline: false }] : []),
          ...(requiredRole ? [{ name: "🔒 Wymagana rola", value: `${requiredRole}`, inline: true }] : []),
          { name: "📨 ID Wiadomości", value: `\`${result.messageId || "—"}\``, inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });

    } catch (err) {
      console.error("❌ Błąd podczas tworzenia giveawayu:", err);

      const errorMsg = err.message.includes("czas") || err.message.includes("format")
        ? "❌ Nieprawidłowy format czasu! Użyj np. `30m`, `2h`, `1d`."
        : "❌ Wystąpił nieoczekiwany błąd podczas tworzenia giveawayu.";

      await interaction.editReply({ content: errorMsg }).catch(() => {});
    }
  }
};
