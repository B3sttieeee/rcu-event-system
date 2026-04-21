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
        .setColor("#0a0a0a")                    // Ciemny motyw
        .setTitle("💰 Stan Konta")
        .setDescription(
          `**${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>\n\n` +
          `Twoje aktualne saldo monet w VYRN Clan.`
        )
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          {
            name: "━━━━━━━━━━━━━━━━━━",
            value: "**Jak zdobywać monety?**",
            inline: false
          },
          {
            name: "📝 Wiadomości",
            value: "• **3** monety co ~12 sekund",
            inline: true
          },
          {
            name: "🎤 Voice Chat",
            value: "• **8** monet za minutę aktywności",
            inline: true
          },
          {
            name: "🏆 Poziomy",
            value: "• **+50** monet za każdy wbity poziom",
            inline: true
          }
        )
        .setFooter({
          text: "VYRN CLAN • Economy System",
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error("❌ Błąd w komendzie /balance:", err);
      await interaction.reply({
        content: "❌ Wystąpił błąd podczas sprawdzania salda.",
        ephemeral: true
      });
    }
  },
};
