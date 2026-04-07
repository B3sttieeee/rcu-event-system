const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { buyBoost } = require("../../utils/boostSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Kup boost XP z sklepu")
    .addIntegerOption(option =>
      option
        .setName("id")
        .setDescription("ID boostu z /shop (1-4)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(4)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const boostId = interaction.options.getInteger("id");
      const result = await buyBoost(interaction.member, boostId);

      if (!result.success) {
        return interaction.editReply({
          content: result.message || "❌ Nie udało się kupić boostu.",
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x00ff88)
        .setTitle("✅ Boost zakupiony pomyślnie!")
        .setDescription(
          `**${result.boost.name}**\n` +
          `Czas trwania: **${Math.floor(result.boost.duration / 60000)} minut**\n` +
          `Multiplikator: **${result.boost.multiplier}x XP**`
        )
        .setFooter({ text: "Grinduj szybciej! 🔥" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("❌ Błąd w /buy:", err);
      await interaction.editReply({
        content: "❌ Wystąpił niespodziewany błąd podczas kupowania boostu.",
        ephemeral: true
      });
    }
  },
};
