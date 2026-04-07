const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getCurrentBoost, activeBoosts } = require("../../utils/boostSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("myboost")
    .setDescription("Pokazuje Twój aktualny aktywny boost XP"),

  async execute(interaction) {
    const multiplier = getCurrentBoost(interaction.user.id);
    const boostData = activeBoosts.get(interaction.user.id);

    if (multiplier === 1 || !boostData) {
      return interaction.reply({
        content: "❌ Aktualnie nie masz żadnego aktywnego boostu.",
        ephemeral: true
      });
    }

    const timeLeft = Math.ceil((boostData.endTime - Date.now()) / 60000);

    const embed = new EmbedBuilder()
      .setColor(0x00ff88)
      .setTitle("🔥 Twój Aktywny Boost")
      .addFields(
        { name: "Boost", value: `**${boostData.name}**`, inline: true },
        { name: "Multiplikator", value: `**${multiplier}x XP**`, inline: true },
        { name: "Pozostały czas", value: `**${timeLeft} minut**`, inline: true }
      )
      .setFooter({ text: "VYRN • Boost System" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
