const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { SHOP_BOOSTS } = require("../../utils/boostSystem");
const { getCoins } = require("../../utils/economySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("🛒 Sklep z boostami doświadczenia"),

  async execute(interaction) {
    try {
      const coins = getCoins(interaction.user.id);

      const embed = new EmbedBuilder()
        .setColor(0x00ff88)
        .setTitle("🛒 Sklep z Boostami XP")
        .setDescription(
          `**Twoje saldo:** ${coins.toLocaleString("pl-PL")} <:CASHH:1491180511308157041>\n\n` +
          `Wybierz boost wpisując komendę \`/buy <id>\``
        )
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ 
          text: "VYRN • Economy & Boost System",
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      SHOP_BOOSTS.forEach(boost => {
        const minutes = Math.floor(boost.duration / 60000);

        embed.addFields({
          name: `${boost.id}. ${boost.name}`,
          value: `**${boost.multiplier}x XP** • ${minutes} minut\n` +
                 `Cena: **${boost.price}** <:CASHH:1491180511308157041>`,
          inline: true
        });
      });

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("❌ Błąd w /shop:", err);
      await interaction.reply({
        content: "❌ Wystąpił błąd podczas otwierania sklepu.",
        ephemeral: true
      });
    }
  },
};
