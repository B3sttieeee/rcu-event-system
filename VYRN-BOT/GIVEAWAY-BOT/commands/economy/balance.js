const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getCoins } = require("../../utils/economySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("💰 Sprawdź stan swojego konta"),

  async execute(interaction) {
    try {
      const coins = getCoins(interaction.user.id);

      const embed = new EmbedBuilder()
        .setColor(0x00ff88)
        .setTitle("💰 Stan Konta")
        .setDescription(`**${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>`)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          {
            name: "━━━━━━━━━━━━━━━━━━━━━━",
            value: "Użyj `/shop`, aby przejrzeć dostępne boosty",
            inline: false
          }
        )
        .setFooter({ 
          text: "VYRN • Economy System",
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("❌ Błąd w /balance:", err);
      await interaction.reply({
        content: "❌ Wystąpił błąd podczas sprawdzania salda.",
        ephemeral: true
      });
    }
  },
};
