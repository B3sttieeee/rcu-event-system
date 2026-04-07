const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { buyBoost } = require("../../utils/boostSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Kup boost XP")
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
          content: result.message || "❌ Nie udało się zakupić boostu.",
          ephemeral: true
        });
      }

      const minutes = Math.floor(result.boost.duration / 60000);

      const embed = new EmbedBuilder()
        .setColor(0x00ff88)
        .setTitle("✅ Boost zakupiony pomyślnie!")
        .setDescription(`**${result.boost.name}**`)
        .addFields(
          { name: "Multiplikator", value: `**${result.boost.multiplier}x XP**`, inline: true },
          { name: "Czas trwania", value: `**${minutes} minut**`, inline: true },
          { name: "Zużyto", value: `**${result.boost.price}** 🪙`, inline: true }
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
