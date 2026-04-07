const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getCurrentBoost, activeBoosts } = require("../../utils/boostSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("myboost")
    .setDescription("Pokazuje Twój aktualny aktywny boost"),

  async execute(interaction) {
    const multiplier = getCurrentBoost(interaction.user.id);
    const boost = activeBoosts.get(interaction.user.id);

    if (multiplier === 1 || !boost) {
      return interaction.reply({
        content: "❌ Nie masz obecnie aktywnego boostu.",
        ephemeral: true
      });
    }

    const timeLeft = Math.ceil((boost.endTime - Date.now()) / 60000);

    const embed = new EmbedBuilder()
      .setColor(0x00ff88)
      .setTitle("🔥 Twój Aktywny Boost")
      .setDescription(`**${boost.name}**\nMultiplikator: **${multiplier}x XP**`)
      .addFields({
        name: "Czas pozostały",
        value: `**${timeLeft} minut**`,
      })
      .setFooter({ text: "Grinduj szybciej! 🔥" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
