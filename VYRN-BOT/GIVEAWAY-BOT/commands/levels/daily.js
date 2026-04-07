const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { buildDailyEmbed } = require("../../utils/dailySystem");
const { isDailyReady, claimDaily } = require("../../utils/profileSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Sprawdź lub odbierz swój daily"),

  async execute(interaction) {
    const ready = isDailyReady(interaction.user.id);

    if (!ready) {
      const { embed } = buildDailyEmbed(interaction.user.id);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Odbieranie daily
    const result = await claimDaily(interaction.user.id, interaction.member);

    if (!result.success) {
      return interaction.reply({ 
        content: "❌ Nie możesz jeszcze odebrać daily.", 
        ephemeral: true 
      });
    }

    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("🎁 Daily Odebrany!")
      .setDescription(
        `**Zdobyłeś:** \`${result.xp} XP\`\n` +
        `**Nowy streak:** 🔥 \`${result.streak}\` dni`
      )
      .setFooter({ text: "VYRN • Daily System" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
