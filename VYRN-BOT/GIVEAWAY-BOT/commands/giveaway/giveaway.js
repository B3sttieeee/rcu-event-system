const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");
const { createGiveaway } = require("../../utils/giveawaysystem"); // ✅ Poprawiona ścieżka

// ====================== WALIDACJA ======================
function isValidTime(time) {
  return /^[0-9]+[smhd]$/.test(time.toLowerCase());
}

function validatePrize(prize) {
  if (prize.length < 3) return "❌ Nazwa nagrody jest za krótka (minimum 3 znaki).";
  if (prize.length > 100) return "❌ Nazwa nagrody jest za długa (maksymalnie 100 znaków).";
  return null;
}

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
        .setDescription("📝 Dodatkowy opis giveawayu (opcjonalny)")
        .setRequired(false)
    )
    .addAttachmentOption(option =>
      option
        .setName("image")
        .setDescription("🖼 Obrazek do giveawayu (opcjonalny)")
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
      
      // Pobierz dane z interakcji
      const prize = interaction.options.getString("prize").trim();
      const winners = interaction.options.getInteger("winners");
      const time = interaction.options.getString("time").trim().toLowerCase();
      const description = interaction.options.getString("description")?.trim() || null;
      const attachment = interaction.options.getAttachment("image");
      const requiredRole = interaction.options.getRole("required_role");
      
      // ====================== WALIDACJA ======================
      const prizeError = validatePrize(prize);
      if (prizeError) {
        return await interaction.editReply({ content: prizeError });
      }
      
      if (!isValidTime(time)) {
        return await interaction.editReply({
          content: "❌ **Nieprawidłowy format czasu!**\n\nPoprawne przykłady:\n`30s`, `15m`, `2h`, `1d`, `45m`"
        });
      }
      
      if (winners < 1 || winners > 20) {
        return await interaction.editReply({
          content: "❌ Liczba zwycięzców musi być między 1 a 20."
        });
      }
      
      // ====================== TWORZENIE GIVEAWAYU ======================
      const giveawayOptions = {
        prize,
        winners,
        time,
        description,
        image: attachment?.url || null,
        requiredRole: requiredRole?.id || null
      };
      
      await createGiveaway(interaction, giveawayOptions);
      
      // ====================== SUKCES ======================
      const successEmbed = new EmbedBuilder()
        .setColor("#22c55e")
        .setTitle("✅ Giveaway utworzony pomyślnie!")
        .setDescription(`**Nagroda:** ${prize}`)
        .addFields(
          { name: "🏆 Zwycięzców", value: `\`${winners}\``, inline: true },
          { name: "⏳ Czas trwania", value: `\`${time}\``, inline: true },
          ...(description ? [{ name: "📝 Opis", value: description, inline: false }] : []),
          ...(requiredRole ? [{ name: "🔒 Wymagana rola", value: `${requiredRole}`, inline: true }] : [])
        )
        .setTimestamp();
      
      await interaction.editReply({ embeds: [successEmbed] });
      console.log(`🎉 Giveaway utworzony przez ${interaction.user.tag} | Nagroda: ${prize}`);
    } catch (err) {
      console.error("❌ Błąd podczas tworzenia giveawayu:", err);
      const errorMessage = err.message.includes("Nie masz wystarczających uprawnień")
        ? "❌ Nie masz wymaganej roli do tworzenia giveawayów."
        : "❌ Wystąpił błąd podczas tworzenia giveawayu. Spróbuj ponownie.";
      
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: errorMessage }).catch(() => {});
      } else {
        await interaction.reply({
          content: errorMessage,
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
};
