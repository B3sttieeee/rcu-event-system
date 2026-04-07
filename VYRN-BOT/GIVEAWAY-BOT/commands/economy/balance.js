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
            value: "**Jak zdobywać monety?**",
            inline: false
          },
          {
            name: "📝 Wiadomości",
            value: "• **3** <:CASHH:1491180511308157041> co 12 sekund",
            inline: true
          },
          {
            name: "🎤 Voice Chat",
            value: "• **8** <:CASHH:1491180511308157041> za minutę",
            inline: true
          },
          {
            name: "🏆 Poziomy",
            value: "• **+50** <:CASHH:1491180511308157041> za wbity poziom",
            inline: true
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
