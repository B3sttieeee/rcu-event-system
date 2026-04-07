const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getCoins } = require("../../../utils/economySystem");   // ← POPRAWIONA ŚCIEŻKA

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("💰 Pokazuje ile masz monet"),

  async execute(interaction) {
    try {
      const coins = getCoins(interaction.user.id);

      const embed = new EmbedBuilder()
        .setColor(0x00ff88)
        .setTitle("💰 Twoje Monety")
        .setDescription(`**${coins.toLocaleString("pl-PL")}** 🪙`)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "VYRN • Economy System" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("❌ Błąd w /balance:", err);
      await interaction.reply({
        content: "❌ Wystąpił błąd podczas sprawdzania stanu konta.",
        ephemeral: true
      });
    }
  },
};
