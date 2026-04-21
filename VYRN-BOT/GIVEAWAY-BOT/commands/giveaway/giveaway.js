const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

const { createGiveaway } = require("../../utils/giveawaySystem");

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
      option.setName("prize").setDescription("🎁 Nagroda").setRequired(true).setMinLength(3).setMaxLength(100)
    )
    .addIntegerOption(option =>
      option.setName("winners").setDescription("🏆 Liczba zwycięzców (1-20)").setMinValue(1).setMaxValue(20).setRequired(true)
    )
    .addStringOption(option =>
      option.setName("time").setDescription("⏳ Czas (np. 30m, 2h, 1d)").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("description").setDescription("📝 Opis giveawayu").setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName("image").setDescription("🖼 Obraz do embeda").setRequired(false)
    )
    .addRoleOption(option =>
      option.setName("required_role").setDescription("🔒 Wymagana rola do udziału").setRequired(false)
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

      if (!isValidTime(time)) {
        return interaction.editReply({
          content: "❌ Nieprawidłowy format czasu!\nPoprawne przykłady: `30m`, `2h`, `1d`, `45s`"
        });
      }

      const options = { prize, winners, time, description, image, requiredRole: requiredRole?.id || null };

      const messageId = await createGiveaway(interaction, options);

      const successEmbed = new EmbedBuilder()
        .setColor("#22c55e")
        .setTitle("✅ Giveaway utworzony pomyślnie!")
        .setDescription(`**Nagroda:** ${prize}`)
        .addFields(
          { name: "🏆 Zwycięzców", value: `\`${winners}\``, inline: true },
          { name: "⏳ Czas", value: `\`${time}\``, inline: true },
          ...(description ? [{ name: "📝 Opis", value: description, inline: false }] : []),
          ...(requiredRole ? [{ name: "🔒 Wymagana rola", value: `${requiredRole}`, inline: true }] : []),
          { name: "📨 ID Wiadomości", value: `\`${messageId}\``, inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });

    } catch (err) {
      console.error("❌ Błąd /giveaway:", err);
      await interaction.editReply({
        content: err.message.includes("czas") ? "❌ Nieprawidłowy format czasu." : "❌ Wystąpił błąd podczas tworzenia giveawayu."
      }).catch(() => {});
    }
  }
};
