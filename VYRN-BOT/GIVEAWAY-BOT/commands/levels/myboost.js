const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getCurrentBoost, activeBoosts } = require("../../utils/boostSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("myboost")
    .setDescription("🔥 Pokazuje Twój aktualny aktywny boost XP"),

  async execute(interaction) {
    try {
      const multiplier = getCurrentBoost(interaction.user.id);
      const boost = activeBoosts.get(interaction.user.id);

      if (multiplier === 1 || !boost) {
        return interaction.reply({
          content: "❌ Aktualnie nie masz żadnego aktywnego boostu.",
          ephemeral: true
        });
      }

      const timeLeft = Math.ceil((boost.endTime - Date.now()) / 60000);
      const endDate = new Date(boost.endTime).toLocaleTimeString("pl-PL", { 
        hour: "2-digit", 
        minute: "2-digit" 
      });

      const embed = new EmbedBuilder()
        .setColor(0x00ff88)
        .setTitle("🔥 Twój Aktywny Boost")
        .setDescription(`**${boost.name}**`)
        .addFields(
          { name: "Multiplikator", value: `**${multiplier}x XP**`, inline: true },
          { name: "Pozostały czas", value: `**${timeLeft} minut**`, inline: true },
          { name: "Koniec o", value: `\`${endDate}\``, inline: true }
        )
        .setFooter({ text: "Grinduj szybciej! 🔥" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("❌ Błąd w /myboost:", err);
      await interaction.reply({
        content: "❌ Wystąpił błąd podczas sprawdzania boostu.",
        ephemeral: true
      });
    }
  },
};
