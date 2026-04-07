const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { buyBoost } = require("../../utils/boostSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Kup boost XP")
    .addIntegerOption(option =>
      option.setName("id")
        .setDescription("ID boostu z /shop (1-4)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(4)
    ),

  async execute(interaction) {
    const boostId = interaction.options.getInteger("id");
    const result = await buyBoost(interaction.member, boostId);

    if (!result.success) {
      return interaction.reply({ 
        content: result.message, 
        ephemeral: true 
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x00ff88)
      .setTitle("✅ Boost zakupiony!")
      .setDescription(`**${result.boost.name}** na **${Math.floor(result.boost.duration / 60000)} minut**`)
      .setFooter({ text: "Grinduj szybciej! 🔥" });

    await interaction.reply({ embeds: [embed] });
  },
};
